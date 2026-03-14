import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SYNC_REQUEST_TIMEOUT_MS = 12000;

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
    const [lastSync, setLastSync] = useState(() => {
        try {
            const saved = localStorage.getItem("billit_lastSync");
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });

    const skipCloudSave = useRef(false);
    const loadedUidRef = useRef(null);

    const addLog = (msg) => setSyncLog(prev => [msg, ...prev].slice(0, 10));

    const fetchFromCloud = async (u) => {
        if (!u) return;
        setSyncStatus("syncing");
        addLog("Initiating fetch from cloud...");
        const userDocRef = doc(db, "users", u.uid);
        try {
            const docSnap = await withTimeout(
                getDoc(userDocRef),
                SYNC_REQUEST_TIMEOUT_MS,
                "Cloud fetch"
            );
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
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
            } else {
                addLog("No cloud document found for this account.");
                setSyncStatus("idle");
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
            console.error("Cloud fetch error:", err);
            addLog(`Fetch error: ${err.message}`);
            setSyncStatus("error");
            setHasLoadedCloud(true);
            skipCloudSave.current = false;
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
                }).catch(err => {
                    console.error("Cloud save error:", err);
                    addLog(`Save error: ${err.code || err.message}`);
                    setSyncStatus("error");
                });
            }, 800); // keep sync feeling near real-time without writing on every keystroke

            return () => clearTimeout(timeoutId);
        }
    }, [user, hasLoadedCloud, data]); // Specifically excludes lastSync to avoid loops

    // Clean up when user logs out
    useEffect(() => {
        if (!user) {
            loadedUidRef.current = null;
            setHasLoadedCloud(false);
            setSyncStatus("idle");
            setSyncLog([]);
            // Note: We don't clear state here, we rely on setters being called from BillingApp or redirecting
        }
    }, [user]);

    return {
        syncStatus,
        hasLoadedCloud,
        syncLog,
        lastSync,
        fetchFromCloud,
        addLog
    };
};
