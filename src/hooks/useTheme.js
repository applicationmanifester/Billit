import { useState, useEffect } from "react";

export const useTheme = (hasAcceptedLegal) => {
    const [theme, setTheme] = useState(() => {
        if (hasAcceptedLegal === false) return "light"; // Force light if explicitly not accepted
        try {
            const saved = localStorage.getItem("billit_theme");
            return saved || "light";
        } catch (e) {
            return "light";
        }
    });

    // Reactive Loading: When consent is granted, load from localStorage
    useEffect(() => {
        if (hasAcceptedLegal) {
            const saved = localStorage.getItem("billit_theme");
            if (saved) setTheme(saved);
        }
    }, [hasAcceptedLegal]);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === "system") {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.setAttribute("data-theme", isDark ? "dark" : "light");
        } else {
            root.setAttribute("data-theme", theme);
        }
        
        // Gate Persistence: Only save if consent is granted
        if (hasAcceptedLegal) {
            localStorage.setItem("billit_theme", theme);
        }
    }, [theme, hasAcceptedLegal]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    return { theme, setTheme, toggleTheme };
};
