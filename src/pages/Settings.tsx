import { useTheme } from '../lib/theme';
import { ChevronLeft, Moon, Sun, Monitor } from 'lucide-react';
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

    return (
        <div className="max-w-md mx-auto min-h-screen bg-background text-foreground animate-in fade-in duration-300">
            <header className="flex items-center justify-between p-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <Link to="/" className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full hover:bg-muted transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-base font-semibold">Theme</h1>
                <div className="w-10" />
            </header>

            <div className="p-4 space-y-8 pb-12">
                <section>
                    <div className="flex items-center gap-2 mb-4 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <span className="w-3 h-3 rounded-full bg-border inline-block overflow-hidden flex" style={{ background: 'linear-gradient(to right, #e2e8f0 50%, #0f172a 50%)' }}></span>
                        Appearance
                    </div>

                    <div className="flex bg-muted/50 p-1 rounded-2xl gap-1 border border-border/50 shadow-sm">
                        {(['system', 'light', 'dark'] as const).map((app) => (
                            <button
                                key={app}
                                onClick={() => setAppearance(app)}
                                className={clsx(
                                    'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all',
                                    appearance === app
                                        ? 'bg-card text-foreground shadow-sm ring-1 ring-border border border-transparent'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {app === 'system' && <Monitor className="w-4 h-4" />}
                                {app === 'light' && <Sun className="w-4 h-4" />}
                                {app === 'dark' && <Moon className="w-4 h-4" />}
                                <span className="capitalize">{app}</span>
                            </button>
                        ))}
                    </div>
                    <p className="px-2 mt-4 text-sm leading-relaxed text-muted-foreground">
                        Choose whether to follow your system setting or always use light/dark themes.
                    </p>
                </section>

                <section className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden p-2 space-y-1">
                    {THEMES.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id as any)}
                            className={clsx(
                                'w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all group',
                                theme === t.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex flex-col border border-border/50 shrink-0">
                                    <div className={clsx('h-1/2 w-full bg-white', t.id === 'midnight' && '!bg-[#111]')} />
                                    <div className={clsx('h-1/2 w-full relative', t.colors[1])}>
                                        <div className={clsx('absolute top-0 right-1/4 w-1/2 h-full', t.colors[0])} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-medium text-foreground">{t.name}</h3>
                                    <p className="text-sm text-muted-foreground">{t.desc}</p>
                                </div>
                            </div>
                            <div className="pr-2">
                                <div className={clsx(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                    theme === t.id ? "border-primary" : "border-border group-hover:border-primary/50"
                                )}>
                                    {theme === t.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                            </div>
                        </button>
                    ))}
                </section>

                <section className="pt-8">
                    <div className="flex items-center gap-2 mb-4 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <span className="w-3 h-3 rounded-full bg-border inline-block overflow-hidden flex" style={{ background: 'linear-gradient(to right, #0ea5e9 50%, #4338ca 50%)' }}></span>
                        Currents
                    </div>
                    <CurrentsManager />
                    <p className="px-2 mt-4 text-sm leading-relaxed text-muted-foreground">
                        Currents form the tabs on your home screen. Group feeds under a single topical thread to read them together.
                    </p>
                </section>

                <section className="pt-8 border-t border-border/10">
                    <div className="flex items-center gap-2 mb-4 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <span className="w-3 h-3 rounded-full bg-border inline-block overflow-hidden flex" style={{ background: 'linear-gradient(to right, #10b981 50%, #3b82f6 50%)' }}></span>
                        Subscribed Voices
                    </div>
                    <FeedManager />
                    <p className="px-2 mt-4 text-sm leading-relaxed text-muted-foreground">
                        Manage your active RSS subscriptions. Unsubscribing will stop fetching new articles from that voice.
                    </p>
                </section>
            </div>
        </div>
    );
}
