/**
 * FeaturePreview Component
 * Displays a preview of generated features with edit/remove capabilities
 */

import React, { useState } from 'react';
import {
    Check,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronUp,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import { Button, Badge, Input, Textarea } from '../ui';
import { cn } from '../../lib/utils';
import type { LLMGeneratedFeature, FeatureComplexity } from '../../types';

interface FeaturePreviewProps {
    features: LLMGeneratedFeature[];
    onFeaturesChange: (features: LLMGeneratedFeature[]) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const FeaturePreview: React.FC<FeaturePreviewProps> = ({
    features,
    onFeaturesChange,
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleRemoveFeature = (index: number) => {
        const newFeatures = features.filter((_, i) => i !== index);
        onFeaturesChange(newFeatures);
        if (expandedIndex === index) {
            setExpandedIndex(null);
        }
    };

    const handleUpdateFeature = (index: number, updates: Partial<LLMGeneratedFeature>) => {
        const newFeatures = features.map((f, i) =>
            i === index ? { ...f, ...updates } : f
        );
        onFeaturesChange(newFeatures);
    };

    const handleToggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const complexityColors: Record<FeatureComplexity, string> = {
        low: 'success',
        medium: 'warning',
        high: 'destructive',
    };

    if (features.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Features Generated</h3>
                <p className="text-sm text-slate-500 max-w-md">
                    The AI didn't generate any features. Try providing a more detailed project description.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-slate-100">Generated Features</h3>
                    <Badge variant="secondary">{features.length} features</Badge>
                </div>
                <p className="text-sm text-slate-500">Review and edit before adding to backlog</p>
            </div>

            {/* Feature List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[400px]">
                {features.map((feature, index) => (
                    <FeaturePreviewCard
                        key={index}
                        feature={feature}
                        index={index}
                        isExpanded={expandedIndex === index}
                        isEditing={editingIndex === index}
                        complexityColors={complexityColors}
                        onToggleExpand={() => handleToggleExpand(index)}
                        onEdit={() => setEditingIndex(index)}
                        onCancelEdit={() => setEditingIndex(null)}
                        onSaveEdit={(updates) => {
                            handleUpdateFeature(index, updates);
                            setEditingIndex(null);
                        }}
                        onRemove={() => handleRemoveFeature(index)}
                    />
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={onConfirm}
                    disabled={isLoading || features.length === 0}
                    isLoading={isLoading}
                >
                    <Check className="w-4 h-4" />
                    Add {features.length} Features to Backlog
                </Button>
            </div>
        </div>
    );
};

interface FeaturePreviewCardProps {
    feature: LLMGeneratedFeature;
    index: number;
    isExpanded: boolean;
    isEditing: boolean;
    complexityColors: Record<FeatureComplexity, string>;
    onToggleExpand: () => void;
    onEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: (updates: Partial<LLMGeneratedFeature>) => void;
    onRemove: () => void;
}

const FeaturePreviewCard: React.FC<FeaturePreviewCardProps> = ({
    feature,
    index,
    isExpanded,
    isEditing,
    complexityColors,
    onToggleExpand,
    onEdit,
    onCancelEdit,
    onSaveEdit,
    onRemove,
}) => {
    const [editedTitle, setEditedTitle] = useState(feature.title);
    const [editedDescription, setEditedDescription] = useState(feature.description);
    const [editedComplexity, setEditedComplexity] = useState(feature.estimatedComplexity);

    const handleSave = () => {
        onSaveEdit({
            title: editedTitle,
            description: editedDescription,
            estimatedComplexity: editedComplexity,
        });
    };

    if (isEditing) {
        return (
            <div className="bg-slate-800 border border-blue-500/50 rounded-lg p-4 space-y-3">
                <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="Feature title"
                    className="text-sm"
                />
                <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Feature description"
                    rows={3}
                    className="text-sm"
                />
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Complexity:</span>
                    {(['low', 'medium', 'high'] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setEditedComplexity(c)}
                            className={cn(
                                'px-3 py-1 rounded text-xs font-medium transition-all',
                                editedComplexity === c
                                    ? c === 'low'
                                        ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                                        : c === 'medium'
                                            ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
                                            : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            )}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                        Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
                onClick={onToggleExpand}
            >
                <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-slate-100 truncate">{feature.title}</h4>
                </div>
                <Badge
                    variant={complexityColors[feature.estimatedComplexity] as any}
                    size="sm"
                >
                    {feature.estimatedComplexity}
                </Badge>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-700">
                    {feature.description && (
                        <div className="pt-3">
                            <p className="text-sm text-slate-400">{feature.description}</p>
                        </div>
                    )}

                    {feature.keyPoints.length > 0 && (
                        <div>
                            <h5 className="text-xs font-medium text-slate-500 uppercase mb-2">Key Points</h5>
                            <ul className="space-y-1">
                                {feature.keyPoints.map((point, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {feature.acceptanceCriteria.length > 0 && (
                        <div>
                            <h5 className="text-xs font-medium text-slate-500 uppercase mb-2">Acceptance Criteria</h5>
                            <ul className="space-y-1">
                                {feature.acceptanceCriteria.map((criteria, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                        <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                        {criteria}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {feature.dependencies.length > 0 && (
                        <div>
                            <h5 className="text-xs font-medium text-slate-500 uppercase mb-2">Dependencies</h5>
                            <div className="flex flex-wrap gap-1">
                                {feature.dependencies.map((dep, i) => (
                                    <Badge key={i} variant="outline" size="sm">
                                        {dep}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
