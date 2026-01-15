import { create } from 'zustand';
import dbService from '../lib/db';
import type { AppSettings } from '../types';

interface SettingsState {
    settings: AppSettings;
    isLoading: boolean;
}

interface SettingsActions {
    init: () => Promise<void>;
    setTheme: (theme: AppSettings['theme']) => Promise<void>;
    updateOllamaSettings: (updates: Partial<AppSettings['ollama']>) => Promise<void>;
    updateGitHubSettings: (updates: Partial<AppSettings['github']>) => Promise<void>;
    setGitHubToken: (token: string) => Promise<void>;
    clearGitHubToken: () => Promise<void>;
    setDefaultProjectPath: (path: string) => Promise<void>;
    resetSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
    theme: 'system',
    ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'llama3',
        isConnected: false,
    },
    github: {
        isConnected: false,
    },
    defaultProjectPath: '',
};

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
    settings: defaultSettings,
    isLoading: false,

    init: async () => {
        set({ isLoading: true });
        try {
            const results = await dbService.query<any>("SELECT value FROM Settings WHERE id = 'appSettings'");
            if (results.length > 0) {
                const savedSettings = JSON.parse(results[0].value);
                const mergedSettings = { ...defaultSettings, ...savedSettings };
                set({ settings: mergedSettings, isLoading: false });

                // Apply theme
                const theme = mergedSettings.theme;
                const root = document.documentElement;
                root.classList.remove('light', 'dark');
                if (theme === 'system') {
                    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    root.classList.add(systemDark ? 'dark' : 'light');
                } else {
                    root.classList.add(theme);
                }
            } else {
                // Initialize settings if not found
                await dbService.execute("INSERT INTO Settings (id, value) VALUES ('appSettings', ?)", [JSON.stringify(get().settings)]);
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to init settings:', error);
            set({ isLoading: false });
        }
    },

    setTheme: async (theme) => {
        const newSettings = { ...get().settings, theme };
        set({ settings: newSettings });

        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(systemDark ? 'dark' : 'light');
        } else {
            root.classList.add(theme);
        }

        await dbService.execute(
            "UPDATE Settings SET value = ? WHERE id = 'appSettings'",
            [JSON.stringify(newSettings)]
        );
    },

    updateOllamaSettings: async (updates) => {
        const newSettings = {
            ...get().settings,
            ollama: { ...get().settings.ollama, ...updates },
        };
        set({ settings: newSettings });

        await dbService.execute(
            "UPDATE Settings SET value = ? WHERE id = 'appSettings'",
            [JSON.stringify(newSettings)]
        );
    },

    updateGitHubSettings: async (updates) => {
        const newSettings = {
            ...get().settings,
            github: { ...get().settings.github, ...updates },
        };
        set({ settings: newSettings });

        await dbService.execute(
            "UPDATE Settings SET value = ? WHERE id = 'appSettings'",
            [JSON.stringify(newSettings)]
        );
    },

    setGitHubToken: async (token) => {
        const newSettings = {
            ...get().settings,
            github: {
                ...get().settings.github,
                token,
                isConnected: true,
            },
        };
        set({ settings: newSettings });

        await dbService.execute(
            "UPDATE Settings SET value = ? WHERE id = 'appSettings'",
            [JSON.stringify(newSettings)]
        );
    },

    clearGitHubToken: async () => {
        const newSettings = {
            ...get().settings,
            github: {
                isConnected: false,
            },
        };
        set({ settings: newSettings });

        await dbService.execute(
            "UPDATE Settings SET value = ? WHERE id = 'appSettings'",
            [JSON.stringify(newSettings)]
        );
    },

    setDefaultProjectPath: async (path) => {
        const newSettings = { ...get().settings, defaultProjectPath: path };
        set({ settings: newSettings });

        await dbService.execute(
            "UPDATE Settings SET value = ? WHERE id = 'appSettings'",
            [JSON.stringify(newSettings)]
        );
    },

    resetSettings: async () => {
        set({ settings: defaultSettings });
        await dbService.execute(
            "UPDATE Settings SET value = ? WHERE id = 'appSettings'",
            [JSON.stringify(defaultSettings)]
        );
    },
}));
