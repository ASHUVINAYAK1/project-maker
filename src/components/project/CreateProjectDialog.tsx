import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
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
import { useProjectStore } from '../../stores';

interface CreateProjectDialogProps {
    open: boolean;
    onClose: () => void;
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({ open, onClose }) => {
    const createProject = useProjectStore((state) => state.createProject);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [path, setPath] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Project name is required';
        } else if (name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!path.trim()) {
            newErrors.path = 'Project path is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsCreating(true);

        try {
            createProject(name.trim(), description.trim(), path.trim());
            handleClose();
        } catch (error) {
            console.error('Failed to create project:', error);
            setErrors({ submit: 'Failed to create project. Please try again.' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setPath('');
        setErrors({});
        onClose();
    };

    const handleBrowse = async () => {
        // In Tauri, we would use the dialog API
        // For now, just show a placeholder path
        // TODO: Integrate with Tauri dialog
        const defaultPath = 'C:\\Users\\Projects\\' + (name || 'my-project').toLowerCase().replace(/\s+/g, '-');
        setPath(defaultPath);
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogHeader onClose={handleClose}>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                    Set up a new project and start generating features with AI
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
                <DialogContent className="space-y-4">
                    <Input
                        label="Project Name"
                        placeholder="My Awesome Project"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={errors.name}
                        autoFocus
                    />

                    <Textarea
                        label="Description"
                        placeholder="Describe your project... What are you building? What problem does it solve?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        helperText="This description will be used to generate features"
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                            Project Directory
                        </label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="C:\Users\Projects\my-project"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                error={errors.path}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleBrowse}
                                className="shrink-0"
                            >
                                <FolderOpen size={18} />
                                Browse
                            </Button>
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
                    <Button type="submit" variant="primary" isLoading={isCreating}>
                        Create Project
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
};
