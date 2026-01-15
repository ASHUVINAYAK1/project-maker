import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, children, className }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (open) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 200);
            return () => clearTimeout(timer);
        }
    }, [open]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (open) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className={cn(
                    'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200',
                    isVisible ? 'opacity-100' : 'opacity-0'
                )}
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                className={cn(
                    `
          relative z-10 w-full max-w-lg mx-4
          bg-slate-900 border border-slate-700 rounded-2xl
          shadow-2xl shadow-black/50
          transition-all duration-200
          `,
                    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
};

interface DialogHeaderProps {
    children: React.ReactNode;
    onClose?: () => void;
    className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, onClose, className }) => (
    <div className={cn('flex items-center justify-between p-6 pb-0', className)}>
        <div className="flex-1">{children}</div>
        {onClose && (
            <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
                <X size={20} />
            </button>
        )}
    </div>
);

interface DialogTitleProps {
    children: React.ReactNode;
    className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => (
    <h2 className={cn('text-xl font-semibold text-slate-100', className)}>
        {children}
    </h2>
);

interface DialogDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className }) => (
    <p className={cn('mt-1 text-sm text-slate-400', className)}>
        {children}
    </p>
);

interface DialogContentProps {
    children: React.ReactNode;
    className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => (
    <div className={cn('p-6', className)}>
        {children}
    </div>
);

interface DialogFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => (
    <div className={cn('flex items-center justify-end gap-3 p-6 pt-0', className)}>
        {children}
    </div>
);
