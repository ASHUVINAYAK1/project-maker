import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    GitBranch,
    ExternalLink,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui';
import type { Feature } from '../../types';

interface FeatureCardProps {
    feature: Feature;
    onEdit?: (feature: Feature) => void;
    isDragging?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onEdit, isDragging }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: feature.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const complexityColors = {
        low: 'success',
        medium: 'warning',
        high: 'destructive',
    } as const;

    const automationIcons = {
        idle: <Clock size={14} className="text-slate-500" />,
        running: <Loader2 size={14} className="text-blue-400 animate-spin" />,
        success: <CheckCircle2 size={14} className="text-green-400" />,
        failed: <XCircle size={14} className="text-red-400" />,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                `
        group relative
        bg-slate-800/80 hover:bg-slate-800
        border border-slate-700/50 hover:border-slate-600
        rounded-lg p-3
        transition-all duration-200
        cursor-pointer
        `,
                isDragging && 'opacity-50 shadow-2xl shadow-blue-500/20 border-blue-500/50',
                feature.automationStatus === 'running' && 'ring-2 ring-blue-500/30 animate-pulse'
            )}
            onClick={() => onEdit?.(feature)}
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="absolute top-3 right-2 p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing transition-opacity"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={16} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-2 mb-2 pr-6">
                <span className="text-sm font-medium text-slate-100 line-clamp-2">
                    {feature.title}
                </span>
            </div>

            {/* Description */}
            {feature.description && (
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {feature.description}
                </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <Badge variant={complexityColors[feature.estimatedComplexity]} size="sm">
                    {feature.estimatedComplexity}
                </Badge>
                {feature.keyPoints.length > 0 && (
                    <Badge variant="secondary" size="sm">
                        {feature.keyPoints.length} points
                    </Badge>
                )}
                {feature.dependencies.length > 0 && (
                    <Badge variant="outline" size="sm">
                        {feature.dependencies.length} deps
                    </Badge>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    {feature.branchName && (
                        <span className="flex items-center gap-1 text-slate-500">
                            <GitBranch size={12} />
                            <span className="max-w-[100px] truncate">{feature.branchName}</span>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Automation Status */}
                    <span className="flex items-center gap-1">
                        {automationIcons[feature.automationStatus]}
                    </span>

                    {/* PR Link */}
                    {feature.prUrl && (
                        <a
                            href={feature.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <ExternalLink size={12} />
                            PR
                        </a>
                    )}
                </div>
            </div>

            {/* Running indicator */}
            {feature.automationStatus === 'running' && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-b-lg animate-pulse" />
            )}
        </div>
    );
};
