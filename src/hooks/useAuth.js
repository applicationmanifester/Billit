import { useState, useEffect, useRef } from "react";
import { auth, googleProvider } from "../firebase";
import {
    onAuthStateChanged,
    signOut as firebaseSignOut,
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult
} from "firebase/auth";

export const useAuth = (showToast) => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // FIX: Use a ref for showToast so the effect doesn't re-subscribe on every render.
    // showToast is recreated every render in BillingApp; putting it in deps caused
    // onAuthStateChanged to be re-subscribed (and getRedirectResult re-called) on
    // every single render — leaking Firebase listeners.
    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    });

    useEffect(() => {
        // Subscribe once — never re-runs because deps array is empty.
        const unsub = onAuthStateChanged(auth, (u) => {
            // STRICT GATING: If user exists but hasn't accepted terms, sign them out immediately.
            const hasAccepted = localStorage.getItem("billit_hasAcceptedLegal") === "true";
            
            if (u && !hasAccepted) {
                firebaseSignOut(auth);
                setUser(null);
                setAuthLoading(false);
                return;
            }

            // MASKING: Only expose the user if sign-in was explicit in this session
            const isExplicit = sessionStorage.getItem("billit_explicit_signin") === "true";
            
            if (u && isExplicit) {
                setUser(u);
            } else {
                setUser(null);
            }
            
            setAuthError(null);
            setAuthLoading(false);
        });

        // Handle pending redirect results (gated by session flag)
        const checkRedirect = async () => {
            if (sessionStorage.getItem("firebase_redirect_pending") !== "true") return;
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    showToastRef.current?.("Signed in with Google!");
                }
            } catch (error) {
                console.error("Redirect Error:", error.code, error.message);
                let msg = error.message;
                if (error.code === "auth/credential-already-in-use") {
                    msg = "This Google account is already linked to another user.";
                } else if (error.code === "auth/network-request-failed") {
                    msg = "Network error. Please check your connection.";
                }
                setAuthError(`${error.code}: ${msg}`);
                setAuthLoading(false);
            } finally {
                sessionStorage.removeItem("firebase_redirect_pending");
            }
        };

        checkRedirect();
        return unsub;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — auth listener should be set up once

    const loginWithPopup = async () => {
        setAuthError(null);
        const isNative = window.Capacitor?.isNativePlatform;
        
        if (isNative) {
            showToastRef.current?.("Redirecting to Google Sign-in...");
            return loginWithRedirect();
        }

        showToastRef.current?.("Opening Sign-in Popup...");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (err) {
            console.error("Popup Error:", err);
            // Fallback to redirect if popup is blocked or fails
            if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
                showToastRef.current?.("Popup blocked. Switching to redirect...", "warning");
                return loginWithRedirect();
            }
            setAuthError(err.code);
            showToastRef.current?.(err.message, "error");
            throw err;
        }
    };

    const loginWithRedirect = async () => {
        setAuthError(null);
        showToastRef.current?.("Signing in (Redirect Mode)...");
        try {
            sessionStorage.setItem("firebase_redirect_pending", "true");
            await signInWithRedirect(auth, googleProvider);
        } catch (err) {
            console.error("Sign-In Redirect Error:", err);
            setAuthError(err.code || err.message);
            showToastRef.current?.(err.message, "error");
            throw err;
        }
    };

    const logout = async () => {
        try {
            sessionStorage.removeItem("billit_explicit_signin");
            await firebaseSignOut(auth);
        } catch (err) {
            console.error("Sign-Out Error:", err);
            showToastRef.current?.("Error signing out", "error");
            throw err;
        }
    };

    return {
        user,
        authLoading,
        authError,
        loginWithPopup,
        loginWithRedirect,
        logout,
        setAuthError
    };
};
