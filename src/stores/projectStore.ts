import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import dbService from '../lib/db';
import type { Project, ProjectSettings } from '../types';

interface ProjectState {
    projects: Project[];
    activeProjectId: string | null;
    isLoading: boolean;
    error: string | null;
}

interface ProjectActions {
    // Initialization
    init: () => Promise<void>;

    // Project CRUD
    createProject: (name: string, description: string, path: string, settings?: Partial<ProjectSettings>) => Promise<Project>;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;

    // Selection
    setActiveProject: (id: string | null) => Promise<void>;
    getActiveProject: () => Project | null;

    // Loading state
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

const defaultSettings: ProjectSettings = {
    defaultCLI: 'claude',
    autoRunTests: true,
    autoCreatePR: true,
};

export const useProjectStore = create<ProjectState & ProjectActions>((set, get) => ({
    // State
    projects: [],
    activeProjectId: null,
    isLoading: false,
    error: null,

    // Actions
    init: async () => {
        set({ isLoading: true });
        try {
            const dbProjects = await dbService.query<any>('SELECT * FROM Projects ORDER BY updatedAt DESC');

            const projects: Project[] = dbProjects.map(p => ({
                ...p,
                settings: dbService.deserialize<ProjectSettings>(p.settings),
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt),
            }));

            // Get active project from Settings table or use the first one
            const activeSettings = await dbService.query<any>("SELECT value FROM Settings WHERE id = 'activeProjectId'");
            const activeProjectId = activeSettings.length > 0 ? JSON.parse(activeSettings[0].value) : (projects[0]?.id || null);

            set({ projects, activeProjectId, isLoading: false });
        } catch (error) {
            console.error('Failed to init project store:', error);
            set({ error: 'Failed to load projects', isLoading: false });
        }
    },

    createProject: async (name, description, path, settings = {}) => {
        console.log('[ProjectStore] Creating project:', { name, description, path, settings });
        const now = new Date().toISOString();
        const id = uuidv4();
        const projectSettings = { ...defaultSettings, ...settings };

        const tenantId = dbService.getTenantId();
        const userId = dbService.getUserId();

        // Check if project with same path already exists
        const existing = get().projects.find(p => p.path === path);
        if (existing) {
            console.warn('[ProjectStore] Project with path already exists:', path);
            set({ activeProjectId: existing.id });
            return existing;
        }

        const newProject: Project = {
            id,
            name,
            description,
            path,
            tenantId,
            userId,
            createdAt: new Date(now),
            updatedAt: new Date(now),
            settings: projectSettings,
        };

        try {
            console.log(`[ProjectStore] Attempting database insert for project: ${id}`);
            const tenantId = dbService.getTenantId();
            const userId = dbService.getUserId();

            await dbService.execute(
                `INSERT INTO Projects (id, name, path, description, settings, tenantId, userId, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, name, path, description, dbService.serialize(projectSettings), tenantId, userId, now, now]
            );
            console.log('[ProjectStore] Database insert successful.');

            set((state) => ({
                projects: [newProject, ...state.projects],
                activeProjectId: newProject.id,
            }));

            // Save active project id
            console.log('[ProjectStore] Updating activeProjectId in settings...');
            try {
                await dbService.execute("DELETE FROM Settings WHERE id = 'activeProjectId'");
            } catch (e) { /* ignore if doesn't exist */ }

            await dbService.execute(
                "INSERT INTO Settings (id, value) VALUES ('activeProjectId', ?)",
                [JSON.stringify(id)]
            );
            console.log('[ProjectStore] Active project updated.');

            return newProject;
        } catch (error) {
            console.error('[ProjectStore] CRITICAL: Failed to create project:', error);
            throw error;
        }
    },

    updateProject: async (id, updates) => {
        const now = new Date().toISOString();

        try {
            // Get current project to merge settings
            const currentProject = get().projects.find(p => p.id === id);
            if (!currentProject) return;

            const updatedProject = { ...currentProject, ...updates, updatedAt: new Date(now) };

            // Generate SQL dynamically based on updates
            const fields = Object.keys(updates);
            if (fields.length === 0) return;

            const setClause = fields.map(f => `${f} = ?`).join(', ') + ', updatedAt = ?';
            const values = fields.map(f => {
                const val = (updates as any)[f];
                return typeof val === 'object' ? dbService.serialize(val) : val;
            });
            values.push(now);
            values.push(id);

            await dbService.execute(
                `UPDATE Projects SET ${setClause} WHERE id = ?`,
                values
            );

            set((state) => ({
                projects: state.projects.map((project) =>
                    project.id === id ? updatedProject : project
                ),
            }));
        } catch (error) {
            console.error('Failed to update project:', error);
            throw error;
        }
    },

    deleteProject: async (id) => {
        try {
            await dbService.execute("DELETE FROM Projects WHERE id = ?", [id]);
            // Cascading delete is handled by SQL Server if ON DELETE CASCADE is set,
            // but we'll be explicit for now.
            await dbService.execute("DELETE FROM Features WHERE projectId = ?", [id]);

            const state = get();
            const newProjects = state.projects.filter((project) => project.id !== id);
            const nextActiveId = state.activeProjectId === id ? (newProjects[0]?.id || null) : state.activeProjectId;

            // Save next active project id
            try {
                await dbService.execute("DELETE FROM Settings WHERE id = 'activeProjectId'");
                if (nextActiveId) {
                    await dbService.execute(
                        "INSERT INTO Settings (id, value) VALUES ('activeProjectId', ?)",
                        [JSON.stringify(nextActiveId)]
                    );
                }
            } catch (err) {
                console.error('Failed to update active project after delete:', err);
            }

            set({
                projects: newProjects,
                activeProjectId: nextActiveId,
            });
        } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
        }
    },

    setActiveProject: async (id) => {
        console.log('[ProjectStore] Setting active project:', id);

        // Optimistic update: Update state immediately for instant UI feedback
        set({ activeProjectId: id });

        try {
            // Run DB persistence in the background
            (async () => {
                try {
                    await dbService.execute("DELETE FROM Settings WHERE id = 'activeProjectId'");
                    if (id) {
                        await dbService.execute(
                            "INSERT INTO Settings (id, value) VALUES ('activeProjectId', ?)",
                            [JSON.stringify(id)]
                        );
                    }
                } catch (dbError) {
                    console.error('[ProjectStore] Background DB update failed:', dbError);
                }
            })();

            console.log('[ProjectStore] Active project switched in UI.');
        } catch (error) {
            console.error('Failed to set active project:', error);
        }
    },

    getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId) || null;
    },

    setLoading: (loading) => {
        set({ isLoading: loading });
    },

    setError: (error) => {
        set({ error });
    },
}));
