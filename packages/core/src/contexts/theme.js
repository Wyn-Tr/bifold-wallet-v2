import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { bifoldTheme } from '../theme';
import { DispatchAction } from './reducers/store';
import { useStore } from './store';
const ThemeContext = createContext({
    ...bifoldTheme,
    setTheme: () => { },
});
export const ThemeProvider = ({ themes, defaultThemeName, children }) => {
    const [store, dispatch] = useStore();
    const activeTheme = useMemo(() => {
        return ((store.preferences.theme && themes.find((t) => t.themeName === store.preferences.theme)) ||
            themes.find((t) => t.themeName === defaultThemeName) ||
            themes[0]);
    }, [store.preferences.theme, themes, defaultThemeName]);
    const setTheme = useCallback((themeName) => {
        const newTheme = themes.find((t) => t.themeName === themeName) || themes[0];
        dispatch({ type: DispatchAction.SET_THEME, payload: [newTheme.themeName] });
    }, [themes, dispatch]);
    // prevent re-rendering of the context value
    const value = useMemo(() => {
        return {
            ...activeTheme,
            setTheme,
        };
    }, [activeTheme, setTheme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
export const useTheme = () => useContext(ThemeContext);
