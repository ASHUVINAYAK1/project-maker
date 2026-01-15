// Project-related types
export interface ProjectSettings {
    defaultCLI: 'claude' | 'gemini' | 'aider' | 'forgecode';
    autoRunTests: boolean;
    autoCreatePR: boolean;
    buildCommand?: string;
    testCommand?: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    settings: ProjectSettings;
}

// Feature-related types
export type FeatureStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type FeatureComplexity = 'low' | 'medium' | 'high';
export type AutomationStatus = 'idle' | 'running' | 'success' | 'failed';

export interface AutomationLog {
    timestamp: Date;
    step: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export interface Feature {
    id: string;
    projectId: string;
    title: string;
    description: string;
    status: FeatureStatus;
    order: number;
    keyPoints: string[];
    acceptanceCriteria: string[];
    suggestedTests: string[];
    estimatedComplexity: FeatureComplexity;
    dependencies: string[];
    branchName?: string;
    prUrl?: string;
    automationStatus: AutomationStatus;
    automationLogs: AutomationLog[];
    createdAt: Date;
    updatedAt: Date;
}

// Kanban board types
export interface KanbanColumn {
    id: FeatureStatus;
    title: string;
    color: string;
    features: Feature[];
}

// LLM-related types
export interface LLMGeneratedFeature {
    title: string;
    description: string;
    keyPoints: string[];
    acceptanceCriteria: string[];
    suggestedTests: string[];
    estimatedComplexity: FeatureComplexity;
    dependencies: string[];
}

export interface LLMResponse {
    features: LLMGeneratedFeature[];
}

// Settings types
export interface OllamaSettings {
    baseUrl: string;
    model: string;
    isConnected: boolean;
}

export interface GitHubSettings {
    token?: string;
    username?: string;
    isConnected: boolean;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    ollama: OllamaSettings;
    github: GitHubSettings;
    defaultProjectPath: string;
}

// Terminal types
export interface TerminalLine {
    id: string;
    content: string;
    type: 'stdout' | 'stderr' | 'system';
    timestamp: Date;
}

// Template types
export interface ProjectTemplate {
    id: string;
    name: string;
    category: 'frontend' | 'backend' | 'fullstack' | 'mobile';
    description: string;
    command: string;
    icon: string;
}
