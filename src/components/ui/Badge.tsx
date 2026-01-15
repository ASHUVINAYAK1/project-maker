import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
    size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', size = 'md', ...props }, ref) => {
        const variants = {
            default: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            secondary: 'bg-slate-700 text-slate-300 border-slate-600',
            success: 'bg-green-500/20 text-green-400 border-green-500/30',
            warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            destructive: 'bg-red-500/20 text-red-400 border-red-500/30',
            outline: 'bg-transparent text-slate-400 border-slate-600',
        };

        const sizes = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-2.5 py-1 text-xs',
        };

        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center rounded-full border font-medium',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);

Badge.displayName = 'Badge';
