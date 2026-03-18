import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, getDocFromCache, setDoc, onSnapshot } from "firebase/firestore";

export const useCloudSync = (user, localData, setters, showToast, hasAcceptedLegal, isEditingRef) => {
    const [syncStatus, setSyncStatus] = useState("idle");
    const [hasLoadedCloud, setHasLoadedCloud] = useState(false);
    const [syncLog, setSyncLog] = useState([]);
    const [lastSync, setLastSync] = useState(null);
    const [forceSave, setForceSave] = useState(0); // Trigger save after fetch

    const skipCloudSave = useRef(false);
    const loadedUidRef = useRef(null);
    const syncTimeoutRef = useRef(null);
    const isFetchingRef = useRef(false);
    const lastFetchRef = useRef({ uid: null, at: 0 });
    // Track how long to keep skipping saves after a cloud load
    const skipUntilRef = useRef(0);
    const isSavingRef = useRef(false);
    const permissionNoticeRef = useRef(false);
    const showToastRef = useRef(showToast);
    const fetchFromCloudRef = useRef(null);

    // Sync ref with prop
    useEffect(() => {
        showToastRef.current = showToast;
        fetchFromCloudRef.current = fetchFromCloud;
    });

    const isFirestoreOfflineError = useCallback((err) => {
        const code = err?.code || "";
        const message = (err?.message || "").toLowerCase();

        return (
            code === "unavailable" ||
            code === "deadline-exceeded" ||
            /client is offline/.test(message) ||
            /failed to get document because the client is offline/.test(message)
        );
    }, []);

    const isFirestorePermissionError = useCallback((err) => {
        const code = err?.code || "";
        const message = (err?.message || "").toLowerCase();

        return (
            code === "permission-denied" ||
            /insufficient permissions/.test(message) ||
            /missing or insufficient permissions/.test(message)
        );
    }, []);

    const addLog = useCallback((msg) => {
        setSyncLog(prev => [
            { message: msg, timestamp: new Date().toISOString() },
            ...prev
        ].slice(0, 50));
    }, []);

    const applyCloudData = useCallback((data) => {
        if (data.invoices !== undefined) {
            setters.setInvoices(data.invoices.map(inv => ({
                ...inv,
                items: (inv.items || []).map(it => ({
                    ...it,
                    tax: Array.isArray(it.tax) ? it.tax : (it.tax ? [it.tax] : [])
                }))
            })));
        }
        if (data.clients !== undefined) setters.setClients(data.clients);
        if (data.products !== undefined) {
            setters.setProducts(data.products.map(p => ({
                ...p,
                tax: Array.isArray(p.tax) ? p.tax : (p.tax ? [p.tax] : [])
            })));
        }
        if (data.seller !== undefined) setters.setSeller(data.seller);
        if (data.taxRates !== undefined) setters.setTaxRates(data.taxRates);
        if (data.currency !== undefined) setters.setCurrency(data.currency);
        if (data.inventoryTitle !== undefined) setters.setInventoryTitle(data.inventoryTitle);
        if (data.defaultNote !== undefined) setters.setDefaultNote(data.defaultNote);
        if (data.theme !== undefined) setters.setTheme(data.theme);

        setLastSync(data.lastSync || new Date().toLocaleTimeString());
    }, [setters]);

    const loadCachedCloudData = useCallback(async (docRef, err) => {
        try {
            const cachedSnap = await getDocFromCache(docRef);
            if (cachedSnap.exists()) {
                applyCloudData(cachedSnap.data());
                setSyncStatus("synced");
                addLog("📦 Loaded cached cloud data. Sync will continue automatically once Firebase is reachable.");
                return true;
            }
        } catch {
            // No cached data available yet
        }

        setSyncStatus("offline");

        if (typeof navigator !== "undefined" && navigator.onLine) {
            addLog(`📡 Firebase is temporarily unreachable (${err?.code || "unknown"}). We'll keep local changes and retry cloud sync automatically.`);
        } else {
            addLog("📡 Device appears offline. Local changes are safe and cloud sync will resume once connection stabilizes.");
        }

        return false;
    }, [addLog, applyCloudData]);

    const fetchFromCloud = useCallback(async (arg, retryCount = 0) => {
        let targetUid = arg || user?.uid;

        // Defensive check: If targetUid is an object, try to extract the string UID
        if (targetUid && typeof targetUid === "object") {
            targetUid = targetUid.uid || targetUid.id || null;
        }

        if (!targetUid || typeof targetUid !== "string" || !db || !hasAcceptedLegal) return;

        // Wait a small amount of time on first fetch to let auth propagate
        if (!hasLoadedCloud && retryCount === 0) {
            await new Promise(r => setTimeout(r, 800));
        }

        const now = Date.now();
        const isSameUserRapidRetry =
            lastFetchRef.current.uid === targetUid &&
            now - lastFetchRef.current.at < 2000;

        if (isFetchingRef.current || (isSameUserRapidRetry && retryCount === 0)) return;

        isFetchingRef.current = true;
        lastFetchRef.current = { uid: targetUid, at: now };

        const docRef = doc(db, "users", targetUid);

        setSyncStatus("loading");
        if (retryCount > 0) {
            addLog(`Retrying cloud fetch (${retryCount})...`);
        } else {
            addLog(`Fetching cloud data for ${targetUid}...`);
        }

        // Block any auto-save for 5 seconds to let the fetch + state settle
        skipCloudSave.current = true;
        skipUntilRef.current = Date.now() + 5000;

        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                applyCloudData(data);
                addLog("✅ Cloud data applied successfully");
            } else {
                addLog("No cloud data found for user. Starting fresh.");
                // Shorten skip period so auto-save can fire sooner for new users
                if (Date.now() + 1000 < skipUntilRef.current) {
                    skipUntilRef.current = Date.now() + 1000;
                }
            }

            setHasLoadedCloud(true);
            loadedUidRef.current = targetUid;
            setSyncStatus("synced");

            // Trigger auto-save re-evaluation once state settles
            setTimeout(() => setForceSave(prev => prev + 1), 1500);
        } catch (err) {
            console.error("Cloud Fetch Error:", err);
            const isOfflineError = isFirestoreOfflineError(err);
            const isPermError = isFirestorePermissionError(err);

            if (isOfflineError) {
                await loadCachedCloudData(docRef, err);
            } else if (isPermError && retryCount < 2) {
                isFetchingRef.current = false; // reset to allow retry
                addLog("⚠️ Permission transiently denied. Retrying in 1.5s...");
                setTimeout(() => fetchFromCloud(targetUid, retryCount + 1), 1500);
                return; // Early return as retry is scheduled
            } else if (isPermError) {
                setSyncStatus("error");
                addLog("🔒 Cloud sync permission denied. Please sign in with the correct account or update Firestore rules.");
                if (showToast && !permissionNoticeRef.current) {
                    showToast("Cloud sync is blocked by Firestore permissions.", "error");
                    permissionNoticeRef.current = true;
                }
            } else {
                setSyncStatus("error");
                addLog(`❌ Fetch error: ${err.message}`);
            }
            // Still mark as loaded so app is usable offline
            setHasLoadedCloud(true);
            loadedUidRef.current = targetUid;
        } finally {
            if (retryCount === 0 || syncStatus !== "loading") {
                isFetchingRef.current = false;
            }
            // Release skip lock after state has settled
            setTimeout(() => {
                skipCloudSave.current = false;
                skipUntilRef.current = 0;
            }, 6000); // 6s ensures all state batches settle
        }
    }, [user?.uid, hasLoadedCloud, addLog, loadCachedCloudData, applyCloudData, isFirestoreOfflineError, isFirestorePermissionError, showToast]);

    // Retry cloud fetch when network returns
    useEffect(() => {
        if (!user?.uid) return;

        const handleOnline = () => {
            if (syncStatus === "offline" || syncStatus === "error") {
                addLog("🌐 Connection restored. Retrying cloud sync...");
                fetchFromCloud(user.uid);
            }
        };

        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [user?.uid, syncStatus, fetchFromCloud, addLog]);

    // Trigger fetch when user signs in
    useEffect(() => {
        if (user?.uid && !hasLoadedCloud && hasAcceptedLegal) {
            // Cancel any pending auto-save immediately
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
            skipCloudSave.current = true;
            skipUntilRef.current = Date.now() + 5000;
            if (fetchFromCloudRef.current) fetchFromCloudRef.current(user.uid);
            permissionNoticeRef.current = false;
        } else if (!user) {
            // User signed out — reset sync state
            setHasLoadedCloud(false);
            loadedUidRef.current = null;
            setSyncStatus("idle");
            permissionNoticeRef.current = false;
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
        }
    }, [user?.uid, hasLoadedCloud, hasAcceptedLegal]);

    // Real-time listener for remote changes (multi-device sync)
    useEffect(() => {
        if (!user?.uid || !db || !hasLoadedCloud || !hasAcceptedLegal) return;

        let unsub = null;
        let retryCount = 0;
        let isActive = true;

        const startListener = (delay = 0) => {
            if (!isActive) return;

            setTimeout(() => {
                if (!isActive) return;

                try {
                    unsub = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
                        // Ignore our own pending writes echoing back
                        if (snapshot.metadata.hasPendingWrites) return;
                        // Guard: Ignore if we're in the middle of a fetch/load OR user is editing
                        if (skipCloudSave.current || Date.now() < skipUntilRef.current || isEditingRef?.current) return;
                        // Guard: Ensure we're only applying data for the current loaded user
                        if (loadedUidRef.current !== user.uid) return;

                        const data = snapshot.data();
                        if (!data) return;

                        addLog("📥 Remote change detected. Applying...");
                        skipCloudSave.current = true;
                        skipUntilRef.current = Date.now() + 2000;

                        applyCloudData(data);
                        setLastSync(data.lastSync || new Date().toLocaleTimeString());

                        setTimeout(() => {
                            skipCloudSave.current = false;
                            skipUntilRef.current = 0;
                        }, 2000);
                    }, (err) => {
                        console.error("Cloud Listener Error:", err);
                        if (isFirestorePermissionError(err)) {
                            if (retryCount < 2) {
                                retryCount++;
                                addLog(`⚠️ Real-time sync permission issue. Retrying in ${retryCount * 3}s...`);
                                startListener(retryCount * 3000);
                            } else {
                                setSyncStatus("error");
                                addLog("🔒 Real-time sync disabled due to Firestore permissions.");
                                if (showToastRef.current && !permissionNoticeRef.current) {
                                    showToastRef.current("Real-time cloud sync is blocked by Firestore permissions.", "error");
                                    permissionNoticeRef.current = true;
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error("Listener startup failed:", e);
                }
            }, delay);
        };

        startListener(1000); // 1s initial delay to let auth settle

        return () => {
            isActive = false;
            if (unsub) unsub();
        };
    }, [user?.uid, hasLoadedCloud, setters, addLog, isFirestorePermissionError, hasAcceptedLegal]);

    // Auto-save local changes to cloud (debounced)
    useEffect(() => {
        if (!user?.uid || !db || !hasLoadedCloud || !hasAcceptedLegal) return;
        if (loadedUidRef.current !== user.uid) return;
        // Guard: don't save while we're loading from cloud
        if (skipCloudSave.current || Date.now() < skipUntilRef.current) return;

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
            // Re-check guards right before saving
            if (skipCloudSave.current || Date.now() < skipUntilRef.current) return;
            if (isSavingRef.current) return; // Prevent overlapping saves

            setSyncStatus("saving");
            isSavingRef.current = true;
            try {
                const now = new Date();
                
                // Point 2 & 24 Fix: Strip large device-local or redundant data to stay under 1MB Firestore limit
                const syncSeller = { ...localData.seller };
                // Keep images local only for better scalability/speed
                if (syncSeller.logo) syncSeller.logo = "[stored locally]";
                if (syncSeller.qrCode) syncSeller.qrCode = "[stored locally]";

                const payload = {
                    ...localData,
                    seller: syncSeller,
                    lastSync: now.toLocaleTimeString(),
                    updatedAt: now.toISOString()
                };

                // Add size warning for document limit (1MB)
                const payloadSize = new Blob([JSON.stringify(payload)]).size;
                if (payloadSize > 900000) {
                    addLog("⚠️ Data approaching cloud sync limit (1MB). Consider archiving old invoices.");
                }

                await setDoc(doc(db, "users", user.uid), payload, { merge: true });
                setSyncStatus("synced");
                setLastSync(payload.lastSync);
            } catch (err) {
                console.error("Cloud Save Error:", err);
                if (isFirestoreOfflineError(err)) {
                    setSyncStatus("offline");
                    addLog("📡 Cloud save deferred. Local changes are stored and will sync automatically when Firebase reconnects.");
                } else {
                    setSyncStatus("error");
                    addLog(`❌ Save failed: ${err.message}`);
                }
            } finally {
                isSavingRef.current = false;
            }
        }, 2000);

        return () => clearTimeout(syncTimeoutRef.current);
    }, [user?.uid, localData, hasLoadedCloud, addLog, isFirestoreOfflineError, forceSave, hasAcceptedLegal]);

    return {
        syncStatus,
        hasLoadedCloud,
        syncLog,
        lastSync,
        fetchFromCloud,
        addLog
    };
};
