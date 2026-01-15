import React, { useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { FeatureCard } from './FeatureCard';
import { useFeatureStore, useProjectStore } from '../../stores';
import type { Feature, FeatureStatus } from '../../types';

interface KanbanBoardProps {
    onAddFeature?: () => void;
    onEditFeature?: (feature: Feature) => void;
}

interface ColumnConfig {
    id: FeatureStatus;
    title: string;
    color: string;
}

const COLUMNS: ColumnConfig[] = [
    { id: 'backlog', title: 'Backlog', color: 'slate' },
    { id: 'todo', title: 'Todo', color: 'blue' },
    { id: 'in_progress', title: 'In Progress', color: 'purple' },
    { id: 'in_review', title: 'In Review', color: 'yellow' },
    { id: 'done', title: 'Done', color: 'green' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onAddFeature, onEditFeature }) => {
    const activeProjectId = useProjectStore((state) => state.activeProjectId);
    const { features, moveFeature, getFeatureById } = useFeatureStore();

    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Group features by status for the active project
    const featuresByStatus = useMemo(() => {
        if (!activeProjectId) {
            return COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: [] }), {} as Record<FeatureStatus, Feature[]>);
        }

        const projectFeatures = features.filter(f => f.projectId === activeProjectId);

        return COLUMNS.reduce((acc, col) => {
            acc[col.id] = projectFeatures
                .filter(f => f.status === col.id)
                .sort((a, b) => a.order - b.order);
            return acc;
        }, {} as Record<FeatureStatus, Feature[]>);
    }, [features, activeProjectId]);

    const activeFeature = activeId ? getFeatureById(activeId) : null;

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Handle drag over logic if needed for real-time feedback
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const featureId = active.id as string;
        const overId = over.id as string;

        // Determine the target column
        let targetStatus: FeatureStatus;

        // Check if dropping on a column directly
        if (COLUMNS.some(col => col.id === overId)) {
            targetStatus = overId as FeatureStatus;
        } else {
            // Dropping on another feature - find its status
            const overFeature = getFeatureById(overId);
            if (!overFeature) return;
            targetStatus = overFeature.status;
        }

        const feature = getFeatureById(featureId);
        if (!feature) return;

        // Only move if status changed or order changed
        if (feature.status !== targetStatus) {
            await moveFeature(featureId, targetStatus);

            // Trigger automation when moving to 'todo'
            if (targetStatus === 'todo' && feature.status !== 'todo') {
                // We'll use a custom event or a store call here
                window.dispatchEvent(new CustomEvent('start-automation', { detail: { featureId } }));
            }
        }
    };

    if (!activeProjectId) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-300 mb-2">No Project Selected</h2>
                    <p className="text-slate-500">Create or select a project to start managing features</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-x-auto p-6">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 min-w-max">
                    {COLUMNS.map((column) => (
                        <KanbanColumn
                            key={column.id}
                            id={column.id}
                            title={column.title}
                            color={column.color}
                            features={featuresByStatus[column.id]}
                            onAddFeature={column.id === 'backlog' ? onAddFeature : undefined}
                            onEditFeature={onEditFeature}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeFeature && (
                        <div className="w-72">
                            <FeatureCard feature={activeFeature} isDragging />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    );
};
