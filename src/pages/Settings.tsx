import { useTheme } from '../lib/theme';
import { useFlushOldArticles, useOldArticlesCount } from '../hooks/useApi';
import { ChevronLeft, Sun, Monitor, Trash2, Loader2, Layers, Rss } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { CurrentsManager } from '../components/CurrentsManager';
import { FeedManager } from '../components/FeedManager';

const THEMES = [
    { id: 'bright', name: 'Bright', desc: 'Clean and airy, vibrant accent', colors: ['bg-blue-500', 'bg-slate-900'] },
    { id: 'ocean', name: 'Ocean', desc: 'Cool clarity, teal in the dark', colors: ['bg-teal-500', 'bg-slate-800'] },
    { id: 'paper', name: 'Paper', desc: 'Warm ivory, amber glow at night', colors: ['bg-amber-700', 'bg-[#2A2420]'] },
    { id: 'dusk', name: 'Dusk', desc: 'Soft linen, violet after sunset', colors: ['bg-violet-500', 'bg-slate-900'] },
    { id: 'ember', name: 'Ember', desc: 'Warm crimson, hearth glow at night', colors: ['bg-red-600', 'bg-[#2D1B1B]'] },
    { id: 'midnight', name: 'Midnight', desc: 'True black for OLED screens', colors: ['bg-blue-500', 'bg-black'] },
    { id: 'slate', name: 'Slate', desc: 'Neutral grey-blue, modern depth', colors: ['bg-slate-500', 'bg-slate-900'] },
] as const;

export default function Settings() {
    const { appearance, theme, setAppearance, setTheme } = useTheme();
    const { mutate: flushArticles, isPending: isFlushing } = useFlushOldArticles();
    const { data: oldArticlesCount, isLoading: isLoadingCount } = useOldArticlesCount(30);

    return (
        <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-500">
            <header className="flex items-center justify-between p-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/5 mb-4 lg:mb-8">
                <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
                    <Link to="/" className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full hover:bg-muted transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-base font-black tracking-widest uppercase">Settings</h1>
                    <div className="w-10" />
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

                    {/* Left Column: Visuals & Themes */}
                    <div className="lg:col-span-5 space-y-12">
                        <section>
                            <div className="flex items-center gap-2 mb-6 px-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
                                <Monitor className="w-3.5 h-3.5" />
                                Appearance
                            </div>

                            <div className="flex bg-muted/50 p-1 rounded-2xl gap-1 border border-border/50 shadow-sm">
                                {(['system', 'light', 'dark'] as const).map((app) => (
                                    <button
                                        key={app}
                                        onClick={() => setAppearance(app)}
                                        className={clsx(
                                            'flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-bold transition-all',
                                            appearance === app
                                                ? 'bg-card text-foreground shadow-md ring-1 ring-border border border-transparent scale-[1.02]'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        <span className="capitalize">{app}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="px-2 mt-4 text-xs leading-relaxed text-muted-foreground/60 font-medium italic">
                                Choose how WAVES appears on your device.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-2 mb-6 px-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
                                <Sun className="w-3.5 h-3.5" />
                                Color Stories
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id as any)}
                                        className={clsx(
                                            'w-full flex items-center justify-between p-4 rounded-3xl text-left transition-all group border',
                                            theme === t.id
                                                ? 'bg-card border-primary/20 shadow-lg shadow-primary/5 ring-1 ring-primary/10'
                                                : 'bg-transparent border-transparent hover:bg-muted/40 hover:border-border/50'
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner flex flex-col border border-border/20 shrink-0">
                                                <div className={clsx('h-1/2 w-full bg-white', t.id === 'midnight' && '!bg-[#111]')} />
                                                <div className={clsx('h-1/2 w-full relative', t.colors[1])}>
                                                    <div className={clsx('absolute top-0 right-1/4 w-1/2 h-full', t.colors[0])} />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-foreground">{t.name}</h3>
                                                <p className="text-[11px] text-muted-foreground/80 leading-tight">{t.desc}</p>
                                            </div>
                                        </div>
                                        <div className="pr-1">
                                            <div className={clsx(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                theme === t.id ? "border-primary bg-primary/10" : "border-border group-hover:border-primary/30"
                                            )}>
                                                {theme === t.id && <div className="w-2 rounded-full h-2 bg-primary shadow-sm" />}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Organization & Maintenance */}
                    <div className="lg:col-span-7 space-y-16">
                        <section>
                            <div className="flex items-center gap-2 mb-6 px-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
                                <Layers className="w-3.5 h-3.5" />
                                Currents
                            </div>
                            <CurrentsManager />
                            <p className="mt-4 px-1 text-xs text-muted-foreground/60 font-medium leading-relaxed italic">
                                Currents group your favorite voices into topical streams.
                            </p>
                        </section>

                        <section className="pt-8 border-t border-border/10">
                            <div className="flex items-center gap-2 mb-6 px-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
                                <Rss className="w-3.5 h-3.5" />
                                Subscribed Voices
                            </div>
                            <FeedManager />
                        </section>

                        <section className="pt-12 border-t-2 border-dashed border-border/10">
                            <div className="flex items-center gap-2 mb-6 px-1 text-[10px] font-black tracking-[0.2em] text-red-500 uppercase">
                                <Trash2 className="w-3.5 h-3.5" />
                                Maintenance
                            </div>
                            <div className="bg-red-500/5 border border-red-500/10 rounded-[2rem] p-6 lg:p-8 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Clean Archive</h3>
                                        <p className="text-xs text-muted-foreground/70 mt-1">Free up storage by removing old, unsaved articles.</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Archive Size</span>
                                        <span className={clsx(
                                            "text-lg font-black font-sans leading-none",
                                            (oldArticlesCount || 0) > 0 ? "text-red-500" : "text-muted-foreground/20"
                                        )}>
                                            {isLoadingCount ? '...' : oldArticlesCount || 0}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (confirm(`Are you sure you want to delete ${oldArticlesCount || 0} articles older than 30 days? (Saved articles will be preserved)`)) {
                                            flushArticles(30, {
                                                onSuccess: () => {
                                                    alert('Articles older than 30 days have been cleared.');
                                                }
                                            });
                                        }
                                    }}
                                    disabled={isFlushing || !oldArticlesCount}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-card border border-border/50 rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-red-500 hover:text-white hover:border-red-600 transition-all disabled:opacity-30 disabled:hover:bg-card disabled:hover:text-foreground shadow-sm active:scale-[0.98]"
                                >
                                    {isFlushing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Flush 30-Day Archive
                                </button>

                                <div className="p-4 bg-muted/30 rounded-2xl border border-border/10">
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        <strong>Note:</strong> Articles that you have explicitly saved will <span className="text-foreground font-bold">never</span> be deleted by this process.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
