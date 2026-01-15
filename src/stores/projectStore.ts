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
            const dbProjects = await dbService.query<any>('SELECT * FROM projects ORDER BY updatedAt DESC');

            const projects: Project[] = dbProjects.map(p => ({
                ...p,
                settings: dbService.deserialize<ProjectSettings>(p.settings),
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt),
            }));

            // Get active project from settings table or use the first one
            const activeSettings = await dbService.query<any>('SELECT value FROM settings WHERE id = "activeProjectId"');
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

        const newProject: Project = {
            id,
            name,
            description,
            path,
            createdAt: new Date(now),
            updatedAt: new Date(now),
            settings: projectSettings,
        };

        try {
            console.log(`[ProjectStore] Attempting database insert for project: ${id}`);
            await dbService.execute(
                `INSERT INTO projects (id, name, path, description, settings, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, name, path, description, dbService.serialize(projectSettings), now, now]
            );
            console.log('[ProjectStore] Database insert successful.');

            set((state) => ({
                projects: [newProject, ...state.projects],
                activeProjectId: newProject.id,
            }));

            // Save active project id
            console.log('[ProjectStore] Updating activeProjectId in settings...');
            await dbService.execute(
                'INSERT OR REPLACE INTO settings (id, value) VALUES ("activeProjectId", ?)',
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
            const setClause = fields.map(f => `${f} = ?`).join(', ') + ', updatedAt = ?';
            const values = fields.map(f => {
                const val = (updates as any)[f];
                return typeof val === 'object' ? dbService.serialize(val) : val;
            });
            values.push(now);
            values.push(id);

            await dbService.execute(
                `UPDATE projects SET ${setClause} WHERE id = ?`,
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
            await dbService.execute('DELETE FROM projects WHERE id = ?', [id]);
            // Cascading delete is handled by SQLite FOREIGN KEY if enabled, 
            // but we should also clean up features manually to be sure
            await dbService.execute('DELETE FROM features WHERE projectId = ?', [id]);

            set((state) => {
                const newProjects = state.projects.filter((project) => project.id !== id);
                const nextActiveId = state.activeProjectId === id ? (newProjects[0]?.id || null) : state.activeProjectId;

                // Save next active project id
                dbService.execute(
                    'INSERT OR REPLACE INTO settings (id, value) VALUES ("activeProjectId", ?)',
                    [JSON.stringify(nextActiveId)]
                ).catch(err => console.error('Failed to update active project after delete:', err));

                return {
                    projects: newProjects,
                    activeProjectId: nextActiveId,
                };
            });
        } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
        }
    },

    setActiveProject: async (id) => {
        try {
            await dbService.execute(
                'INSERT OR REPLACE INTO settings (id, value) VALUES ("activeProjectId", ?)',
                [JSON.stringify(id)]
            );
            set({ activeProjectId: id });
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
