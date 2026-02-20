import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Search, Infinity as RiverIcon, Star, Users, Loader2, RefreshCw, Hash, Bookmark, Wind, LayoutList, LayoutGrid, Eye, EyeOff, BookmarkCheck, RotateCcw, Zap, CheckCircle2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';
import { AddFeedForm } from '../components/AddFeedForm';
import { EmptyState } from '../components/EmptyState';
import { useSyncFeeds, useArticles, useCurrents, useSavedArticles, useReadArticles, useMarkAsRead, useUnmarkAsRead, useToggleSave, useMarkOlderAsRead, useFlushOldArticles } from '../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanExcerpt } from '../lib/sanitizer';

function groupArticlesByDate(articles: any[], currents: any[], isRiver: boolean) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: any } = {
        'Today': isRiver ? {} : [],
        'Yesterday': isRiver ? {} : [],
        'Older': isRiver ? {} : []
    };

    const currentMap = new Map(currents?.map(c => [c.id, c.name]));

    articles.forEach(article => {
        const date = new Date(article.published_at);
        date.setHours(0, 0, 0, 0);

        let dateKey = 'Older';
        if (date.getTime() === today.getTime()) dateKey = 'Today';
        else if (date.getTime() === yesterday.getTime()) dateKey = 'Yesterday';

        if (isRiver) {
            const currentId = article.feeds?.subscriptions?.[0]?.current_id;
            const currentName = currentId ? (currentMap.get(currentId) || 'Uncategorized') : 'Uncategorized';

            if (!groups[dateKey][currentName]) {
                groups[dateKey][currentName] = [];
            }
            groups[dateKey][currentName].push(article);
        } else {
            groups[dateKey].push(article);
        }
    });

    return groups;
}

const STATIC_TABS = [
    { id: 'river', label: 'River', icon: RiverIcon },
    { id: 'saved', label: 'Saved', icon: Star },
    { id: 'voices', label: 'Voices', icon: Users },
] as const;

