import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import dbService from '../lib/db';
import type { Feature, FeatureStatus, LLMGeneratedFeature } from '../types';

interface FeatureState {
    features: Feature[];
    isLoading: boolean;
    error: string | null;
}

interface FeatureActions {
    // Initialization
    init: (projectId: string) => Promise<void>;

    // Feature CRUD
    createFeature: (projectId: string, data: Partial<Feature>) => Promise<Feature>;
    createFeaturesFromLLM: (projectId: string, generated: LLMGeneratedFeature[]) => Promise<Feature[]>;
    updateFeature: (id: string, updates: Partial<Omit<Feature, 'id' | 'projectId' | 'createdAt'>>) => Promise<void>;
    deleteFeature: (id: string) => Promise<void>;

    // Feature queries
    getFeaturesByProject: (projectId: string) => Feature[];
    getFeaturesByStatus: (projectId: string, status: FeatureStatus) => Feature[];
    getFeatureById: (id: string) => Feature | undefined;

    // Status management
    moveFeature: (id: string, newStatus: FeatureStatus, newOrderIndex?: number) => Promise<void>;
    reorderFeatures: (projectId: string, status: FeatureStatus, orderedIds: string[]) => Promise<void>;

    // Automation
    updateAutomationStatus: (id: string, status: Feature['automationStatus']) => Promise<void>;
    addAutomationLog: (id: string, step: string, message: string, type?: 'info' | 'success' | 'error' | 'warning') => Promise<void>;
    clearAutomationLogs: (id: string) => Promise<void>;

    // Loading state
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Bulk operations
    deleteFeaturesByProject: (projectId: string) => Promise<void>;
}

