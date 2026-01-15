/**
 * GenerateFeaturesDialog Component
 * Main dialog for AI-powered feature generation from project description
 */

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Loader2,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Wand2,
    Settings2
} from 'lucide-react';
import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogContent,
    Button,
    Textarea,
    Badge,
} from '../ui';
import { FeaturePreview } from './FeaturePreview';
import { useLLM } from '../../hooks';
import { useProjectStore, useFeatureStore, useSettingsStore } from '../../stores';
import { RECOMMENDED_MODELS } from '../../services/llm';
import { cn } from '../../lib/utils';
import type { LLMGeneratedFeature } from '../../types';

interface GenerateFeaturesDialogProps {
    open: boolean;
    onClose: () => void;
}

type Step = 'input' | 'generating' | 'preview';

export const GenerateFeaturesDialog: React.FC<GenerateFeaturesDialogProps> = ({
    open,
    onClose,
}) => {
    const [step, setStep] = useState<Step>('input');
    const [description, setDescription] = useState('');
    const [generatedFeatures, setGeneratedFeatures] = useState<LLMGeneratedFeature[]>([]);
    const [showModelSelect, setShowModelSelect] = useState(false);

    const activeProject = useProjectStore((state) => state.getActiveProject());
    const createFeaturesFromLLM = useFeatureStore((state) => state.createFeaturesFromLLM);
    const settings = useSettingsStore((state) => state.settings);
    const updateOllamaSettings = useSettingsStore((state) => state.updateOllamaSettings);

    const {
        isGenerating,
        isConnected,
        isCheckingConnection,
        streamedContent,
        error,
        models,
        checkConnection,
        fetchModels,
        generateFeaturesStreaming,
        cancelGeneration,
        clearError,
    } = useLLM();

    // Check connection on mount
    useEffect(() => {
        if (open) {
            checkConnection().then((connected) => {
                if (connected) {
                    fetchModels();
                }
            });
            // Pre-fill with project description
            if (activeProject?.description) {
                setDescription(activeProject.description);
            }
        }
    }, [open, checkConnection, fetchModels, activeProject]);

    // Reset when closing
    useEffect(() => {
        if (!open) {
            setStep('input');
            setGeneratedFeatures([]);
            clearError();
        }
    }, [open, clearError]);

    const handleGenerate = async () => {
        if (!activeProject || !description.trim()) return;

        setStep('generating');
        clearError();

        try {
            const features = await generateFeaturesStreaming(
                activeProject.name,
                description.trim()
            );
            setGeneratedFeatures(features);
            setStep('preview');
        } catch (err) {
            // Stay on generating step to show error
            console.error('Generation failed:', err);
        }
    };

    const handleConfirmFeatures = async () => {
        if (!activeProject || generatedFeatures.length === 0) return;

        await createFeaturesFromLLM(activeProject.id, generatedFeatures);
        onClose();
    };

    const handleRetry = () => {
        clearError();
        setStep('input');
    };

    const handleModelSelect = (modelName: string) => {
        updateOllamaSettings({ model: modelName });
        setShowModelSelect(false);
    };

    const handleClose = () => {
        if (isGenerating) {
            cancelGeneration();
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} className="max-w-2xl">
            <DialogHeader onClose={handleClose}>
                <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Generate Features with AI
                </DialogTitle>
                <DialogDescription>
                    {step === 'input' && 'Describe your project and let AI generate features for you'}
                    {step === 'generating' && 'Generating features...'}
                    {step === 'preview' && 'Review and customize the generated features'}
                </DialogDescription>
            </DialogHeader>

            <DialogContent>
                {/* Connection Status */}
                {step === 'input' && (
                    <ConnectionStatus
                        isConnected={isConnected}
                        isChecking={isCheckingConnection}
                        baseUrl={settings.ollama.baseUrl}
                        model={settings.ollama.model}
                        models={models}
                        showModelSelect={showModelSelect}
                        onShowModelSelect={() => setShowModelSelect(!showModelSelect)}
                        onModelSelect={handleModelSelect}
                        onRetryConnection={checkConnection}
                    />
                )}

                {/* Step: Input */}
                {step === 'input' && (
                    <div className="space-y-4 mt-4">
                        <Textarea
                            label="Project Description"
                            placeholder="Describe what you want to build in detail. Include:
• The purpose of the application
• Key functionality and features
• Target users
• Technology preferences (if any)

Example: A task management app where users can create projects, add tasks with due dates, organize with tags, and track progress with a visual dashboard..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={8}
                            helperText={`${description.length} characters • More detail = better features`}
                        />

                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleGenerate}
                                disabled={!isConnected || !description.trim() || description.length < 50}
                            >
                                <Wand2 className="w-4 h-4" />
                                Generate Features
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step: Generating */}
                {step === 'generating' && (
                    <div className="py-8">
                        {error ? (
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-100 mb-2">Generation Failed</h3>
                                <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">{error}</p>
                                <div className="flex justify-center gap-3">
                                    <Button variant="ghost" onClick={handleClose}>
                                        Cancel
                                    </Button>
                                    <Button variant="primary" onClick={handleRetry}>
                                        <RefreshCw className="w-4 h-4" />
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-100 mb-2">Generating Features</h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Using {settings.ollama.model} to analyze your project...
                                </p>

                                {/* Streaming preview */}
                                {streamedContent && (
                                    <div className="mt-4 max-h-48 overflow-y-auto text-left bg-slate-800/50 rounded-lg p-4">
                                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">
                                            {streamedContent.slice(-500)}
                                        </pre>
                                    </div>
                                )}

                                <Button variant="ghost" onClick={() => { cancelGeneration(); handleClose(); }} className="mt-4">
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Preview */}
                {step === 'preview' && (
                    <FeaturePreview
                        features={generatedFeatures}
                        onFeaturesChange={setGeneratedFeatures}
                        onConfirm={handleConfirmFeatures}
                        onCancel={() => setStep('input')}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

interface ConnectionStatusProps {
    isConnected: boolean;
    isChecking: boolean;
    baseUrl: string;
    model: string;
    models: { name: string }[];
    showModelSelect: boolean;
    onShowModelSelect: () => void;
    onModelSelect: (model: string) => void;
    onRetryConnection: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
    isConnected,
    isChecking,
    baseUrl,
    model,
    models,
    showModelSelect,
    onShowModelSelect,
    onModelSelect,
    onRetryConnection,
}) => {
    return (
        <div className="space-y-3">
            {/* Connection indicator */}
            <div className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                isConnected
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
            )}>
                <div className="flex items-center gap-3">
                    {isChecking ? (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    ) : isConnected ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                        <p className={cn('text-sm font-medium', isConnected ? 'text-green-400' : 'text-red-400')}>
                            {isChecking ? 'Checking connection...' : isConnected ? 'Connected to Ollama' : 'Not connected'}
                        </p>
                        <p className="text-xs text-slate-500">{baseUrl}</p>
                    </div>
                </div>

                {!isConnected && !isChecking && (
                    <Button size="sm" variant="ghost" onClick={onRetryConnection}>
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </Button>
                )}
            </div>

            {/* Model selector */}
            {isConnected && (
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-400">Model:</span>
                        <Badge variant="secondary">{model}</Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={onShowModelSelect}>
                        Change
                    </Button>
                </div>
            )}

            {/* Model dropdown */}
            {showModelSelect && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto">
                    {models.length > 0 ? (
                        models.map((m) => (
                            <button
                                key={m.name}
                                onClick={() => onModelSelect(m.name)}
                                className={cn(
                                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                                    m.name === model
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'text-slate-300 hover:bg-slate-700'
                                )}
                            >
                                {m.name}
                            </button>
                        ))
                    ) : (
                        <div className="px-3 py-4 text-center">
                            <p className="text-sm text-slate-500 mb-2">No models found</p>
                            <p className="text-xs text-slate-600">
                                Pull a model with: <code className="bg-slate-700 px-1 rounded">ollama pull qwen2.5-coder:7b</code>
                            </p>
                        </div>
                    )}

                    {/* Recommended models */}
                    <div className="border-t border-slate-700 mt-2 pt-2">
                        <p className="text-xs text-slate-500 px-3 py-1">Recommended for code:</p>
                        {RECOMMENDED_MODELS.slice(0, 3).map((rec) => (
                            <div key={rec.name} className="px-3 py-1 text-xs text-slate-500">
                                <code>{rec.name}</code> - {rec.description}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Not connected warning */}
            {!isConnected && !isChecking && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-400 mb-2">Ollama Not Running</h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Make sure Ollama is installed and running. You can download it from{' '}
                        <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            ollama.ai
                        </a>
                    </p>
                    <div className="bg-slate-800 rounded p-2">
                        <code className="text-xs text-slate-300">
                            # Start Ollama and pull a model<br />
                            ollama serve<br />
                            ollama pull qwen2.5-coder:7b
                        </code>
                    </div>
                </div>
            )}
        </div>
    );
};
