import React, { useState } from 'react';
import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogContent,
    DialogFooter,
    Button,
    Input,
    Textarea,
} from '../ui';
import { useFeatureStore, useProjectStore } from '../../stores';
import type { Feature, FeatureComplexity } from '../../types';

interface CreateFeatureDialogProps {
    open: boolean;
    onClose: () => void;
    editFeature?: Feature | null;
}

export const CreateFeatureDialog: React.FC<CreateFeatureDialogProps> = ({
    open,
    onClose,
    editFeature
}) => {
    const activeProjectId = useProjectStore((state) => state.activeProjectId);
    const { createFeature, updateFeature } = useFeatureStore();

    const [title, setTitle] = useState(editFeature?.title || '');
    const [description, setDescription] = useState(editFeature?.description || '');
    const [keyPointsText, setKeyPointsText] = useState(editFeature?.keyPoints.join('\n') || '');
    const [complexity, setComplexity] = useState<FeatureComplexity>(editFeature?.estimatedComplexity || 'medium');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (editFeature) {
            setTitle(editFeature.title);
            setDescription(editFeature.description);
            setKeyPointsText(editFeature.keyPoints.join('\n'));
            setComplexity(editFeature.estimatedComplexity);
        } else {
            setTitle('');
            setDescription('');
            setKeyPointsText('');
            setComplexity('medium');
        }
    }, [editFeature, open]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = 'Feature title is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !activeProjectId) return;

        setIsSaving(true);

        try {
            const keyPoints = keyPointsText
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);

            if (editFeature) {
                await updateFeature(editFeature.id, {
                    title: title.trim(),
                    description: description.trim(),
                    keyPoints,
                    estimatedComplexity: complexity,
                });
            } else {
                await createFeature(activeProjectId, {
                    title: title.trim(),
                    description: description.trim(),
                    keyPoints,
                    estimatedComplexity: complexity,
                });
            }

            handleClose();
        } catch (error) {
            console.error('Failed to save feature:', error);
            setErrors({ submit: 'Failed to save feature. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setKeyPointsText('');
        setComplexity('medium');
        setErrors({});
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogHeader onClose={handleClose}>
                <DialogTitle>{editFeature ? 'Edit Feature' : 'Create Feature'}</DialogTitle>
                <DialogDescription>
                    {editFeature
                        ? 'Update the feature details below'
                        : 'Add a new feature to your project backlog'
                    }
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
                <DialogContent className="space-y-4">
                    <Input
                        label="Feature Title"
                        placeholder="User authentication system"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        error={errors.title}
                        autoFocus
                    />

                    <Textarea
                        label="Description"
                        placeholder="Describe what this feature does and why it's needed..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                    />

                    <Textarea
                        label="Key Points"
                        placeholder="Enter each key point on a new line..."
                        value={keyPointsText}
                        onChange={(e) => setKeyPointsText(e.target.value)}
                        rows={4}
                        helperText="One point per line. These will guide the AI implementation."
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                            Estimated Complexity
                        </label>
                        <div className="flex gap-2">
                            {(['low', 'medium', 'high'] as const).map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setComplexity(level)}
                                    className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${complexity === level
                                            ? level === 'low'
                                                ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500/30'
                                                : level === 'medium'
                                                    ? 'bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/30'
                                                    : 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }
                  `}
                                >
                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {errors.submit && (
                        <p className="text-sm text-red-400">{errors.submit}</p>
                    )}
                </DialogContent>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isSaving}>
                        {editFeature ? 'Save Changes' : 'Create Feature'}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
};