export const useFeatureStore = create<FeatureState & FeatureActions>((set, get) => ({
    // State
    features: [],
    isLoading: false,
    error: null,

    // Actions
    init: async (projectId: string) => {
        set({ isLoading: true });
        try {
            const dbFeatures = await dbService.query<any>(
                'SELECT * FROM features WHERE projectId = ? ORDER BY orderIndex ASC',
                [projectId]
            );

            const features: Feature[] = dbFeatures.map(f => ({
                ...f,
                order: f.orderIndex,
                keyPoints: dbService.deserialize<string[]>(f.keyPoints),
                acceptanceCriteria: dbService.deserialize<string[]>(f.acceptanceCriteria),
                suggestedTests: dbService.deserialize<string[]>(f.suggestedTests),
                dependencies: dbService.deserialize<string[]>(f.dependencies),
                automationLogs: dbService.deserialize<any[]>(f.automationLogs),
                createdAt: new Date(f.createdAt),
                updatedAt: new Date(f.updatedAt),
            }));

            set({ features, isLoading: false });
        } catch (error) {
            console.error('Failed to init feature store:', error);
            set({ error: 'Failed to load features', isLoading: false });
        }
    },

    createFeature: async (projectId, data) => {
        const state = get();
        const maxOrder = Math.max(0, ...state.features.map(f => f.order));

        const now = new Date().toISOString();
        const id = uuidv4();
        const orderIndex = data.order ?? maxOrder + 1;

        const newFeature: Feature = {
            id,
            projectId,
            title: data.title || 'New Feature',
            description: data.description || '',
            status: data.status || 'backlog',
            order: orderIndex,
            keyPoints: data.keyPoints || [],
            acceptanceCriteria: data.acceptanceCriteria || [],
            suggestedTests: data.suggestedTests || [],
            estimatedComplexity: data.estimatedComplexity || 'medium',
            dependencies: data.dependencies || [],
            automationStatus: 'idle',
            automationLogs: [],
            createdAt: new Date(now),
            updatedAt: new Date(now),
        };

        try {
            await dbService.execute(
                `INSERT INTO features (
          id, projectId, title, description, status, priority, complexity, 
          keyPoints, acceptanceCriteria, suggestedTests, dependencies, 
          automationStatus, automationLogs, createdAt, updatedAt, orderIndex
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id, projectId, newFeature.title, newFeature.description, newFeature.status,
                    'medium', // priority default
                    newFeature.estimatedComplexity,
                    dbService.serialize(newFeature.keyPoints),
                    dbService.serialize(newFeature.acceptanceCriteria),
                    dbService.serialize(newFeature.suggestedTests),
                    dbService.serialize(newFeature.dependencies),
                    newFeature.automationStatus,
                    dbService.serialize(newFeature.automationLogs),
                    now, now, orderIndex
                ]
            );

            set((state) => ({
                features: [...state.features, newFeature],
            }));

            return newFeature;
        } catch (error) {
            console.error('Failed to create feature:', error);
            throw error;
        }
    },

    createFeaturesFromLLM: async (projectId, generated) => {
        const state = get();
        let currentOrder = Math.max(0, ...state.features.map(f => f.order));
        const now = new Date().toISOString();
        const newFeatures: Feature[] = [];

        try {
            for (const gen of generated) {
                currentOrder += 1;
                const id = uuidv4();
                const feature: Feature = {
                    id,
                    projectId,
                    title: gen.title,
                    description: gen.description,
                    status: 'backlog',
                    order: currentOrder,
                    keyPoints: gen.keyPoints,
                    acceptanceCriteria: gen.acceptanceCriteria,
                    suggestedTests: gen.suggestedTests,
                    estimatedComplexity: gen.estimatedComplexity,
                    dependencies: gen.dependencies,
                    automationStatus: 'idle',
                    automationLogs: [],
                    createdAt: new Date(now),
                    updatedAt: new Date(now),
                };

                await dbService.execute(
                    `INSERT INTO features (
            id, projectId, title, description, status, priority, complexity, 
            keyPoints, acceptanceCriteria, suggestedTests, dependencies, 
            automationStatus, automationLogs, createdAt, updatedAt, orderIndex
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id, projectId, feature.title, feature.description, feature.status,
                        'medium',
                        feature.estimatedComplexity,
                        dbService.serialize(feature.keyPoints),
                        dbService.serialize(feature.acceptanceCriteria),
                        dbService.serialize(feature.suggestedTests),
                        dbService.serialize(feature.dependencies),
                        feature.automationStatus,
                        dbService.serialize(feature.automationLogs),
                        now, now, currentOrder
                    ]
                );
                newFeatures.push(feature);
            }

            set((state) => ({
                features: [...state.features, ...newFeatures],
            }));

            return newFeatures;
        } catch (error) {
            console.error('Failed to create features from LLM:', error);
            throw error;
        }
    },

    updateFeature: async (id, updates) => {
        const now = new Date().toISOString();

        try {
            const currentFeature = get().features.find(f => f.id === id);
            if (!currentFeature) return;

            const updatedFeature = { ...currentFeature, ...updates, updatedAt: new Date(now) };

            const fields = Object.keys(updates);
            const setClause = fields.map(f => {
                const dbField = f === 'order' ? 'orderIndex' : f;
                return `${dbField} = ?`;
            }).join(', ') + ', updatedAt = ?';

            const values = fields.map(f => {
                const val = (updates as any)[f];
                return typeof val === 'object' ? dbService.serialize(val) : val;
            });
            values.push(now);
            values.push(id);

            await dbService.execute(
                `UPDATE features SET ${setClause} WHERE id = ?`,
                values
            );

            set((state) => ({
                features: state.features.map((f) => f.id === id ? updatedFeature : f),
            }));
        } catch (error) {
            console.error('Failed to update feature:', error);
            throw error;
        }
    },

    deleteFeature: async (id) => {
        try {
            await dbService.execute('DELETE FROM features WHERE id = ?', [id]);
            set((state) => ({
                features: state.features.filter((f) => f.id !== id),
            }));
        } catch (error) {
            console.error('Failed to delete feature:', error);
            throw error;
        }
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

    moveFeature: async (id, newStatus, newOrderIndex) => {
        try {
            const state = get();
            const feature = state.features.find((f) => f.id === id);
            if (!feature) return;

            const now = new Date().toISOString();
            const orderIndex = newOrderIndex ?? (state.features
                .filter(f => f.projectId === feature.projectId && f.status === newStatus).length);

            await dbService.execute(
                'UPDATE features SET status = ?, orderIndex = ?, updatedAt = ? WHERE id = ?',
                [newStatus, orderIndex, now, id]
            );

            set((state) => ({
                features: state.features.map((f) =>
                    f.id === id ? { ...f, status: newStatus, order: orderIndex, updatedAt: new Date(now) } : f
                ),
            }));
        } catch (error) {
            console.error('Failed to move feature:', error);
            throw error;
        }
    },

    reorderFeatures: async (projectId, status, orderedIds) => {
        try {
            const now = new Date().toISOString();

            // We perform updates in a loop for simplicity, in a real app would use a transaction
            for (let i = 0; i < orderedIds.length; i++) {
                await dbService.execute(
                    'UPDATE features SET orderIndex = ?, updatedAt = ? WHERE id = ?',
                    [i, now, orderedIds[i]]
                );
            }

            set((state) => ({
                features: state.features.map((f) => {
                    if (f.projectId !== projectId || f.status !== status) return f;
                    const newOrder = orderedIds.indexOf(f.id);
                    if (newOrder === -1) return f;
                    return { ...f, order: newOrder, updatedAt: new Date(now) };
                }),
            }));
        } catch (error) {
            console.error('Failed to reorder features:', error);
            throw error;
        }
    },

    updateAutomationStatus: async (id, status) => {
        const now = new Date().toISOString();
        try {
            await dbService.execute(
                'UPDATE features SET automationStatus = ?, updatedAt = ? WHERE id = ?',
                [status, now, id]
            );
            set((state) => ({
                features: state.features.map((f) =>
                    f.id === id ? { ...f, automationStatus: status, updatedAt: new Date(now) } : f
                ),
            }));
        } catch (error) {
            console.error('Failed to update automation status:', error);
        }
    },

    addAutomationLog: async (id, step, message, type = 'info') => {
        const now = new Date();
        const nowIso = now.toISOString();

        try {
            const feature = get().features.find(f => f.id === id);
            if (!feature) return;

            const newLog = { timestamp: now, step, message, type };
            const updatedLogs = [...feature.automationLogs, newLog];

            await dbService.execute(
                'UPDATE features SET automationLogs = ?, updatedAt = ? WHERE id = ?',
                [dbService.serialize(updatedLogs), nowIso, id]
            );

            set((state) => ({
                features: state.features.map((f) =>
                    f.id === id ? { ...f, automationLogs: updatedLogs, updatedAt: now } : f
                ),
            }));
        } catch (error) {
            console.error('Failed to add automation log:', error);
        }
    },

    clearAutomationLogs: async (id) => {
        const now = new Date().toISOString();
        try {
            await dbService.execute(
                'UPDATE features SET automationLogs = "[]", updatedAt = ? WHERE id = ?',
                [now, id]
            );
            set((state) => ({
                features: state.features.map((f) =>
                    f.id === id ? { ...f, automationLogs: [], updatedAt: new Date(now) } : f
                ),
            }));
        } catch (error) {
            console.error('Failed to clear automation logs:', error);
        }
    },

    setLoading: (loading) => {
        set({ isLoading: loading });
    },

    setError: (error) => {
        set({ error });
    },

    deleteFeaturesByProject: async (projectId) => {
        try {
            await dbService.execute('DELETE FROM features WHERE projectId = ?', [projectId]);
            set((state) => ({
                features: state.features.filter((f) => f.projectId !== projectId),
            }));
        } catch (error) {
            console.error('Failed to delete features by project:', error);
        }
    },
}));
