import { clsx, type ClassValue } from 'clsx';

/**
 * Merge class names with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

/**
 * Generate a slug from a string
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Generate branch name from feature title
 */
export function generateBranchName(title: string): string {
    return `feature/${slugify(title)}`;
}

/**
 * Get complexity color
 */
export function getComplexityColor(complexity: 'low' | 'medium' | 'high'): string {
    switch (complexity) {
        case 'low':
            return 'text-green-500';
        case 'medium':
            return 'text-yellow-500';
        case 'high':
            return 'text-red-500';
        default:
            return 'text-gray-500';
    }
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
    switch (status) {
        case 'backlog':
            return 'bg-slate-500';
        case 'todo':
            return 'bg-blue-500';
        case 'in_progress':
            return 'bg-purple-500';
        case 'in_review':
            return 'bg-yellow-500';
        case 'done':
            return 'bg-green-500';
        default:
            return 'bg-gray-500';
    }
}
