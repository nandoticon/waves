import { Loader2, Waves as WaveIcon, Clock, Trash2 } from 'lucide-react';
import { useFeeds, useDeleteFeed, useWaves, useUpdateSubscription } from '../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from './EmptyState';
import { formatDistanceToNow } from 'date-fns';

interface FeedData {
    id: string;
    title?: string;
    url?: string;
    icon_url?: string;
    last_article_at?: string;
}

interface SubscriptionData {
    feed_id: string;
    current_id: string | null;
    feeds: FeedData;
}

export function FeedManager() {
    const { data: subscriptions, isLoading: isLoadingFeeds } = useFeeds();
    const { data: waves, isLoading: isLoadingWaves } = useWaves();
    const { mutateAsync: deleteFeed, isPending: isDeletingFeed } = useDeleteFeed();
    const { mutate: updateSubscription } = useUpdateSubscription();

    if (isLoadingFeeds || isLoadingWaves) {
        return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
    }

    if (!subscriptions || subscriptions.length === 0) {
        return (
            <EmptyState
                icon={WaveIcon}
                title="No subscriptions"
                description="You are not subscribed to any voices yet. Add feeds to start building your network."
                className="py-10"
            />
        );
    }

    // Group subscriptions by current_id
    const groupedSubscriptions = (subscriptions as SubscriptionData[]).reduce((acc: Record<string, SubscriptionData[]>, sub) => {
        const waveId = sub.current_id || 'uncharted';
        if (!acc[waveId]) acc[waveId] = [];
        acc[waveId].push(sub);
        return acc;
    }, {} as Record<string, SubscriptionData[]>);

    return (
        <div className="space-y-6">
            <AnimatePresence mode="popLayout">
                {Object.entries(groupedSubscriptions).map(([waveId, groupSubs]) => {
                    const waveName = waveId === 'uncharted'
                        ? 'Uncharted'
                        : waves?.find(w => w.id === waveId)?.name || 'Unknown Wave';

                    return (
                        <div key={waveId} className="space-y-3">
                            <div className="flex items-center gap-2 px-2">
                                <h4 className="text-[10px] font-sans font-black tracking-[0.2em] uppercase text-muted-foreground/50">{waveName}</h4>
                                <div className="h-[1px] flex-1 bg-border/20" />
                            </div>

                            <div className="bg-card shadow-sm border border-border/60 rounded-3xl overflow-hidden divide-y divide-border/30">
                                {groupSubs.map((sub) => {
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
                                                        <WaveIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div className="truncate">
                                                    <p className="font-medium text-sm text-foreground truncate">{feed.title || "Unknown Title"}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-xs text-muted-foreground truncate">{new URL(feed.url || 'https://example.com').hostname}</p>
                                                        <span className="text-[10px] text-muted-foreground/30">•</span>
                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 whitespace-nowrap">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {feed.last_article_at ? (
                                                                <span>last article {formatDistanceToNow(new Date(feed.last_article_at), { addSuffix: true })}</span>
                                                            ) : (
                                                                <span className="italic">no articles found</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => updateSubscription({ feedId: feed.id, currentId: null })}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ring-1 ${!sub?.current_id
                                                        ? 'bg-primary/10 text-primary ring-primary/20'
                                                        : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted'
                                                        }`}
                                                >
                                                    Uncharted
                                                </button>
                                                {waves?.map((wave) => (
                                                    <button
                                                        key={wave.id}
                                                        onClick={() => updateSubscription({ feedId: feed.id, currentId: wave.id })}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ring-1 ${sub?.current_id === wave.id
                                                            ? 'bg-primary/10 text-primary ring-primary/20'
                                                            : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted'
                                                            }`}
                                                    >
                                                        {wave.name}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Are you sure you want to unsubscribe from ${feed.title}?`)) {
                                                        await deleteFeed(sub.feed_id);
                                                    }
                                                }}
                                                disabled={isDeletingFeed}
                                                aria-label={`Unsubscribe from ${feed.title}`}
                                                className="shrink-0 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
