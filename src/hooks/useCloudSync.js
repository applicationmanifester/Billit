import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export const useCloudSync = (user, localData, setters, showToast) => {
    const [syncStatus, setSyncStatus] = useState("idle");
    const [hasLoadedCloud, setHasLoadedCloud] = useState(false);
    const [syncLog, setSyncLog] = useState([]);
    const [lastSync, setLastSync] = useState(null);

    const skipCloudSave = useRef(false);
    const loadedUidRef = useRef(null);
    const syncTimeoutRef = useRef(null);
    // Track how long to keep skipping saves after a cloud load
    const skipUntilRef = useRef(0);

    const addLog = useCallback((msg) => {
        setSyncLog(prev => [
            { message: msg, timestamp: new Date().toISOString() },
            ...prev
        ].slice(0, 50));
    }, []);

    const fetchFromCloud = useCallback(async (uid) => {
        const targetUid = uid || user?.uid;
        if (!targetUid || !db) return;

        setSyncStatus("loading");
        addLog(`Fetching cloud data for ${targetUid}...`);

        // Block any auto-save for 5 seconds to let the fetch + state settle
        skipCloudSave.current = true;
        skipUntilRef.current = Date.now() + 5000;

        try {
            const docRef = doc(db, "users", targetUid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                if (data.invoices !== undefined) setters.setInvoices(data.invoices);
                if (data.clients !== undefined) setters.setClients(data.clients);
                if (data.products !== undefined) setters.setProducts(data.products);
                if (data.seller !== undefined) setters.setSeller(data.seller);
                if (data.taxRates !== undefined) setters.setTaxRates(data.taxRates);
                if (data.currency !== undefined) setters.setCurrency(data.currency);
                if (data.inventoryTitle !== undefined) setters.setInventoryTitle(data.inventoryTitle);
                if (data.defaultNote !== undefined) setters.setDefaultNote(data.defaultNote);

                setLastSync(data.lastSync || new Date().toLocaleTimeString());
                addLog("✅ Cloud data applied successfully");
            } else {
                addLog("No cloud data found for user. Starting fresh.");
            }

            setHasLoadedCloud(true);
            loadedUidRef.current = targetUid;
            setSyncStatus("synced");
        } catch (err) {
            console.error("Cloud Fetch Error:", err);
            setSyncStatus("error");
            addLog(`❌ Fetch error: ${err.message}`);
            // Still mark as loaded so app is usable offline
            setHasLoadedCloud(true);
            loadedUidRef.current = targetUid;
        } finally {
            // Release skip lock after state has settled
            setTimeout(() => {
                skipCloudSave.current = false;
                skipUntilRef.current = 0;
            }, 2000);
        }
    }, [user?.uid, addLog, setters]);

    // Trigger fetch when user signs in
    useEffect(() => {
        if (user?.uid && !hasLoadedCloud) {
            // Cancel any pending auto-save immediately
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
            skipCloudSave.current = true;
            skipUntilRef.current = Date.now() + 5000;
            fetchFromCloud(user.uid);
        } else if (!user) {
            // User signed out — reset sync state
            setHasLoadedCloud(false);
            loadedUidRef.current = null;
            setSyncStatus("idle");
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
        }
    }, [user, hasLoadedCloud, fetchFromCloud]);

    // Real-time listener for remote changes (multi-device sync)
    useEffect(() => {
        if (!user?.uid || !db || !hasLoadedCloud) return;

        const unsub = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            // Ignore our own pending writes echoing back
            if (snapshot.metadata.hasPendingWrites) return;
            // Ignore if we're in the middle of a fetch/load
            if (skipCloudSave.current || Date.now() < skipUntilRef.current) return;

            const data = snapshot.data();
            if (!data) return;

            const remoteTime = new Date(data.updatedAt || 0).getTime();
            const localTime = new Date(localData.updatedAt || 0).getTime();

            if (remoteTime > localTime + 1000) { // 1s buffer to avoid flip-flopping
                addLog("📥 Remote change detected. Applying...");
                skipCloudSave.current = true;
                skipUntilRef.current = Date.now() + 2000;

                if (data.invoices !== undefined) setters.setInvoices(data.invoices);
                if (data.clients !== undefined) setters.setClients(data.clients);
                if (data.products !== undefined) setters.setProducts(data.products);
                if (data.seller !== undefined) setters.setSeller(data.seller);
                if (data.taxRates !== undefined) setters.setTaxRates(data.taxRates);
                if (data.currency !== undefined) setters.setCurrency(data.currency);
                if (data.inventoryTitle !== undefined) setters.setInventoryTitle(data.inventoryTitle);
                if (data.defaultNote !== undefined) setters.setDefaultNote(data.defaultNote);

                setLastSync(data.lastSync || new Date().toLocaleTimeString());

                setTimeout(() => {
                    skipCloudSave.current = false;
                    skipUntilRef.current = 0;
                }, 2000);
            }
        });

        return unsub;
    }, [user?.uid, hasLoadedCloud, localData.updatedAt, setters, addLog]);

    // Auto-save local changes to cloud (debounced)
    useEffect(() => {
        if (!user?.uid || !db || !hasLoadedCloud) return;
        if (loadedUidRef.current !== user.uid) return;
        // Guard: don't save while we're loading from cloud
        if (skipCloudSave.current || Date.now() < skipUntilRef.current) return;

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        setSyncStatus("saving");
        syncTimeoutRef.current = setTimeout(async () => {
            // Re-check guard right before saving (state may have changed during debounce)
            if (skipCloudSave.current || Date.now() < skipUntilRef.current) {
                setSyncStatus("synced");
                return;
            }
            try {
                const now = new Date();
                const payload = {
                    ...localData,
                    lastSync: now.toLocaleTimeString(),
                    updatedAt: now.toISOString()
                };
                await setDoc(doc(db, "users", user.uid), payload, { merge: true });
                setSyncStatus("synced");
                setLastSync(payload.lastSync);
            } catch (err) {
                console.error("Cloud Save Error:", err);
                setSyncStatus("error");
                addLog(`❌ Save failed: ${err.message}`);
            }
        }, 2000);

        return () => clearTimeout(syncTimeoutRef.current);
    }, [user?.uid, localData, hasLoadedCloud, addLog]);

    return {
        syncStatus,
        hasLoadedCloud,
        syncLog,
        lastSync,
        fetchFromCloud,
        addLog
    };
};
