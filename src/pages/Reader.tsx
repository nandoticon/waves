import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Share, Bookmark, Loader2, ExternalLink } from 'lucide-react';
import { useArticle, useSavedArticles, useToggleSave, useMarkAsRead } from '../hooks/useApi';
import DOMPurify from 'dompurify';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function Reader() {
    const { id } = useParams<{ id: string }>();
    const { data: article, isLoading } = useArticle(id);
    const { data: savedArticles } = useSavedArticles();
    const { mutateAsync: toggleSave, isPending: isSaving } = useToggleSave();
    const { mutate: markAsRead } = useMarkAsRead();

    useEffect(() => {
        if (id && article) {
            markAsRead(id);
        }
    }, [id, article, markAsRead]);

    const isSaved = savedArticles?.some((a: any) => a.id === id) || false;

    if (isLoading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="bg-background min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Article not found.</p>
                <Link to="/" className="text-primary hover:underline">Go back home</Link>
            </div>
        );
    }

    // Use stored image_url or attempt to extract from content if present
    const imgMatch = article.content?.match(/<img[^>]+src="([^">]+)"/);
    const heroImage = article.image_url || imgMatch?.[1] || null;

    // Sanitize content
    const sanitizedContent = DOMPurify.sanitize(article.content || '', { USE_PROFILES: { html: true } });

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: article.title,
                    url: article.url,
                });
            } catch (err) {
                console.error('Error sharing', err);
            }
        } else {
            // Fallback copy to clipboard
            navigator.clipboard.writeText(article.url || window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    return (
        <div className="bg-background min-h-screen animate-in slide-in-from-bottom-4 duration-500">
            <header className="sticky top-0 bg-background/90 backdrop-blur-xl z-10 flex items-center justify-between p-4 px-6 border-b border-border/10">
                <Link to="/" aria-label="Go Back" className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-4">
                    <button onClick={handleShare} aria-label="Share Article" className="text-muted-foreground hover:text-foreground transition-colors">
                        <Share className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => id && toggleSave({ articleId: id, isSaved })}
                        disabled={isSaving}
                        aria-label={isSaved ? "Remove from Saved" : "Save Article"}
                        className={clsx(
                            "transition-colors disabled:opacity-50",
                            isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Bookmark className={clsx("w-5 h-5", isSaved && "fill-current")} />
                    </button>
                </div>
            </header>

            <article className="max-w-[480px] mx-auto px-6 py-8 pb-32">
                <div className="text-xs font-sans font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2 mb-6">
                    {article.feeds?.icon_url ? (
                        <img src={article.feeds.icon_url} alt="" className="w-4 h-4 rounded object-cover shrink-0 grayscale opacity-80" />
                    ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 shrink-0" />
                    )}
                    {article.feeds?.title || new URL(article.url || 'https://example.com').hostname.toUpperCase()}
                </div>

                {heroImage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative aspect-[16/9] w-[calc(100%+2rem)] -ml-4 overflow-hidden rounded-3xl bg-muted mb-8"
                    >
                        <img
                            src={heroImage}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    </motion.div>
                )}

                <h1 className="text-[32px] leading-[1.2] font-serif font-medium text-foreground mb-6">
                    {article.title}
                </h1>

                <div className="flex flex-col gap-1 mb-8">
                    {article.author && <span className="text-[15px] font-sans text-foreground/90">{article.author}</span>}
                    <span className="text-[14px] font-sans text-muted-foreground/80">
                        {article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}
                    </span>
                </div>

                <figure className="mb-10 -mx-6 sm:mx-0">
                    <div className="w-full aspect-[4/3] bg-muted sm:rounded-2xl overflow-hidden relative">
                        <motion.img
                            src={heroImage}
                            alt="Article hero"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                </figure>

                <div
                    className="prose prose-lg dark:prose-invert prose-p:font-serif prose-p:leading-[1.8] prose-p:text-[19px] prose-p:text-foreground/90 prose-a:text-primary prose-img:rounded-xl mx-auto"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />

                <div className="mt-16 pt-8 border-t border-border/10">
                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full p-6 rounded-2xl bg-card border border-border/50 hover:bg-muted transition-all group group-hover:shadow-md"
                    >
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-sans font-bold tracking-widest text-muted-foreground uppercase">Read the source</span>
                            <span className="text-[17px] font-serif font-medium text-foreground">View Original Post</span>
                        </div>
                        <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                </div>
            </article>
        </div>
    );
}
