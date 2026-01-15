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
                'SELECT * FROM Features WHERE projectId = ? ORDER BY orderIndex ASC',
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
            priority: data.priority || 'medium',
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
                `INSERT INTO Features (id, projectId, title, description, status, priority, complexity, keyPoints, acceptanceCriteria, suggestedTests, dependencies, automationStatus, automationLogs, orderIndex, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, projectId, newFeature.title, newFeature.description, newFeature.status, newFeature.priority, newFeature.estimatedComplexity, dbService.serialize(newFeature.keyPoints), dbService.serialize(newFeature.acceptanceCriteria), dbService.serialize(newFeature.suggestedTests), dbService.serialize(newFeature.dependencies), newFeature.automationStatus, dbService.serialize(newFeature.automationLogs), orderIndex, now, now]
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
                    priority: 'medium',
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
                    `INSERT INTO Features (id, projectId, title, description, status, priority, complexity, keyPoints, acceptanceCriteria, suggestedTests, dependencies, automationStatus, automationLogs, orderIndex, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, projectId, feature.title, feature.description, feature.status, feature.priority, feature.estimatedComplexity, dbService.serialize(feature.keyPoints), dbService.serialize(feature.acceptanceCriteria), dbService.serialize(feature.suggestedTests), dbService.serialize(feature.dependencies), feature.automationStatus, dbService.serialize(feature.automationLogs), currentOrder, now, now]
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
        const state = get();
        const feature = state.features.find(f => f.id === id);
        if (!feature) return;

        try {
            const setClauses: string[] = [];
            const values: any[] = [];

            // Map frontend fields to DB columns
            if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title); }
            if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description); }
            if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }
            if (updates.priority !== undefined) { setClauses.push('priority = ?'); values.push(updates.priority); }
            if (updates.order !== undefined) { setClauses.push('orderIndex = ?'); values.push(updates.order); }
            if (updates.keyPoints !== undefined) { setClauses.push('keyPoints = ?'); values.push(dbService.serialize(updates.keyPoints)); }
            if (updates.acceptanceCriteria !== undefined) { setClauses.push('acceptanceCriteria = ?'); values.push(dbService.serialize(updates.acceptanceCriteria)); }
            if (updates.suggestedTests !== undefined) { setClauses.push('suggestedTests = ?'); values.push(dbService.serialize(updates.suggestedTests)); }
            if (updates.estimatedComplexity !== undefined) { setClauses.push('complexity = ?'); values.push(updates.estimatedComplexity); }
            if (updates.dependencies !== undefined) { setClauses.push('dependencies = ?'); values.push(dbService.serialize(updates.dependencies)); }
            if (updates.automationStatus !== undefined) { setClauses.push('automationStatus = ?'); values.push(updates.automationStatus); }

            if (setClauses.length > 0) {
                setClauses.push('updatedAt = ?');
                values.push(now);
                values.push(id);

                await dbService.execute(
                    `UPDATE Features SET ${setClauses.join(', ')} WHERE id = ?`,
                    values
                );

                set((state) => ({
                    features: state.features.map(f => f.id === id ? { ...f, ...updates, updatedAt: new Date(now) } : f),
                }));
            }
        } catch (error) {
            console.error('Failed to update feature:', error);
            throw error;
        }
    },

    deleteFeature: async (id) => {
        try {
            await dbService.execute('DELETE FROM Features WHERE id = ?', [id]);
            set((state) => ({
                features: state.features.filter(f => f.id !== id),
            }));
        } catch (error) {
            console.error('Failed to delete feature:', error);
            throw error;
        }
    },

    getFeaturesByProject: (projectId) => {
        return get().features.filter(f => f.projectId === projectId);
    },

    getFeaturesByStatus: (projectId, status) => {
        return get().features.filter(f => f.projectId === projectId && f.status === status);
    },

    getFeatureById: (id) => {
        return get().features.find(f => f.id === id);
    },

    moveFeature: async (id, newStatus, newOrderIndex) => {
        const now = new Date().toISOString();
        try {
            await dbService.execute(
                'UPDATE Features SET status = ?, orderIndex = ?, updatedAt = ? WHERE id = ?',
                [newStatus, newOrderIndex ?? 0, now, id]
            );

            set((state) => ({
                features: state.features.map(f =>
                    f.id === id ? { ...f, status: newStatus, order: newOrderIndex ?? f.order, updatedAt: new Date(now) } : f
                ),
            }));
        } catch (error) {
            console.error('Failed to move feature:', error);
            throw error;
        }
    },

    reorderFeatures: async (projectId, status, orderedIds) => {
        const now = new Date().toISOString();
        try {
            // Bulk update order indices
            for (let i = 0; i < orderedIds.length; i++) {
                await dbService.execute(
                    'UPDATE Features SET orderIndex = ?, updatedAt = ? WHERE id = ?',
                    [i, now, orderedIds[i]]
                );
            }

            set((state) => ({
                features: state.features.map(f => {
                    const newIndex = orderedIds.indexOf(f.id);
                    return newIndex !== -1 ? { ...f, order: newIndex, updatedAt: new Date(now) } : f;
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
                'UPDATE Features SET automationStatus = ?, updatedAt = ? WHERE id = ?',
                [status, now, id]
            );
            set((state) => ({
                features: state.features.map(f => f.id === id ? { ...f, automationStatus: status, updatedAt: new Date(now) } : f),
            }));
        } catch (error) {
            console.error('Failed to update automation status:', error);
            throw error;
        }
    },

    addAutomationLog: async (id, step, message, type = 'info') => {
        const now = new Date().toISOString();
        const state = get();
        const feature = state.features.find(f => f.id === id);
        if (!feature) return;

        const newLog = { timestamp: new Date(now), step, message, type };
        const updatedLogs = [...feature.automationLogs, newLog];

        try {
            await dbService.execute(
                'UPDATE Features SET automationLogs = ?, updatedAt = ? WHERE id = ?',
                [dbService.serialize(updatedLogs), now, id]
            );
            set((state) => ({
                features: state.features.map(f => f.id === id ? { ...f, automationLogs: updatedLogs, updatedAt: new Date(now) } : f),
            }));
        } catch (error) {
            console.error('Failed to add automation log:', error);
            throw error;
        }
    },

    clearAutomationLogs: async (id) => {
        const now = new Date().toISOString();
        try {
            await dbService.execute(
                'UPDATE Features SET automationLogs = ?, updatedAt = ? WHERE id = ?',
                [dbService.serialize([]), now, id]
            );
            set((state) => ({
                features: state.features.map(f => f.id === id ? { ...f, automationLogs: [], updatedAt: new Date(now) } : f),
            }));
        } catch (error) {
            console.error('Failed to clear automation logs:', error);
            throw error;
        }
    },

    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    deleteFeaturesByProject: async (projectId) => {
        try {
            await dbService.execute('DELETE FROM Features WHERE projectId = ?', [projectId]);
            set((state) => ({
                features: state.features.filter(f => f.projectId !== projectId),
            }));
        } catch (error) {
            console.error('Failed to delete features by project:', error);
            throw error;
        }
    },
}));
