import { useFeeds, useUnsubscribe } from '../hooks/useApi';
import { Loader2, Trash2, Rss } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from './EmptyState';

export function FeedManager() {
    const { data: feeds, isLoading } = useFeeds();
    const { mutateAsync: unsubscribe, isPending: isUnsubscribing } = useUnsubscribe();

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
    }

    if (!feeds || feeds.length === 0) {
        return (
            <EmptyState
                icon={Rss}
                title="No subscriptions"
                description="You are not subscribed to any voices yet. Add feeds to start building your network."
                className="py-10"
            />
        );
    }

    return (
        <div className="bg-card shadow-sm border border-border/60 rounded-3xl overflow-hidden divide-y divide-border/30">
            <AnimatePresence mode="popLayout">
                {feeds.map((sub: any) => {
                    const feed = sub.feeds;
                    return (
                        <motion.div
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            key={sub.feed_id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                {feed.icon_url ? (
                                    <img src={feed.icon_url} alt="" className="w-8 h-8 rounded shrink-0 object-cover border border-border/50 bg-background" />
                                ) : (
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 border border-border/50 text-muted-foreground">
                                        <Rss className="w-4 h-4" />
                                    </div>
                                )}
                                <div className="truncate">
                                    <p className="font-medium text-sm text-foreground truncate">{feed.title || "Unknown Title"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{new URL(feed.url || 'https://example.com').hostname}</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm(`Are you sure you want to unsubscribe from ${feed.title}?`)) {
                                        await unsubscribe(sub.feed_id);
                                    }
                                }}
                                disabled={isUnsubscribing}
                                aria-label={`Unsubscribe from ${feed.title}`}
                                className="shrink-0 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
