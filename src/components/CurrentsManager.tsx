import React, { useState } from 'react';
import { useCurrents, useAddCurrent, useDeleteCurrent } from '../hooks/useApi';
import { X, Loader2, Layers } from 'lucide-react';
import { EmptyState } from './EmptyState';

export function CurrentsManager() {
    const { data: currents, isLoading } = useCurrents();
    const { mutateAsync: addCurrent, isPending: isAdding } = useAddCurrent();
    const { mutateAsync: deleteCurrent } = useDeleteCurrent();
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            await addCurrent({ name: name.trim() });
            setName('');
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-4">
            <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden p-2">
                {currents?.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No currents"
                        description="Currents let you group feeds together. Add one below!"
                        className="py-8"
                    />
                ) : (
                    currents?.map(current => (
                        <div key={current.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors group">
                            <span className="font-medium text-foreground">{current.name}</span>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this current?')) {
                                        deleteCurrent(current.id);
                                    }
                                }}
                                className="text-muted-foreground hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all p-1"
                                title="Delete Current"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New Current Name..."
                    required
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    disabled={isAdding}
                />
                <button
                    type="submit"
                    disabled={isAdding || !name.trim()}
                    className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </button>
            </form>
        </div>
    );
}
