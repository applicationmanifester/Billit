import { useState, useEffect, useRef, useCallback } from "react";
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
    const [syncStatus, setSyncStatus] = useState("idle");
    const [hasLoadedCloud, setHasLoadedCloud] = useState(false);
    const [syncLog, setSyncLog] = useState([]);
    const [retryNonce, setRetryNonce] = useState(0);
    const [lastSync, setLastSync] = useState(() => {
        try {
            const saved = localStorage.getItem("billit_lastSync");
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });

    // Use a ref to track the uid we've already fetched for,
    // so switching accounts always triggers a fresh fetch.
    const fetchedForUidRef = useRef(null);
    const skipCloudSave = useRef(false);
    const retryTimeoutRef = useRef(null);
    const retryAttemptRef = useRef(0);

    const addLog = useCallback((message) => {
        setSyncLog(prev => [{ timestamp: Date.now(), message }, ...prev].slice(0, 10));
    }, []);

    const clearRetryTimer = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
    }, []);

    const resetRetryState = useCallback(() => {
        retryAttemptRef.current = 0;
        clearRetryTimer();
    }, [clearRetryTimer]);

    // --- fetchFromCloud is now stable via useCallback ---
    const fetchFromCloud = useCallback(async (u) => {
        if (!u) return;
        if (!db) {
            addLog("Sync Error: Firestore not initialized. Check Firebase config.");
            setSyncStatus("error");
            console.error("fetchFromCloud: db is null — Firebase not configured.");
            return;
        }

        clearRetryTimer();
        setSyncStatus("syncing");
        addLog(`Fetching data for: ${u.email}`);
        console.log(`[CloudSync] Fetching for uid=${u.uid} email=${u.email}`);

        const userDocRef = doc(db, "users", u.uid);
        try {
            const docSnap = await withTimeout(
                getDoc(userDocRef),
                SYNC_REQUEST_TIMEOUT_MS,
                "Cloud fetch"
            );

            console.log("[CloudSync] Firestore response received. exists:", docSnap.exists());

            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                addLog(`Cloud doc found! Invoices: ${cloudData.invoices?.length ?? 0}`);

                // Block the save effect BEFORE we start setting state
                skipCloudSave.current = true;

                if (Array.isArray(cloudData.invoices) && setters.setInvoices)
                    setters.setInvoices(cloudData.invoices);
                if (Array.isArray(cloudData.clients) && setters.setClients)
                    setters.setClients(cloudData.clients);
                if (Array.isArray(cloudData.products) && setters.setProducts)
                    setters.setProducts(cloudData.products);
                if (cloudData.seller && setters.setSeller)
                    setters.setSeller(prev => ({ ...prev, ...cloudData.seller }));
                if (Array.isArray(cloudData.taxRates) && setters.setTaxRates)
                    setters.setTaxRates(cloudData.taxRates);
                if (cloudData.currency && setters.setCurrency)
                    setters.setCurrency(cloudData.currency);
                if (cloudData.inventoryTitle && setters.setInventoryTitle)
                    setters.setInventoryTitle(cloudData.inventoryTitle);
                if (typeof cloudData.defaultNote === "string" && setters.setDefaultNote)
                    setters.setDefaultNote(cloudData.defaultNote);

                const fetchSyncTime = cloudData.lastSync || new Date().toLocaleTimeString();
                setLastSync(fetchSyncTime);
                localStorage.setItem("billit_lastSync", JSON.stringify(fetchSyncTime));

                setSyncStatus("synced");
                addLog("Data successfully merged from cloud.");
                resetRetryState();
            } else {
                console.warn("[CloudSync] No document at users/" + u.uid);
                addLog("No cloud document found — new account or first use.");
                setSyncStatus("idle");
                resetRetryState();
                // Don't upload blank data for a brand-new user
                skipCloudSave.current = true;
            }

            // Mark this uid as fetched so we don't re-fetch on every render
            fetchedForUidRef.current = u.uid;
            setHasLoadedCloud(true);

            // Release the guard after React has had time to process all the state updates.
            // 600ms is generous but safe — reduces the risk of immediately overwriting cloud data.
            setTimeout(() => {
                skipCloudSave.current = false;
                console.log("[CloudSync] save guard released.");
            }, 600);

        } catch (err) {
            console.error("[CloudSync] fetch error:", err);
            addLog(`Fetch error: ${err.message}`);
            setSyncStatus("error");
            // Make sure we still mark as "loaded" so the app isn't stuck
            setHasLoadedCloud(true);
            fetchedForUidRef.current = u.uid;
            skipCloudSave.current = false;

            // Exponential back-off retry
            const nextAttempt = retryAttemptRef.current + 1;
            retryAttemptRef.current = nextAttempt;
            const delay = Math.min(AUTO_RETRY_BASE_MS * (2 ** (nextAttempt - 1)), AUTO_RETRY_MAX_MS);
            addLog(`Auto-retry in ${Math.round(delay / 1000)}s (attempt ${nextAttempt}).`);
            retryTimeoutRef.current = setTimeout(() => fetchFromCloud(u), delay);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addLog, clearRetryTimer, resetRetryState]);
    // Note: setters are intentionally omitted from deps — they're stable dispatcher refs.

    // --- Trigger fetch whenever the signed-in user changes ---
    useEffect(() => {
        if (!user) {
            // User logged out — reset everything
            fetchedForUidRef.current = null;
            skipCloudSave.current = false;
            setHasLoadedCloud(false);
            setSyncStatus("idle");
            setSyncLog([]);
            retryAttemptRef.current = 0;
            clearRetryTimer();
            return;
        }

        // Only fetch if we haven't already loaded for this uid
        if (fetchedForUidRef.current !== user.uid) {
            console.log("[CloudSync] New user detected, starting fetch. uid=", user.uid);
            fetchFromCloud(user);
        }
    }, [user, fetchFromCloud, clearRetryTimer]);

    // --- Auto-save: runs whenever data changes, after initial load ---
    useEffect(() => {
        if (!user || !hasLoadedCloud) return;

        if (skipCloudSave.current) {
            console.log("[CloudSync] save guard active — skipping.");
            return;
        }

        // Don't wipe cloud with an empty local state
        const hasData = (data.invoices?.length ?? 0) > 0
            || (data.clients?.length ?? 0) > 0
            || (data.products?.length ?? 0) > 0;

        if (!hasData) {
            console.log("[CloudSync] No meaningful local data — skipping save.");
            setSyncStatus("synced");
            return;
        }

        if (!db) {
            addLog("Sync Error: Firestore unavailable.");
            setSyncStatus("error");
            return;
        }

        setSyncStatus("waiting");

        const timeoutId = setTimeout(() => {
            // Re-check guard after the debounce delay — a fetch could have started since
            if (skipCloudSave.current) {
                console.log("[CloudSync] save guard active after debounce — skipping.");
                return;
            }

            setSyncStatus("syncing");
            addLog("Sending local updates to cloud...");

            const now = new Date().toLocaleTimeString();
            const userDocRef = doc(db, "users", user.uid);
            const cloudPayload = { ...data, lastSync: now };

            withTimeout(
                setDoc(userDocRef, cloudPayload, { merge: true }),
                SYNC_REQUEST_TIMEOUT_MS,
                "Cloud save"
            ).then(() => {
                setLastSync(now);
                localStorage.setItem("billit_lastSync", JSON.stringify(now));
                setSyncStatus("synced");
                addLog("Cloud backup updated.");
                resetRetryState();
            }).catch(err => {
                console.error("[CloudSync] save error:", err);
                addLog(`Save error: ${err.code || err.message}`);
                setSyncStatus("error");

                const nextAttempt = retryAttemptRef.current + 1;
                retryAttemptRef.current = nextAttempt;
                const delay = Math.min(AUTO_RETRY_BASE_MS * (2 ** (nextAttempt - 1)), AUTO_RETRY_MAX_MS);
                addLog(`Auto-retry save in ${Math.round(delay / 1000)}s.`);
                retryTimeoutRef.current = setTimeout(() => setRetryNonce(n => n + 1), delay);
            });
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [user, hasLoadedCloud, data, retryNonce, addLog, resetRetryState]);

    // Cleanup on unmount
    useEffect(() => () => clearRetryTimer(), [clearRetryTimer]);

    return {
        syncStatus,
        hasLoadedCloud,
        syncLog,
        lastSync,
        fetchFromCloud,
        addLog
    };
};
