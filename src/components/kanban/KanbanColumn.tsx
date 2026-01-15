import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FeatureCard } from './FeatureCard';
import type { Feature, FeatureStatus } from '../../types';

interface KanbanColumnProps {
    id: FeatureStatus;
    title: string;
    features: Feature[];
    color: string;
    onAddFeature?: () => void;
    onEditFeature?: (feature: Feature) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
    id,
    title,
    features,
    color,
    onAddFeature,
    onEditFeature,
}) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    const colorClasses: Record<string, string> = {
        slate: 'from-slate-500/20 to-slate-500/5 border-slate-500/30',
        blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
        purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
        yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
        green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    };

    const dotColors: Record<string, string> = {
        slate: 'bg-slate-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        yellow: 'bg-yellow-500',
        green: 'bg-green-500',
    };

    return (
        <div
            className={cn(
                'flex flex-col w-72 min-w-[288px] rounded-xl border-2 border-dashed transition-all duration-200',
                colorClasses[color] || colorClasses.slate,
                isOver && 'border-solid scale-[1.02] shadow-lg'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-3">
                <div className="flex items-center gap-2">
                    <span className={cn('w-2.5 h-2.5 rounded-full', dotColors[color] || dotColors.slate)} />
                    <h3 className="font-semibold text-sm text-slate-200">{title}</h3>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                        {features.length}
                    </span>
                </div>
                {id === 'backlog' && onAddFeature && (
                    <button
                        onClick={onAddFeature}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Add Feature"
                    >
                        <Plus size={16} />
                    </button>
                )}
            </div>

            {/* Features List */}
            <div
                ref={setNodeRef}
                className="flex-1 p-2 pt-0 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]"
            >
                <SortableContext items={features.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {features.map((feature) => (
                            <FeatureCard
                                key={feature.id}
                                feature={feature}
                                onEdit={onEditFeature}
                            />
                        ))}
                    </div>
                </SortableContext>

                {features.length === 0 && (
                    <div className="flex items-center justify-center h-32 border border-dashed border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500">Drop features here</p>
                    </div>
                )}
            </div>
        </div>
    );
};
