import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={clsx(
                "w-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground",
                className
            )}
        >
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-muted/30 p-4 rounded-3xl border border-border/50">
                    <Icon className="w-10 h-10 text-muted-foreground/60" strokeWidth={1.5} />
                </div>
            </div>

            <h3 className="text-lg font-medium text-foreground mb-2">
                {title}
            </h3>

            <div className="text-sm max-w-sm mx-auto mb-6 opacity-80 leading-relaxed">
                {description}
            </div>

            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </motion.div>
    );
}
