/**
 * useLLM Hook
 * React hook for LLM-based feature generation with Ollama
 */

import { useState, useCallback, useRef } from 'react';
import {
    ollamaClient,
    FEATURE_GENERATION_SYSTEM_PROMPT,
    generateFeaturePrompt,
    parseFeatureResponse,
    type OllamaModel
} from '../services/llm';
import { useSettingsStore } from '../stores';
import type { LLMGeneratedFeature } from '../types';

export interface UseLLMResult {
    // State
    isGenerating: boolean;
    isConnected: boolean;
    isCheckingConnection: boolean;
    streamedContent: string;
    error: string | null;
    models: OllamaModel[];

    // Actions
    checkConnection: () => Promise<boolean>;
    fetchModels: () => Promise<OllamaModel[]>;
    generateFeatures: (projectName: string, description: string) => Promise<LLMGeneratedFeature[]>;
    generateFeaturesStreaming: (
        projectName: string,
        description: string,
        onProgress?: (content: string) => void
    ) => Promise<LLMGeneratedFeature[]>;
    cancelGeneration: () => void;
    clearError: () => void;
}

export function useLLM(): UseLLMResult {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isCheckingConnection, setIsCheckingConnection] = useState(false);
    const [streamedContent, setStreamedContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [models, setModels] = useState<OllamaModel[]>([]);

    const abortControllerRef = useRef<AbortController | null>(null);
    const settings = useSettingsStore((state) => state.settings);
    const updateOllamaSettings = useSettingsStore((state) => state.updateOllamaSettings);

    /**
     * Check if Ollama server is available
     */
    const checkConnection = useCallback(async (): Promise<boolean> => {
        setIsCheckingConnection(true);
        setError(null);

        try {
            ollamaClient.setBaseUrl(settings.ollama.baseUrl);
            const available = await ollamaClient.isAvailable();
            setIsConnected(available);
            updateOllamaSettings({ isConnected: available });

            if (!available) {
                setError('Cannot connect to Ollama. Make sure Ollama is running on ' + settings.ollama.baseUrl);
            }

            return available;
        } catch (err) {
            setIsConnected(false);
            updateOllamaSettings({ isConnected: false });
            setError('Failed to connect to Ollama server');
            return false;
        } finally {
            setIsCheckingConnection(false);
        }
    }, [settings.ollama.baseUrl, updateOllamaSettings]);

    /**
     * Fetch available models from Ollama
     */
    const fetchModels = useCallback(async (): Promise<OllamaModel[]> => {
        try {
            ollamaClient.setBaseUrl(settings.ollama.baseUrl);
            const modelList = await ollamaClient.listModels();
            setModels(modelList);
            return modelList;
        } catch (err) {
            console.error('Failed to fetch models:', err);
            setError('Failed to fetch models from Ollama');
            return [];
        }
    }, [settings.ollama.baseUrl]);

    /**
     * Generate features (non-streaming)
     */
    const generateFeatures = useCallback(async (
        projectName: string,
        description: string
    ): Promise<LLMGeneratedFeature[]> => {
        setIsGenerating(true);
        setError(null);
        setStreamedContent('');

        try {
            ollamaClient.setBaseUrl(settings.ollama.baseUrl);

            const response = await ollamaClient.generate({
                model: settings.ollama.model,
                system: FEATURE_GENERATION_SYSTEM_PROMPT,
                prompt: generateFeaturePrompt(projectName, description),
                options: {
                    temperature: 0.7,
                    num_predict: 4096,
                },
            });

            const features = parseFeatureResponse(response);
            return features;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate features';
            setError(message);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, [settings.ollama.baseUrl, settings.ollama.model]);

    /**
     * Generate features with streaming for real-time feedback
     */
    const generateFeaturesStreaming = useCallback(async (
        projectName: string,
        description: string,
        onProgress?: (content: string) => void
    ): Promise<LLMGeneratedFeature[]> => {
        setIsGenerating(true);
        setError(null);
        setStreamedContent('');

        abortControllerRef.current = new AbortController();
        let fullContent = '';

        try {
            ollamaClient.setBaseUrl(settings.ollama.baseUrl);

            const stream = ollamaClient.generateStream({
                model: settings.ollama.model,
                system: FEATURE_GENERATION_SYSTEM_PROMPT,
                prompt: generateFeaturePrompt(projectName, description),
                options: {
                    temperature: 0.7,
                    num_predict: 4096,
                },
            });

            for await (const chunk of stream) {
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Generation cancelled');
                }

                fullContent += chunk;
                setStreamedContent(fullContent);
                onProgress?.(fullContent);
            }

            const features = parseFeatureResponse(fullContent);
            return features;
        } catch (err) {
            if (err instanceof Error && err.message === 'Generation cancelled') {
                setError('Generation was cancelled');
            } else {
                const message = err instanceof Error ? err.message : 'Failed to generate features';
                setError(message);
            }
            throw err;
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [settings.ollama.baseUrl, settings.ollama.model]);

    /**
     * Cancel ongoing generation
     */
    const cancelGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isGenerating,
        isConnected,
        isCheckingConnection,
        streamedContent,
        error,
        models,
        checkConnection,
        fetchModels,
        generateFeatures,
        generateFeaturesStreaming,
        cancelGeneration,
        clearError,
    };
}
