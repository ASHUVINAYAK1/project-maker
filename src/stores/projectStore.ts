import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Project, ProjectSettings } from '../types';

interface ProjectState {
    projects: Project[];
    activeProjectId: string | null;
    isLoading: boolean;
    error: string | null;
}

interface ProjectActions {
    // Project CRUD
    createProject: (name: string, description: string, path: string, settings?: Partial<ProjectSettings>) => Project;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
    deleteProject: (id: string) => void;

    // Selection
    setActiveProject: (id: string | null) => void;
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

export const useProjectStore = create<ProjectState & ProjectActions>()(
    persist(
        (set, get) => ({
            // State
            projects: [],
            activeProjectId: null,
            isLoading: false,
            error: null,

            // Actions
            createProject: (name, description, path, settings = {}) => {
                const now = new Date();
                const newProject: Project = {
                    id: uuidv4(),
                    name,
                    description,
                    path,
                    createdAt: now,
                    updatedAt: now,
                    settings: { ...defaultSettings, ...settings },
                };

                set((state) => ({
                    projects: [...state.projects, newProject],
                    activeProjectId: newProject.id,
                }));

                return newProject;
            },

            updateProject: (id, updates) => {
                set((state) => ({
                    projects: state.projects.map((project) =>
                        project.id === id
                            ? { ...project, ...updates, updatedAt: new Date() }
                            : project
                    ),
                }));
            },

            deleteProject: (id) => {
                set((state) => ({
                    projects: state.projects.filter((project) => project.id !== id),
                    activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
                }));
            },

            setActiveProject: (id) => {
                set({ activeProjectId: id });
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
        }),
        {
            name: 'project-maker-projects',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                projects: state.projects,
                activeProjectId: state.activeProjectId,
            }),
        }
    )
);
