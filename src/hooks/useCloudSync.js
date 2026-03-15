import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SYNC_REQUEST_TIMEOUT_MS = 12000;
const AUTO_RETRY_BASE_MS = 10000;
const AUTO_RETRY_MAX_MS = 60000;

const withTimeout = (promise, timeoutMs, actionLabel) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${actionLabel} timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

export const useCloudSync = (user, data, setters, showToast) => {
    const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, synced, error, waiting
    const [hasLoadedCloud, setHasLoadedCloud] = useState(false);
    const [syncLog, setSyncLog] = useState([]);
    const [retryNonce, setRetryNonce] = useState(0);
    const [lastSync, setLastSync] = useState(() => {
        try {
            const saved = localStorage.getItem("billit_lastSync");
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });

    const skipCloudSave = useRef(false);
    const loadedUidRef = useRef(null);
    const retryTimeoutRef = useRef(null);
    const retryAttemptRef = useRef(0);

    const addLog = (message) => setSyncLog(prev => [{ timestamp: Date.now(), message }, ...prev].slice(0, 10));

    const clearRetryTimer = () => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
    };

    const resetRetryState = () => {
        retryAttemptRef.current = 0;
        clearRetryTimer();
    };

    const scheduleRetry = (label, retryAction) => {
        clearRetryTimer();
        const nextAttempt = retryAttemptRef.current + 1;
        retryAttemptRef.current = nextAttempt;
        const delay = Math.min(AUTO_RETRY_BASE_MS * (2 ** (nextAttempt - 1)), AUTO_RETRY_MAX_MS);
        addLog(`${label} failed. Auto-retry in ${Math.round(delay / 1000)}s (attempt ${nextAttempt}).`);

        retryTimeoutRef.current = setTimeout(() => {
            setSyncStatus("waiting");
            retryAction();
        }, delay);
    };

    const fetchFromCloud = async (u) => {
        if (!u) return;
        clearRetryTimer();
        setSyncStatus("syncing");
        addLog("Initiating fetch from cloud...");
        if (!db) {
            console.error("Cloud fetch aborted: db is null");
            addLog("Sync Error: Firestore database not initialized.");
            setSyncStatus("error");
            return;
        }

        console.log(`Fetching data for: ${u.email} (${u.uid})`);
        addLog(`Fetching data for: ${u.email}`);
        const userDocRef = doc(db, "users", u.uid);
        try {
            console.log("Requesting document from Firestore...");
            const docSnap = await withTimeout(
                getDoc(userDocRef),
                SYNC_REQUEST_TIMEOUT_MS,
                "Cloud fetch"
            );
            console.log("Firestore response received. Exists:", docSnap.exists());
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                console.log("Cloud Data Keys:", Object.keys(cloudData));
                addLog(`Cloud doc found! Invoices: ${cloudData.invoices?.length || 0}`);

                // Set guard BEFORE updating states
                skipCloudSave.current = true;

                if (cloudData.invoices && setters.setInvoices) setters.setInvoices(cloudData.invoices);
                if (cloudData.clients && setters.setClients) setters.setClients(cloudData.clients);
                if (cloudData.products && setters.setProducts) setters.setProducts(cloudData.products);
                if (cloudData.seller && setters.setSeller) setters.setSeller(prev => ({ ...prev, ...cloudData.seller }));
                if (cloudData.taxRates && setters.setTaxRates) setters.setTaxRates(cloudData.taxRates);
                if (cloudData.currency && setters.setCurrency) setters.setCurrency(cloudData.currency);
                if (cloudData.inventoryTitle && setters.setInventoryTitle) setters.setInventoryTitle(cloudData.inventoryTitle);
                if (typeof cloudData.defaultNote === "string" && setters.setDefaultNote) setters.setDefaultNote(cloudData.defaultNote);
                // Keep local "last sync" meaningful even when legacy cloud docs don't have this field yet.
                const fetchSyncTime = cloudData.lastSync || new Date().toLocaleTimeString();
                setLastSync(fetchSyncTime);
                localStorage.setItem("billit_lastSync", JSON.stringify(fetchSyncTime));

                setSyncStatus("synced");
                addLog("Data successfully merged from cloud.");
                resetRetryState();
            } else {
                console.warn("No document exists at path: users/" + u.uid);
                addLog("No cloud document found for this account.");
                setSyncStatus("idle");
                resetRetryState();
                // For new users, we also want to skip the immediate blank upload (Bug 6 fix)
                skipCloudSave.current = true;
            }
            setHasLoadedCloud(true);

            // Bug 2 fix: Reset the guard only AFTER all state updates have settled in the next tick
            setTimeout(() => {
                skipCloudSave.current = false;
                console.log("Cloud sync guard released.");
            }, 500); // 500ms safety margin to ensure all effects have run

        } catch (err) {
            console.error("Cloud fetch error detail:", err);
            addLog(`Fetch error: ${err.message}`);
            setSyncStatus("error");
            setHasLoadedCloud(true);
            skipCloudSave.current = false;
            scheduleRetry("Fetch", () => fetchFromCloud(u));
        }
    };

    // Initial fetch on login
    useEffect(() => {
        if (!user) return;

        if (loadedUidRef.current !== user.uid) {
            loadedUidRef.current = user.uid;
            setHasLoadedCloud(false);
            skipCloudSave.current = false;
        }

        if (user && !hasLoadedCloud) {
            fetchFromCloud(user);
        }
    }, [user, hasLoadedCloud]);

    // Combined Cloud Save Effect
    useEffect(() => {
        if (user && hasLoadedCloud) {
            if (skipCloudSave.current) {
                console.log("Sync guard active: skipping cloud save.");
                return;
            }

            setSyncStatus("waiting");
            const timeoutId = setTimeout(() => {
                // Bug 6 fix: Don't upload if it's a completely empty local state (prevent blanking cloud)
                if (!data.invoices?.length && !data.clients?.length && !data.products?.length) {
                    console.log("No meaningful local data to sync. Skipping.");
                    setSyncStatus("synced");
                    return;
                }

                if (!db) {
                    addLog("Sync Error: Firestore unavailable.");
                    setSyncStatus("error");
                    return;
                }

                setSyncStatus("syncing");
                addLog("Sending local updates to cloud...");
                const userDocRef = doc(db, "users", user.uid);

                // Payload includes lastSync, but since lastSync is NOT in the dependency array
                // of this effect, updating it inside .then() won't trigger a loop (Bug 3 fix)
                const now = new Date().toLocaleTimeString();
                const cloudPayload = { ...data, lastSync: now };

                withTimeout(
                    setDoc(userDocRef, cloudPayload, { merge: true }),
                    SYNC_REQUEST_TIMEOUT_MS,
                    "Cloud save"
                ).then(() => {
                    setLastSync(now);
                    setSyncStatus("synced");
                    addLog("Cloud backup updated.");
                    localStorage.setItem("billit_lastSync", JSON.stringify(now));
                    resetRetryState();
                }).catch(err => {
                    console.error("Cloud save error:", err);
                    addLog(`Save error: ${err.code || err.message}`);
                    setSyncStatus("error");
                    scheduleRetry("Save", () => setRetryNonce(n => n + 1));
                });
            }, 800); // keep sync feeling near real-time without writing on every keystroke

            return () => clearTimeout(timeoutId);
        }
    }, [user, hasLoadedCloud, data, retryNonce]); // Specifically excludes lastSync to avoid loops

    // Clean up when user logs out
    useEffect(() => {
        if (!user) {
            loadedUidRef.current = null;
            setHasLoadedCloud(false);
            setSyncStatus("idle");
            setSyncLog([]);
            setRetryNonce(0);
            resetRetryState();
            // Note: We don't clear state here, we rely on setters being called from BillingApp or redirecting
        }
    }, [user]);

    useEffect(() => () => clearRetryTimer(), []);

    return {
        syncStatus,
        hasLoadedCloud,
        syncLog,
        lastSync,
        fetchFromCloud,
        addLog
    };
};