export default function Home() {
    const { loading } = useAuth();
    const { mutateAsync: syncFeeds, isPending: isSyncing } = useSyncFeeds();
    const { data: currents } = useCurrents();
    const [activeTab, setActiveTab] = useState<string>('river');
    const [viewMode, setViewMode] = useState<'list' | 'magazine'>(() => {
        return (localStorage.getItem('waves_view_mode') as 'list' | 'magazine') || 'list';
    });
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const { mutate: markAsRead } = useMarkAsRead();
    const { mutate: markOlderAsRead, isPending: isMarkingOlder } = useMarkOlderAsRead();
    const [showMarkDropdown, setShowMarkDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { mutate: flushOldArticles } = useFlushOldArticles();
    const [page, setPage] = useState(0);
    const [showOlderArticles, setShowOlderArticles] = useState(false);

    // Weekly Cleanup Trigger
    useEffect(() => {
        const lastFlush = localStorage.getItem('waves_last_flush');
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        if (!lastFlush || (now - parseInt(lastFlush)) > oneWeek) {
            flushOldArticles(60, {
                onSuccess: () => {
                    localStorage.setItem('waves_last_flush', now.toString());
                }
            });
        }
    }, [flushOldArticles]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowMarkDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Flush old articles on mount (e.g., after 60 days)
    useEffect(() => {
        flushOldArticles(60);
    }, []);

    // Reset page on filter/tab change
    useEffect(() => {
        setPage(0);
        setShowOlderArticles(false);
    }, [activeTab, showUnreadOnly]);

    // Scroll to top on page change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page]);

    // Persist viewMode
    useEffect(() => {
        localStorage.setItem('waves_view_mode', viewMode);
    }, [viewMode]);

    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Always show at the top
            if (currentScrollY < 10) {
                setShowHeader(true);
            } else {
                // Show if scrolling up, hide if scrolling down
                if (currentScrollY < lastScrollY.current) {
                    setShowHeader(true);
                } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                    setShowHeader(false);
                }
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Filter logic
    const isSpecialTab = ['river', 'saved', 'voices'].includes(activeTab);
    const currentIdFilter = activeTab === 'river' ? 'all' : (isSpecialTab ? undefined : activeTab);

    // Fetch River/Current articles
    const { data: riverArticles, status } = useArticles(currentIdFilter || 'none', page);

    // Fetch Saved articles
    const { data: savedArticlesData, isLoading: isLoadingSaved } = useSavedArticles();

    // Fetch Read articles for UI dimming
    const { data: readArticles } = useReadArticles();

    const TABS = [
        STATIC_TABS[0],
        ...(currents?.map(c => ({ id: c.id, label: c.name, icon: Hash })) || []),
        STATIC_TABS[1],
        STATIC_TABS[2]
    ];

    // Filter by unread if needed
    const filteredArticles = showUnreadOnly
        ? (riverArticles || []).filter((art: any) => !readArticles?.includes(art.id))
        : (riverArticles || []);

    // Age-based filtering
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const hasOlderArticles = filteredArticles.some((art: any) => new Date(art.published_at) < sevenDaysAgo);

    const visibleArticles = showOlderArticles
        ? filteredArticles
        : filteredArticles.filter((art: any) => new Date(art.published_at) >= sevenDaysAgo);

    // Determine which article array to show
    const isSavedTab = activeTab === 'saved';
    const articles = isSavedTab ? (savedArticlesData || []) : visibleArticles;
    const isLoadingArts = isSavedTab ? isLoadingSaved : status === 'pending';

    const groupedArticles = groupArticlesByDate(articles, currents || [], activeTab === 'river');

    if (loading) return null;
    // Temporarily disable redirect for testing UI
    // if (!user) return <Navigate to="/login" replace />;

    return (
        <div className={clsx(
            "mx-auto min-h-screen px-4 font-serif transition-all duration-500",
            viewMode === 'magazine' ? "max-w-[1240px]" : "max-w-3xl"
        )}>
            <motion.header
                initial={false}
                animate={{
                    y: showHeader ? 0 : -100,
                    opacity: showHeader ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="sticky top-0 bg-background/90 backdrop-blur-xl z-20 pt-12 pb-6 flex items-center justify-between"
            >

                {/* Navigation Tabs */}
                <div className="flex bg-card items-center rounded-3xl p-1 shadow-sm border border-border/50">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                aria-label={tab.label}
                                className={clsx(
                                    'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium transition-all font-sans',
                                    isActive
                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                )}
                            >
                                <Icon className={clsx('w-4 h-4', isActive && tab.id === 'river' ? 'text-primary' : '')} strokeWidth={2.5} />
                                {isActive && <span>{tab.label}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Mark as Read Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowMarkDropdown(!showMarkDropdown)}
                            disabled={isMarkingOlder}
                            className={clsx(
                                "flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all duration-300",
                                showMarkDropdown ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                            )}
                            title="Mark articles as read"
                        >
                            {isMarkingOlder ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <ChevronDown className={clsx("w-3 h-3 transition-transform duration-300", showMarkDropdown && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                            {showMarkDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                                >
                                    <div className="p-3 border-b border-border/50 bg-muted/30">
                                        <span className="text-[10px] font-sans font-black tracking-[0.2em] text-muted-foreground/60 uppercase">Mark older as Read</span>
                                    </div>
                                    <div className="p-1.5">
                                        {[
                                            { label: 'Older than 1 day', days: 1 },
                                            { label: 'Older than 7 days', days: 7 },
                                            { label: 'Older than 30 days', days: 30 }
                                        ].map((option) => (
                                            <button
                                                key={option.days}
                                                disabled={isMarkingOlder}
                                                onClick={() => {
                                                    markOlderAsRead(option.days);
                                                    setShowMarkDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-muted transition-colors disabled:opacity-50 font-sans font-medium"
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* View Mode Toggle - Only visible on desktop/tablet */}
                    <div className="hidden md:flex bg-muted/30 p-1 rounded-full border border-border/50">
                        <button
                            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                            className={clsx(
                                "p-1.5 rounded-full transition-all flex items-center gap-1.5 px-2.5",
                                showUnreadOnly ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                            title={showUnreadOnly ? "Show All" : "Show Unread Only"}
                        >
                            {showUnreadOnly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <div className="w-[1px] bg-border mx-1 my-1" />
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-1.5 rounded-full transition-all",
                                viewMode === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="List View"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('magazine')}
                            className={clsx(
                                "p-1.5 rounded-full transition-all",
                                viewMode === 'magazine' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Magazine View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button aria-label="Search" className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                        <Search className="w-4 h-4" />
                    </button>
                    <Link to="/settings" aria-label="Settings" className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                        <SettingsIcon className="w-4 h-4" />
                    </Link>
                </div>
            </motion.header>

            <main className={clsx(
                "pb-24 mt-4 transition-all duration-500",
                viewMode === 'magazine' ? "w-full" : "max-w-[480px] mx-auto space-y-12"
            )}>
                {activeTab === 'voices' ? (
                    <div className="space-y-6">
                        <div className="bg-card shadow-sm border border-border p-6 rounded-2xl">
                            <h3 className="text-xl font-serif font-medium mb-4">Add a new connection</h3>
                            <AddFeedForm />
                        </div>
                        <div className="bg-card shadow-sm border border-border p-6 rounded-2xl flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-serif font-medium mb-1">Manual Sync</h3>
                                <p className="text-sm text-muted-foreground">Force fetch all latest articles from your subscribed voices.</p>
                            </div>
                            <button
                                onClick={() => syncFeeds()}
                                disabled={isSyncing}
                                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                            >
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Sync Network
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {isLoadingArts ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                        ) : articles.length === 0 ? (
                            <EmptyState
                                icon={isSavedTab ? Bookmark : Wind}
                                title={isSavedTab ? "No saved articles" : "A quiet river"}
                                description={isSavedTab ? "Articles you bookmark will appear right here for reading later." : "There are no articles to show. Subscribe to a few feeds to let knowledge flow in."}
                                action={!isSavedTab && (
                                    <button
                                        onClick={() => {
                                            const promise = syncFeeds();
                                            // Handle feedback
                                            promise.then((res: any) => {
                                                alert(`Fetched ${res.count} articles`);
                                            }).catch(() => {
                                                alert('Failed to sync feeds');
                                            });
                                        }}
                                        disabled={isSyncing}
                                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:scale-105 transition-all disabled:opacity-50 font-sans font-bold shadow-lg shadow-primary/20"
                                    >
                                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Update Feeds
                                    </button>
                                )}
                                className="my-12"
                            />
                        ) : (
                            <AnimatePresence mode="popLayout">
                                <div className="space-y-16">
                                    {(['Today', 'Yesterday', 'Older'] as const).map(group => {
                                        const groupData = groupedArticles[group];
                                        const isNested = activeTab === 'river' && !Array.isArray(groupData);

                                        if (isNested) {
                                            if (Object.keys(groupData).length === 0) return null;
                                        } else {
                                            if (groupData.length === 0) return null;
                                        }

                                        return (
                                            <div key={group} className="space-y-8">
                                                <div className="flex items-center gap-4 py-2">
                                                    <h3 className="text-xs font-sans font-black tracking-[0.2em] uppercase text-muted-foreground/40">{group}</h3>
                                                    <div className="h-[1px] flex-1 bg-border/30" />
                                                </div>

                                                {isNested ? (
                                                    <div className="space-y-16">
                                                        {Object.entries(groupData).map(([currentName, arts]: [string, any]) => (
                                                            <div key={currentName} className="space-y-8">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                                    <h4 className="text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-muted-foreground/60">{currentName}</h4>
                                                                </div>
                                                                <div className={clsx(
                                                                    viewMode === 'magazine' ? "grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16" : "space-y-12"
                                                                )}>
                                                                    {arts.map((article: any) => (
                                                                        <ArticleItem
                                                                            key={article.id}
                                                                            article={article}
                                                                            viewMode={viewMode}
                                                                            isRead={!!(readArticles?.includes(article.id))}
                                                                            isSaved={!!(savedArticlesData?.some(s => s.id === article.id))}
                                                                            onRead={() => markAsRead(article.id)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className={clsx(
                                                        viewMode === 'magazine' ? "grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16" : "space-y-12"
                                                    )}>
                                                        {(groupData as any[]).map((article: any) => (
                                                            <ArticleItem
                                                                key={article.id}
                                                                article={article}
                                                                viewMode={viewMode}
                                                                isRead={!!(readArticles?.includes(article.id))}
                                                                isSaved={!!(savedArticlesData?.some(s => s.id === article.id))}
                                                                onRead={() => markAsRead(article.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </AnimatePresence>
                        )}
                        {!showOlderArticles && !isSavedTab && hasOlderArticles && (
                            <div className="flex justify-center py-8">
                                <button
                                    onClick={() => setShowOlderArticles(true)}
                                    className="px-6 py-3 rounded-2xl bg-muted/30 border border-border/50 text-xs font-sans font-black tracking-widest uppercase hover:bg-muted hover:text-foreground transition-all"
                                >
                                    Show articles older than 7 days
                                </button>
                            </div>
                        )}
                        {!isSavedTab && riverArticles && riverArticles.length >= 30 && (
                            <div className="flex justify-center items-center gap-6 py-12">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="px-6 py-3 rounded-2xl bg-muted/30 border border-border/50 text-sm font-sans font-bold hover:bg-muted transition-all disabled:opacity-30"
                                >
                                    Previous
                                </button>
                                <span className="text-xs font-sans font-black tracking-widest text-muted-foreground/60 uppercase">
                                    Page {page + 1}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 text-sm font-sans font-bold hover:scale-105 transition-all"
                                >
                                    Show More
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

function ArticleItem({ article, viewMode, isRead, isSaved, onRead }: { article: any, viewMode: 'list' | 'magazine', isRead: boolean, isSaved: boolean, onRead: () => void }) {
    const itemRef = useRef(null);
    const { mutate: unmarkAsRead } = useUnmarkAsRead();
    const { mutate: toggleSave } = useToggleSave();
    const feedTitle = article.feeds?.title || new URL(article.url || article.feeds?.url || 'https://example.com').hostname.toUpperCase();

    const lastScrollY = useRef(window.scrollY);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const currentScrollY = window.scrollY;
            const isScrollingDown = currentScrollY > lastScrollY.current;
            lastScrollY.current = currentScrollY;

            if (entries[0].isIntersecting && !isRead && isScrollingDown) {
                // If the article is in view for at least 1s, mark as read
                const timer = setTimeout(() => {
                    // Check again before marking
                    if (!isRead) {
                        onRead();
                    }
                }, 1000);
                return () => clearTimeout(timer);
            }
        }, {
            threshold: 0.2, // Even more sensitive for scrolling visibility
            rootMargin: '0px 0px -10% 0px'
        });

        if (itemRef.current) observer.observe(itemRef.current);
        return () => observer.disconnect();
    }, [isRead, onRead]);

    return (
        <motion.article
            ref={itemRef}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={clsx(
                "group cursor-pointer transition-all duration-300",
                isRead ? "opacity-40 hover:opacity-100 grayscale-[0.8] hover:grayscale-0" : "opacity-100"
            )}
        >
            <Link to={`/article/${article.id}`} className={clsx(
                "block group/link transition-all duration-500",
                viewMode === 'magazine' && article.image_url ? "md:grid md:grid-cols-[140px,1fr] lg:grid-cols-[180px,1fr] md:gap-6" : "space-y-4"
            )}>
                {article.image_url && (
                    <div className={clsx(
                        "relative overflow-hidden rounded-2xl bg-muted transition-all duration-500",
                        viewMode === 'magazine'
                            ? "aspect-[4/3] md:aspect-square md:order-1 mb-3 md:mb-0"
                            : "aspect-[16/9] mb-4"
                    )}>
                        <motion.img
                            src={article.image_url}
                            alt=""
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            loading="lazy"
                            className={clsx(
                                "h-full w-full object-cover transition-transform duration-500 group-hover/link:scale-105",
                                isRead && "grayscale"
                            )}
                        />
                    </div>
                )}

                <div className={clsx(
                    "flex flex-col",
                    viewMode === 'magazine' && article.image_url && "md:order-2"
                )}>
                    <div className="text-xs font-sans font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2 mb-3">
                        {article.feeds?.icon_url ? (
                            <motion.img
                                src={article.feeds.icon_url}
                                alt=""
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                loading="lazy"
                                className="w-4 h-4 rounded object-cover shrink-0 grayscale group-hover/link:grayscale-0 transition-all opacity-80"
                            />
                        ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        )}
                        {feedTitle}
                    </div>

                    <h2 className={clsx(
                        "font-serif font-medium group-hover/link:text-primary transition-all duration-300",
                        viewMode === 'magazine' ? "text-xl md:text-[22px] leading-[1.3] font-semibold" : "text-[22px] leading-[1.3]",
                        isRead ? "text-foreground/50" : "text-foreground"
                    )}>
                        {article.title}
                    </h2>

                    <p className="text-[15px] leading-relaxed text-muted-foreground font-serif pt-2 line-clamp-3 opacity-90">
                        {cleanExcerpt(article.excerpt) || "Dive into this story to explore more about this topic..."}
                    </p>

                    <div className="text-xs font-sans text-muted-foreground/80 pt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Unknown Date'}
                            {article.excerpt && article.excerpt.length > 5 && (
                                <span title="Available offline">
                                    <Zap className="w-3 h-3 text-primary/60" />
                                </span>
                            )}
                            {viewMode === 'magazine' && <span className="w-1 h-1 rounded-full bg-border" />}
                            {viewMode === 'magazine' && <span className="opacity-60">5 min read</span>}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleSave({ articleId: article.id, isSaved });
                                }}
                                className={clsx(
                                    "p-1.5 rounded-full hover:bg-muted transition-colors",
                                    isSaved ? "text-primary" : "text-muted-foreground"
                                )}
                                title={isSaved ? "Unsave" : "Save"}
                            >
                                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                            </button>
                            {isRead && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        unmarkAsRead(article.id);
                                    }}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                                    title="Mark as unread"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        </motion.article>
    );
}
