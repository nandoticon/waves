import React, { useState, useEffect } from 'react';
import { useCurrents, useAddCurrent, useDeleteCurrent, useReorderCurrents } from '../hooks/useApi';
import { X, Loader2, Layers, GripVertical } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

export function CurrentsManager() {
    const { data: currentsData, isLoading } = useCurrents();
    const { mutateAsync: addCurrent, isPending: isAdding } = useAddCurrent();
    const { mutateAsync: deleteCurrent } = useDeleteCurrent();
    const { mutate: reorderCurrents } = useReorderCurrents();
    const [name, setName] = useState('');
    const [localCurrents, setLocalCurrents] = useState<{ id: string, name: string, order_index?: number }[]>([]);

    useEffect(() => {
        if (currentsData) {
            // Only update if the IDs have changed to avoid cascading renders
            const currentIds = localCurrents.map(c => c.id).join(',');
            const newIds = currentsData.map((c: { id: string }) => c.id).join(',');
            if (currentIds !== newIds) {
                setLocalCurrents(currentsData);
            }
        }
    }, [currentsData, localCurrents]);

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

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;

        if (sourceIndex === destinationIndex) return;

        const reordered = Array.from(localCurrents);
        const [moved] = reordered.splice(sourceIndex, 1);
        reordered.splice(destinationIndex, 0, moved);

        // Update local state instantly for smooth UI
        setLocalCurrents(reordered);

        // Prepare data for DB
        const updates = reordered.map((c, index) => ({
            id: c.id,
            order_index: index
        }));

        // Fire request to update DB
        reorderCurrents(updates);
    };

    if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-4">
            <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden p-2">
                {localCurrents.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No currents"
                        description="Currents let you group feeds together. Add one below!"
                        className="py-8"
                    />
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="currents-list">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                                    {localCurrents.map((current, index) => (
                                        <Draggable key={current.id} draggableId={current.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{ ...provided.draggableProps.style }}
                                                    className={`flex items-center justify-between p-3 rounded-2xl group transition-colors ${snapshot.isDragging ? 'bg-muted/80 shadow-md ring-1 ring-border' : 'hover:bg-muted/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <GripVertical className="w-5 h-5 text-muted-foreground/40 cursor-grab" />
                                                        <span className="font-medium text-foreground">{current.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Avoid triggering drag
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
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
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
