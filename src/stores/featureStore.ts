import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Feature, FeatureStatus, LLMGeneratedFeature } from '../types';

interface FeatureState {
    features: Feature[];
    isLoading: boolean;
    error: string | null;
}

interface FeatureActions {
    // Feature CRUD
    createFeature: (projectId: string, data: Partial<Feature>) => Feature;
    createFeaturesFromLLM: (projectId: string, generated: LLMGeneratedFeature[]) => Feature[];
    updateFeature: (id: string, updates: Partial<Omit<Feature, 'id' | 'projectId' | 'createdAt'>>) => void;
    deleteFeature: (id: string) => void;

    // Feature queries
    getFeaturesByProject: (projectId: string) => Feature[];
    getFeaturesByStatus: (projectId: string, status: FeatureStatus) => Feature[];
    getFeatureById: (id: string) => Feature | undefined;

    // Status management
    moveFeature: (id: string, newStatus: FeatureStatus, newOrder?: number) => void;
    reorderFeatures: (projectId: string, status: FeatureStatus, orderedIds: string[]) => void;

    // Automation
    updateAutomationStatus: (id: string, status: Feature['automationStatus']) => void;
    addAutomationLog: (id: string, step: string, message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
    clearAutomationLogs: (id: string) => void;

    // Loading state
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Bulk operations
    deleteFeaturesByProject: (projectId: string) => void;
}

export const useFeatureStore = create<FeatureState & FeatureActions>()(
    persist(
        (set, get) => ({
            // State
            features: [],
            isLoading: false,
            error: null,

            // Actions
            createFeature: (projectId, data) => {
                const state = get();
                const projectFeatures = state.features.filter(f => f.projectId === projectId);
                const maxOrder = Math.max(0, ...projectFeatures.map(f => f.order));

                const now = new Date();
                const newFeature: Feature = {
                    id: uuidv4(),
                    projectId,
                    title: data.title || 'New Feature',
                    description: data.description || '',
                    status: data.status || 'backlog',
                    order: data.order ?? maxOrder + 1,
                    keyPoints: data.keyPoints || [],
                    acceptanceCriteria: data.acceptanceCriteria || [],
                    suggestedTests: data.suggestedTests || [],
                    estimatedComplexity: data.estimatedComplexity || 'medium',
                    dependencies: data.dependencies || [],
                    automationStatus: 'idle',
                    automationLogs: [],
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    features: [...state.features, newFeature],
                }));

                return newFeature;
            },

            createFeaturesFromLLM: (projectId, generated) => {
                const state = get();
                const projectFeatures = state.features.filter(f => f.projectId === projectId);
                let currentOrder = Math.max(0, ...projectFeatures.map(f => f.order));

                const now = new Date();
                const newFeatures: Feature[] = generated.map((gen) => {
                    currentOrder += 1;
                    return {
                        id: uuidv4(),
                        projectId,
                        title: gen.title,
                        description: gen.description,
                        status: 'backlog' as FeatureStatus,
                        order: currentOrder,
                        keyPoints: gen.keyPoints,
                        acceptanceCriteria: gen.acceptanceCriteria,
                        suggestedTests: gen.suggestedTests,
                        estimatedComplexity: gen.estimatedComplexity,
                        dependencies: gen.dependencies,
                        automationStatus: 'idle' as const,
                        automationLogs: [],
                        createdAt: now,
                        updatedAt: now,
                    };
                });

                set((state) => ({
                    features: [...state.features, ...newFeatures],
                }));

                return newFeatures;
            },

            updateFeature: (id, updates) => {
                set((state) => ({
                    features: state.features.map((feature) =>
                        feature.id === id
                            ? { ...feature, ...updates, updatedAt: new Date() }
                            : feature
                    ),
                }));
            },

            deleteFeature: (id) => {
                set((state) => ({
                    features: state.features.filter((feature) => feature.id !== id),
                }));
            },

            getFeaturesByProject: (projectId) => {
                return get().features
                    .filter((f) => f.projectId === projectId)
                    .sort((a, b) => a.order - b.order);
            },

            getFeaturesByStatus: (projectId, status) => {
                return get().features
                    .filter((f) => f.projectId === projectId && f.status === status)
                    .sort((a, b) => a.order - b.order);
            },

            getFeatureById: (id) => {
                return get().features.find((f) => f.id === id);
            },

            moveFeature: (id, newStatus, newOrder) => {
                set((state) => {
                    const feature = state.features.find((f) => f.id === id);
                    if (!feature) return state;

                    // Get features in the target column
                    const targetFeatures = state.features
                        .filter((f) => f.projectId === feature.projectId && f.status === newStatus && f.id !== id)
                        .sort((a, b) => a.order - b.order);

                    // Calculate new order if not provided
                    const order = newOrder ?? (targetFeatures.length > 0
                        ? Math.max(...targetFeatures.map(f => f.order)) + 1
                        : 0);

                    return {
                        features: state.features.map((f) =>
                            f.id === id
                                ? { ...f, status: newStatus, order, updatedAt: new Date() }
                                : f
                        ),
                    };
                });
            },

            reorderFeatures: (projectId, status, orderedIds) => {
                set((state) => ({
                    features: state.features.map((feature) => {
                        if (feature.projectId !== projectId || feature.status !== status) {
                            return feature;
                        }
                        const newOrder = orderedIds.indexOf(feature.id);
                        if (newOrder === -1) return feature;
                        return { ...feature, order: newOrder, updatedAt: new Date() };
                    }),
                }));
            },

            updateAutomationStatus: (id, status) => {
                set((state) => ({
                    features: state.features.map((feature) =>
                        feature.id === id
                            ? { ...feature, automationStatus: status, updatedAt: new Date() }
                            : feature
                    ),
                }));
            },

            addAutomationLog: (id, step, message, type = 'info') => {
                set((state) => ({
                    features: state.features.map((feature) =>
                        feature.id === id
                            ? {
                                ...feature,
                                automationLogs: [
                                    ...feature.automationLogs,
                                    { timestamp: new Date(), step, message, type },
                                ],
                                updatedAt: new Date(),
                            }
                            : feature
                    ),
                }));
            },

            clearAutomationLogs: (id) => {
                set((state) => ({
                    features: state.features.map((feature) =>
                        feature.id === id
                            ? { ...feature, automationLogs: [], updatedAt: new Date() }
                            : feature
                    ),
                }));
            },

            setLoading: (loading) => {
                set({ isLoading: loading });
            },

            setError: (error) => {
                set({ error });
            },

            deleteFeaturesByProject: (projectId) => {
                set((state) => ({
                    features: state.features.filter((f) => f.projectId !== projectId),
                }));
            },
        }),
        {
            name: 'project-maker-features',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                features: state.features,
            }),
        }
    )
);
