import React, { createContext, useContext, useEffect, useState } from 'react';

type Appearance = 'system' | 'light' | 'dark';
type ThemeVariant = 'bright' | 'ocean' | 'paper' | 'dusk' | 'ember' | 'midnight' | 'slate';

interface ThemeContextType {
    appearance: Appearance;
    theme: ThemeVariant;
    setAppearance: (a: Appearance) => void;
    setTheme: (t: ThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [appearance, setAppearance] = useState<Appearance>(() => {
        return (localStorage.getItem('waves-appearance') as Appearance) || 'system';
    });
    const [theme, setTheme] = useState<ThemeVariant>(() => {
        return (localStorage.getItem('waves-theme') as ThemeVariant) || 'ember';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (appearance === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(appearance);
        }

        root.setAttribute('data-theme', theme);

        localStorage.setItem('waves-appearance', appearance);
        localStorage.setItem('waves-theme', theme);
    }, [appearance, theme]);

    return (
        <ThemeContext.Provider value={{ appearance, theme, setAppearance, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
