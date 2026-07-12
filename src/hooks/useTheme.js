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

    const [isDark, setIsDark] = useState(() => {
        const checkDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        return checkDark;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        const meta = document.getElementById("theme-color-meta");

        const updateTheme = () => {
            const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
            setIsDark(dark);
            root.setAttribute("data-theme", dark ? "dark" : "light");
            if (meta) meta.setAttribute("content", dark ? "#0a0a0f" : "#ffffff");
        };

        updateTheme();
        localStorage.setItem("billit_theme", theme);

        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const listener = () => updateTheme();
            mediaQuery.addEventListener("change", listener);
            return () => mediaQuery.removeEventListener("change", listener);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    return { theme, setTheme, toggleTheme, isDark };
};
