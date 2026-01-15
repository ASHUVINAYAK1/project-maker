import React from 'react';
import {
    Play,
    Square,
    RefreshCw,
    Sparkles,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '../ui';
import { useProjectStore } from '../../stores';

interface HeaderProps {
    onGenerateFeatures?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGenerateFeatures }) => {
    const activeProject = useProjectStore((state) => state.getActiveProject());

    if (!activeProject) {
        return (
            <header className="h-16 flex items-center justify-center border-b border-slate-800 bg-slate-900/50">
                <p className="text-slate-500">Select or create a project to get started</p>
            </header>
        );
    }

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            {/* Project Info */}
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="font-semibold text-lg text-slate-100">{activeProject.name}</h1>
                    <p className="text-xs text-slate-500 max-w-md truncate">{activeProject.description}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onGenerateFeatures}
                    className="gap-2"
                >
                    <Sparkles size={16} />
                    Generate Features
                </Button>

                <div className="h-6 w-px bg-slate-700 mx-2" />

                <Button variant="ghost" size="icon" title="Run All">
                    <Play size={18} />
                </Button>

                <Button variant="ghost" size="icon" title="Stop All">
                    <Square size={18} />
                </Button>

                <Button variant="ghost" size="icon" title="Refresh">
                    <RefreshCw size={18} />
                </Button>

                <Button variant="ghost" size="icon" title="More Options">
                    <MoreHorizontal size={18} />
                </Button>
            </div>
        </header>
    );
};
