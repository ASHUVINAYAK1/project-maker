import { create } from 'zustand';
import dbService from '../lib/db';
import type { AppSettings, OllamaSettings, GitHubSettings } from '../types';

interface SettingsState {
    settings: AppSettings;
    isLoading: boolean;
}

interface SettingsActions {
    // Initialization
    init: () => Promise<void>;

    // Theme
    setTheme: (theme: AppSettings['theme']) => Promise<void>;

    // Ollama
    updateOllamaSettings: (updates: Partial<OllamaSettings>) => Promise<void>;

    // GitHub  
    updateGitHubSettings: (updates: Partial<GitHubSettings>) => Promise<void>;
    setGitHubToken: (token: string) => Promise<void>;
    clearGitHubToken: () => Promise<void>;

    // Project defaults
    setDefaultProjectPath: (path: string) => Promise<void>;

    // Reset
    resetSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
    theme: 'dark',
    ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'qwen2.5-coder:7b',
        isConnected: false,
    },
    github: {
        isConnected: false,
    },
    defaultProjectPath: '',
};

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
    // State
    settings: defaultSettings,
    isLoading: false,

    // Actions
    init: async () => {
        set({ isLoading: true });
        try {
            const results = await dbService.query<any>('SELECT value FROM settings WHERE id = "appSettings"');
            if (results.length > 0) {
                const savedSettings = JSON.parse(results[0].value);
                const mergedSettings = { ...defaultSettings, ...savedSettings };
                set({ settings: mergedSettings });

                // Apply theme
                const theme = mergedSettings.theme;
                const root = document.documentElement;
                root.classList.remove('light', 'dark');
                if (theme === 'system') {
                    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    root.classList.add(isDark ? 'dark' : 'light');
                } else {
                    root.classList.add(theme);
                }
            } else {
                // Initial save of defaults
                await dbService.execute(
                    'INSERT INTO settings (id, value) VALUES ("appSettings", ?)',
                    [JSON.stringify(defaultSettings)]
                );
            }
            set({ isLoading: false });
        } catch (error) {
            console.error('Failed to init settings store:', error);
            set({ isLoading: false });
        }
    },

    setTheme: async (theme) => {
        const newSettings = { ...get().settings, theme };
        set({ settings: newSettings });

        // Persist
        await dbService.execute(
            'UPDATE settings SET value = ? WHERE id = "appSettings"',
            [JSON.stringify(newSettings)]
        );

        // Apply theme to document
        const root = document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(isDark ? 'dark' : 'light');
        } else {
            root.classList.add(theme);
        }
    },

    updateOllamaSettings: async (updates) => {
        const newSettings = {
            ...get().settings,
            ollama: { ...get().settings.ollama, ...updates },
        };
        set({ settings: newSettings });

        await dbService.execute(
            'UPDATE settings SET value = ? WHERE id = "appSettings"',
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
            'UPDATE settings SET value = ? WHERE id = "appSettings"',
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
            'UPDATE settings SET value = ? WHERE id = "appSettings"',
            [JSON.stringify(newSettings)]
        );
    },

    clearGitHubToken: async () => {
        const newSettings = {
            ...get().settings,
            github: {
                isConnected: false,
                token: undefined,
                username: undefined,
            },
        };
        set({ settings: newSettings });

        await dbService.execute(
            'UPDATE settings SET value = ? WHERE id = "appSettings"',
            [JSON.stringify(newSettings)]
        );
    },

    setDefaultProjectPath: async (path) => {
        const newSettings = { ...get().settings, defaultProjectPath: path };
        set({ settings: newSettings });

        await dbService.execute(
            'UPDATE settings SET value = ? WHERE id = "appSettings"',
            [JSON.stringify(newSettings)]
        );
    },

    resetSettings: async () => {
        set({ settings: defaultSettings });
        await dbService.execute(
            'UPDATE settings SET value = ? WHERE id = "appSettings"',
            [JSON.stringify(defaultSettings)]
        );
    },
}));
