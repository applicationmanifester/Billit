import { useState, useEffect } from "react";
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

    useEffect(() => {
        // 1. Listen for Auth State Changes (Source of Truth)
        const unsub = onAuthStateChanged(auth, (u) => {
            console.log("Verified Auth State Change:", u ? u.email : "Logged Out");
            setUser(u);
            setAuthError(null);
            setAuthLoading(false);
        });

        // 2. Handle pending redirect results
        const checkRedirect = async () => {
            try {
                console.log("Checking for Redirect Result...");
                const result = await getRedirectResult(auth);
                if (result) {
                    console.log("Redirect sign-in success for:", result.user.email);
                    // Note: We don't setUser(result.user) here because onAuthStateChanged 
                    // will catch the new session and update state for us (Bug 1 fix).
                    if (showToast) showToast("Signed in with Google!");
                }
            } catch (error) {
                console.error("Redirect Error:", error.code, error.message);
                let msg = error.message;
                if (error.code === 'auth/credential-already-in-use') {
                    msg = "This Google account is already linked to another user.";
                } else if (error.code === 'auth/network-request-failed') {
                    msg = "Network error. Please check your connection.";
                }
                setAuthError(`${error.code}: ${msg}`);
                setAuthLoading(false);
            }
        };

        checkRedirect();
        return unsub;
    }, [showToast]);

    const loginWithPopup = async () => {
        if (showToast) showToast("Opening Sign-in Popup...");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (err) {
            console.error("Popup Error:", err);
            setAuthError(err.code);
            if (showToast) showToast(err.message, "error");
            throw err;
        }
    };

    const loginWithRedirect = async () => {
        if (showToast) showToast("Signing in (Redirect Mode)...");
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (err) {
            console.error("Sign-In Redirect Error:", err);
            if (showToast) showToast(err.message, "error");
            throw err;
        }
    };

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (err) {
            console.error("Sign-Out Error:", err);
            if (showToast) showToast("Error signing out", "error");
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
