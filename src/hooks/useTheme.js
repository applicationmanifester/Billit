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
        if (theme === "system") {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.setAttribute("data-theme", isDark ? "dark" : "light");
        } else {
            root.setAttribute("data-theme", theme);
        }
        localStorage.setItem("billit_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    return { theme, setTheme, toggleTheme };
};
