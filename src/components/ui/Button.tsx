import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
        const baseStyles = `
      inline-flex items-center justify-center gap-2 rounded-lg font-medium
      transition-all duration-200 ease-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50
      active:scale-[0.98]
    `;

        const variants = {
            primary: `
        bg-gradient-to-r from-blue-600 to-blue-500
        text-white shadow-lg shadow-blue-500/25
        hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40
        focus-visible:ring-blue-500
      `,
            secondary: `
        bg-slate-800 text-slate-100
        border border-slate-700
        hover:bg-slate-700 hover:border-slate-600
        focus-visible:ring-slate-500
      `,
            ghost: `
        text-slate-300
        hover:bg-slate-800 hover:text-slate-100
        focus-visible:ring-slate-500
      `,
            destructive: `
        bg-gradient-to-r from-red-600 to-red-500
        text-white shadow-lg shadow-red-500/25
        hover:from-red-500 hover:to-red-400
        focus-visible:ring-red-500
      `,
            outline: `
        border border-slate-600 text-slate-300
        hover:bg-slate-800 hover:text-slate-100 hover:border-slate-500
        focus-visible:ring-slate-500
      `,
        };

        const sizes = {
            sm: 'h-8 px-3 text-sm',
            md: 'h-10 px-4 text-sm',
            lg: 'h-12 px-6 text-base',
            icon: 'h-10 w-10',
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
