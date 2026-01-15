import React from 'react';
import {
    FolderKanban,
    Plus,
    Settings,
    Github,
    Cpu,
    ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProjectStore, useSettingsStore } from '../../stores';
import type { Project } from '../../types';

interface SidebarProps {
    onCreateProject: () => void;
    onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCreateProject, onOpenSettings }) => {
    const { projects, activeProjectId, setActiveProject } = useProjectStore();
    const settings = useSettingsStore((state) => state.settings);

    return (
        <aside className="w-72 flex flex-col h-full bg-slate-950 border-r border-slate-800">
            {/* Logo */}
            <div className="p-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20">
                        <FolderKanban size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-slate-100">Project Maker</h1>
                        <p className="text-xs text-slate-500">AI-Powered Development</p>
                    </div>
                </div>
            </div>

            {/* Projects Section */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Projects
                    </h2>
                    <button
                        onClick={onCreateProject}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                        title="Create Project"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
                            <FolderKanban size={24} className="text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-500 mb-3">No projects yet</p>
                        <button
                            onClick={onCreateProject}
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Create your first project
                        </button>
                    </div>
                ) : (
                    <nav className="space-y-1">
                        {projects.map((project) => (
                            <ProjectItem
                                key={project.id}
                                project={project}
                                isActive={project.id === activeProjectId}
                                onClick={() => setActiveProject(project.id)}
                            />
                        ))}
                    </nav>
                )}
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-slate-800 space-y-1">
                <SidebarButton
                    icon={<Cpu size={18} />}
                    label="Ollama Status"
                    badge={settings.ollama.isConnected ? "Connected" : "Disconnected"}
                    badgeColor={settings.ollama.isConnected ? "green" : "red"}
                />
                <SidebarButton
                    icon={<Github size={18} />}
                    label="GitHub"
                    badge={settings.github.isConnected ? "Connected" : "Not connected"}
                    badgeColor={settings.github.isConnected ? "green" : "gray"}
                />
                <SidebarButton icon={<Settings size={18} />} label="Settings" onClick={onOpenSettings} />
            </div>
        </aside>
    );
};

interface ProjectItemProps {
    project: Project;
    isActive: boolean;
    onClick: () => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({ project, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                `
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        text-left transition-all duration-200
        group
        `,
                isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            )}
        >
            <div
                className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors',
                    isActive
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300'
                )}
            >
                {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{project.name}</p>
                <p className="text-xs text-slate-500 truncate">{project.path}</p>
            </div>
            <ChevronRight
                size={16}
                className={cn(
                    'transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                )}
            />
        </button>
    );
};

interface SidebarButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    badge?: string;
    badgeColor?: 'green' | 'gray' | 'red' | 'blue';
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon, label, onClick, badge, badgeColor = 'gray' }) => {
    const colors = {
        green: 'bg-green-500/20 text-green-400',
        gray: 'bg-slate-700 text-slate-400',
        red: 'bg-red-500/20 text-red-400',
        blue: 'bg-blue-500/20 text-blue-400',
    };

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
            {icon}
            <span className="flex-1 text-sm text-left">{label}</span>
            {badge && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full', colors[badgeColor])}>
                    {badge}
                </span>
            )}
        </button>
    );
};
