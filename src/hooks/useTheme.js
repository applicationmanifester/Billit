import { useState, useEffect } from "react";

export const useTheme = () => {
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem("billit_theme");
            return saved || "light";
        } catch (e) {
            return "light";
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        root.setAttribute("data-theme", isDark ? "dark" : "light");
        
        const meta = document.getElementById("theme-color-meta");
        if (meta) meta.setAttribute("content", isDark ? "#0a0a0f" : "#ffffff");

        localStorage.setItem("billit_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    return { theme, setTheme, toggleTheme };
};
