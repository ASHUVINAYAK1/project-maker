/**
 * SettingsDialog Component
 * Application settings including Ollama configuration, theme, and GitHub
 */

import React, { useState, useEffect } from 'react';
import {
    Settings,
    Cpu,
    Github,
    Palette,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ExternalLink
} from 'lucide-react';
import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogContent,
    DialogFooter,
    Button,
    Input,
} from '../ui';
import { useSettingsStore } from '../../stores';
import { useLLM } from '../../hooks';
import { cn } from '../../lib/utils';

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

type Tab = 'ollama' | 'github' | 'appearance';

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('ollama');
    const settings = useSettingsStore((state) => state.settings);
    const updateOllamaSettings = useSettingsStore((state) => state.updateOllamaSettings);
    const setTheme = useSettingsStore((state) => state.setTheme);

    const {
        isConnected,
        isCheckingConnection,
        models,
        checkConnection,
        fetchModels,
    } = useLLM();

    // Local state for form fields
    const [ollamaUrl, setOllamaUrl] = useState(settings.ollama.baseUrl);
    const [selectedModel, setSelectedModel] = useState(settings.ollama.model);

    // Sync with settings when dialog opens
    useEffect(() => {
        if (open) {
            setOllamaUrl(settings.ollama.baseUrl);
            setSelectedModel(settings.ollama.model);
            checkConnection().then((connected) => {
                if (connected) fetchModels();
            });
        }
    }, [open, settings.ollama.baseUrl, settings.ollama.model, checkConnection, fetchModels]);

    const handleSaveOllama = () => {
        updateOllamaSettings({
            baseUrl: ollamaUrl,
            model: selectedModel,
        });
    };

    const handleTestConnection = async () => {
        updateOllamaSettings({ baseUrl: ollamaUrl });
        const connected = await checkConnection();
        if (connected) {
            fetchModels();
        }
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'ollama', label: 'Ollama LLM', icon: <Cpu className="w-4 h-4" /> },
        { id: 'github', label: 'GitHub', icon: <Github className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    ];

    return (
        <Dialog open={open} onClose={onClose} className="max-w-2xl">
            <DialogHeader onClose={onClose}>
                <DialogTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Settings
                </DialogTitle>
                <DialogDescription>
                    Configure your Project Maker preferences
                </DialogDescription>
            </DialogHeader>

            <DialogContent>
                <div className="flex gap-6">
                    {/* Tabs */}
                    <div className="w-48 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                    activeTab === tab.id
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-[300px]">
                        {activeTab === 'ollama' && (
                            <OllamaSettings
                                url={ollamaUrl}
                                model={selectedModel}
                                models={models}
                                isConnected={isConnected}
                                isChecking={isCheckingConnection}
                                onUrlChange={setOllamaUrl}
                                onModelChange={setSelectedModel}
                                onTestConnection={handleTestConnection}
                                onSave={handleSaveOllama}
                            />
                        )}

                        {activeTab === 'github' && (
                            <GitHubSettings />
                        )}

                        {activeTab === 'appearance' && (
                            <AppearanceSettings
                                theme={settings.theme}
                                onThemeChange={setTheme}
                            />
                        )}
                    </div>
                </div>
            </DialogContent>

            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

interface OllamaSettingsProps {
    url: string;
    model: string;
    models: { name: string }[];
    isConnected: boolean;
    isChecking: boolean;
    onUrlChange: (url: string) => void;
    onModelChange: (model: string) => void;
    onTestConnection: () => void;
    onSave: () => void;
}

const OllamaSettings: React.FC<OllamaSettingsProps> = ({
    url,
    model,
    models,
    isConnected,
    isChecking,
    onUrlChange,
    onModelChange,
    onTestConnection,
    onSave,
}) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-medium text-slate-200 mb-4">Ollama Configuration</h3>

                {/* Connection Status */}
                <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border mb-4',
                    isConnected
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-slate-800/50 border-slate-700'
                )}>
                    {isChecking ? (
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    ) : isConnected ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-slate-500" />
                    )}
                    <div className="flex-1">
                        <p className={cn('text-sm font-medium', isConnected ? 'text-green-400' : 'text-slate-400')}>
                            {isChecking ? 'Testing connection...' : isConnected ? 'Connected' : 'Not connected'}
                        </p>
                        {isConnected && models.length > 0 && (
                            <p className="text-xs text-slate-500">{models.length} models available</p>
                        )}
                    </div>
                </div>

                {/* URL Input */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Ollama Server URL
                        </label>
                        <div className="flex gap-2">
                            <Input
                                value={url}
                                onChange={(e) => onUrlChange(e.target.value)}
                                placeholder="http://localhost:11434"
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={onTestConnection} disabled={isChecking}>
                                {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Test
                            </Button>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Default Model
                        </label>
                        {models.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {models.map((m) => (
                                    <button
                                        key={m.name}
                                        onClick={() => onModelChange(m.name)}
                                        className={cn(
                                            'px-3 py-2 rounded-lg text-sm text-left transition-all',
                                            m.name === model
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                                        )}
                                    >
                                        {m.name}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                <p className="text-sm text-slate-400 mb-2">No models installed</p>
                                <code className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                    ollama pull qwen2.5-coder:7b
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant="primary" onClick={onSave}>
                    Save Changes
                </Button>
            </div>
        </div>
    );
};

const GitHubSettings: React.FC = () => {
    const settings = useSettingsStore((state) => state.settings);
    const [token, setToken] = useState('');

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-medium text-slate-200 mb-4">GitHub Integration</h3>

                {/* Status */}
                <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border mb-4',
                    settings.github.isConnected
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-slate-800/50 border-slate-700'
                )}>
                    {settings.github.isConnected ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-slate-500" />
                    )}
                    <div className="flex-1">
                        <p className={cn('text-sm font-medium', settings.github.isConnected ? 'text-green-400' : 'text-slate-400')}>
                            {settings.github.isConnected ? `Connected as ${settings.github.username}` : 'Not connected'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Input
                        label="Personal Access Token"
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx"
                        helperText="Required for creating pull requests automatically"
                    />

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ExternalLink className="w-3 h-3" />
                        <a
                            href="https://github.com/settings/tokens/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 transition-colors"
                        >
                            Create a new token with repo scope
                        </a>
                    </div>
                </div>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-400 font-medium mb-1">Coming Soon</p>
                <p className="text-xs text-slate-400">
                    GitHub integration will be available in a future update. This will enable automatic PR creation when features are completed.
                </p>
            </div>
        </div>
    );
};

interface AppearanceSettingsProps {
    theme: 'light' | 'dark' | 'system';
    onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ theme, onThemeChange }) => {
    const themes: { id: 'light' | 'dark' | 'system'; label: string; description: string }[] = [
        { id: 'dark', label: 'Dark', description: 'Easy on the eyes, great for coding' },
        { id: 'light', label: 'Light', description: 'Classic light appearance' },
        { id: 'system', label: 'System', description: 'Follow your OS preferences' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-medium text-slate-200 mb-4">Appearance</h3>

                <div className="space-y-2">
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onThemeChange(t.id)}
                            className={cn(
                                'w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all',
                                theme === t.id
                                    ? 'bg-blue-500/10 border-blue-500/30'
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            )}
                        >
                            <div className={cn(
                                'w-4 h-4 rounded-full border-2',
                                theme === t.id
                                    ? 'border-blue-400 bg-blue-400'
                                    : 'border-slate-600'
                            )}>
                                {theme === t.id && (
                                    <div className="w-full h-full rounded-full bg-blue-400" />
                                )}
                            </div>
                            <div>
                                <p className={cn('text-sm font-medium', theme === t.id ? 'text-blue-400' : 'text-slate-200')}>
                                    {t.label}
                                </p>
                                <p className="text-xs text-slate-500">{t.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
