import React, { useState } from 'react';
import { useAddFeed, useWaves } from '../hooks/useApi';
import { Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AddFeedForm({ currentId: initialCurrentId }: { currentId?: string }) {
    const [url, setUrl] = useState('');
    const [localCurrentId, setLocalCurrentId] = useState(initialCurrentId || '');
    const { data: waves } = useWaves();
    const { mutateAsync: addFeed, isPending, error } = useAddFeed();
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        try {
            await addFeed({ url, currentId: localCurrentId || undefined });
            setUrl('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md w-full">
            <div className="flex items-center gap-2">
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter RSS Feed URL"
                    required
                    className="flex-1 px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    disabled={isPending}
                />
                <button
                    type="submit"
                    disabled={isPending || !url}
                    className="flex items-center justify-center p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
            </div>

            {waves && waves.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Assign to Wave</label>
                    <select
                        value={localCurrentId}
                        onChange={(e) => setLocalCurrentId(e.target.value)}
                        disabled={isPending}
                        className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm opacity-80"
                    >
                        <option value="">No Wave (Sea only)</option>
                        {waves.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {error && <p className="text-sm text-red-500 mt-1">{error.message}</p>}

            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                        className="flex items-center gap-2 text-green-500 text-sm font-medium pl-1 mt-1"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Feed successfully added to your sea.
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    );
}
