import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, OllamaSettings, GitHubSettings } from '../types';

interface SettingsState {
    settings: AppSettings;
}

interface SettingsActions {
    // Theme
    setTheme: (theme: AppSettings['theme']) => void;

    // Ollama
    updateOllamaSettings: (updates: Partial<OllamaSettings>) => void;

    // GitHub  
    updateGitHubSettings: (updates: Partial<GitHubSettings>) => void;
    setGitHubToken: (token: string) => void;
    clearGitHubToken: () => void;

    // Project defaults
    setDefaultProjectPath: (path: string) => void;

    // Reset
    resetSettings: () => void;
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

export const useSettingsStore = create<SettingsState & SettingsActions>()(
    persist(
        (set) => ({
            // State
            settings: defaultSettings,

            // Actions
            setTheme: (theme) => {
                set((state) => ({
                    settings: { ...state.settings, theme },
                }));

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

            updateOllamaSettings: (updates) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        ollama: { ...state.settings.ollama, ...updates },
                    },
                }));
            },

            updateGitHubSettings: (updates) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        github: { ...state.settings.github, ...updates },
                    },
                }));
            },

            setGitHubToken: (token) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        github: {
                            ...state.settings.github,
                            token,
                            isConnected: true,
                        },
                    },
                }));
            },

            clearGitHubToken: () => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        github: {
                            isConnected: false,
                            token: undefined,
                            username: undefined,
                        },
                    },
                }));
            },

            setDefaultProjectPath: (path) => {
                set((state) => ({
                    settings: { ...state.settings, defaultProjectPath: path },
                }));
            },

            resetSettings: () => {
                set({ settings: defaultSettings });
            },
        }),
        {
            name: 'project-maker-settings',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
