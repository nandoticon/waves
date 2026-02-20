import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export function useCurrents() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['currents', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('currents')
                .select('*')
                .order('order_index');

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });
}

export function useFeeds() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['feeds', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .rpc('get_feeds_with_last_article', { user_id_param: user.id });

            if (error) throw error;

            // Transform data to match the expected structure if necessary
            // The RPC returns { feed_id, current_id, title, url, icon_url, last_article_at }
            return data.map((item: { feed_id: string, current_id: string, title?: string, url?: string, icon_url?: string, last_article_at?: string }) => ({
                feed_id: item.feed_id,
                current_id: item.current_id,
                feeds: {
                    id: item.feed_id,
                    title: item.title,
                    url: item.url,
                    icon_url: item.icon_url,
                    last_article_at: item.last_article_at
                }
            }));
        },
        enabled: !!user,
    });
}

export function useArticles(currentId?: string, page: number = 0) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['articles', user?.id, currentId, page],
        queryFn: async () => {
            if (!user) return [];

            const pageSize = 30;

            let query = supabase
                .from('articles')
                .select(`
          id,
          title,
          excerpt:content, 
          author,
          published_at,
          url,
          image_url,
          feeds!inner (
            title,
            icon_url,
            subscriptions!inner (
               current_id,
               user_id
            )
          )
        `)
                .eq('feeds.subscriptions.user_id', user.id)
                .order('published_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (currentId && currentId !== 'all') {
                if (currentId === 'none') {
                    query = query.is('feeds.subscriptions.current_id', null);
                } else {
                    query = query.eq('feeds.subscriptions.current_id', currentId);
                }
            }

            const { data, error } = await query;

            if (error) throw error;

            // Ensure content is excerpted safely
            return data.map((article: Record<string, unknown> & { excerpt?: string }) => ({
                ...article,
                excerpt: article.excerpt ? article.excerpt.substring(0, 150).replace(/<[^>]+>/g, '') + '...' : ''
            }));
        },
        enabled: !!user,
    });
}

export function useSavedArticles() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['saved_articles', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('saved_articles')
                .select(`
          article_id,
          articles (
            id,
            title,
            excerpt:content,
            author,
            published_at,
            url,
            feeds (
              title,
              icon_url
            )
          )
        `)
                .order('id', { ascending: false });

            if (error) throw error;
            return data.map((s: Record<string, unknown> & { articles: unknown }) => {
                const article = s.articles as Record<string, unknown> & { excerpt?: string };
                return {
                    ...article,
                    excerpt: article?.excerpt ? article.excerpt.substring(0, 150).replace(/<[^>]+>/g, '') + '...' : ''
                } as Record<string, any>;
            });
        },
        enabled: !!user,
    });
}

export function useToggleSave() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ articleId, isSaved }: { articleId: string, isSaved: boolean }) => {
            if (!user) throw new Error("Must be logged in to save articles");

            if (isSaved) {
                const { error } = await supabase
                    .from('saved_articles')
                    .delete()
                    .match({ user_id: user.id, article_id: articleId });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('saved_articles')
                    .insert({ user_id: user.id, article_id: articleId });
                if (error) throw error;
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['saved_articles'] });
        }
    });
}

export function useAddFeed() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ url, currentId }: { url: string; currentId?: string }) => {
            if (!user) throw new Error("Must be logged in to add a feed");

            // 1. Parse via edge function to get feed metadata
            const { data: parsedFeed, error: fnError } = await supabase.functions.invoke('parse-rss', {
                body: { url },
            });

            if (fnError || !parsedFeed) throw new Error(fnError?.message || 'Failed to parse RSS feed');

            const domain = parsedFeed.link ? new URL(parsedFeed.link).hostname : new URL(url).hostname;
            const icon_url = `https://icon.horse/icon/${domain}`;

            // 2. Upsert Feed
            const { data: feedData, error: feedError } = await supabase
                .from('feeds')
                .upsert({
                    url,
                    title: parsedFeed.title || domain,
                    icon_url,
                    last_fetched_at: new Date().toISOString()
                }, { onConflict: 'url' })
                .select()
                .single();

            if (feedError) throw feedError;

            // 3. Upsert Subscription
            // Avoid duplicate subs
            const { data: existingSub } = await supabase
                .from('subscriptions')
                .select('id')
                .match({ user_id: user.id, feed_id: feedData.id })
                .maybeSingle();

            if (!existingSub) {
                const { error: subError } = await supabase
                    .from('subscriptions')
                    .insert({
                        user_id: user.id,
                        feed_id: feedData.id,
                        current_id: currentId || null
                    });
                if (subError) throw subError;
            }

            // 4. Upsert Articles (latest 50)
            const articlesToInsert = (parsedFeed.items || []).slice(0, 50).map((item: { title?: string, link?: string, imageUrl?: string, content?: string, contentEncoded?: string, contentSnippet?: string, creator?: string, author?: string, isoDate?: string, pubDate?: string }) => ({
                feed_id: feedData.id,
                title: item.title?.substring(0, 255) || 'Untitled',
                url: item.link,
                image_url: item.imageUrl || null,
                content: item.content || item.contentEncoded || item.contentSnippet || '',
                author: item.creator || item.author || '',
                published_at: item.isoDate || item.pubDate ? new Date(item.isoDate || item.pubDate || '').toISOString() : new Date().toISOString()
            }));

            if (articlesToInsert.length > 0) {
                const { data: insertedArticles, error: articlesError } = await supabase
                    .from('articles')
                    .upsert(articlesToInsert, { onConflict: 'url' })
                    .select('id, url');

                if (articlesError) {
                    console.error('Error upserting articles:', articlesError);
                } else if (insertedArticles && insertedArticles.length > 0) {
                    // Trigger full text extraction asynchronously
                    supabase.functions.invoke('extract-article', {
                        body: { articles: insertedArticles }
                    }).catch(err => console.error('Failed to trigger extract-article:', err));
                }
            }

            return feedData;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            queryClient.invalidateQueries({ queryKey: ['articles'] });
        }
    });
}

export function useOldArticlesCount(days: number = 30) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['old_articles_count', user?.id, days],
        queryFn: async () => {
            if (!user) return 0;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // 1. Get IDs of saved articles for this user
            const { data: savedData } = await supabase
                .from('saved_articles')
                .select('article_id')
                .eq('user_id', user.id);

            const savedIds = savedData?.map(s => s.article_id) || [];

            // 2. Count articles older than X days NOT in savedIds
            let query = supabase
                .from('articles')
                .select('*', { count: 'exact', head: true })
                .lt('published_at', cutoffDate.toISOString());

            if (savedIds.length > 0) {
                query = query.not('id', 'in', `(${savedIds.join(',')})`);
            }

            const { count, error } = await query;

            if (error) throw error;
            return count || 0;
        },
        enabled: !!user,
    });
}

export function useFlushOldArticles() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (days: number = 60) => {
            if (!user) return;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // 1. Find articles older than X days
            const { data: oldArticles, error: fetchError } = await supabase
                .from('articles')
                .select('id')
                .lt('published_at', cutoffDate.toISOString());

            if (fetchError) throw fetchError;
            if (!oldArticles || oldArticles.length === 0) return;

            // 2. Find saved articles to exclude them (check all saved articles for this user)
            const { data: savedArticles } = await supabase
                .from('saved_articles')
                .select('article_id')
                .eq('user_id', user.id);

            const savedIds = new Set(savedArticles?.map(s => s.article_id));
            const idsToDelete = oldArticles
                .map(a => a.id)
                .filter(id => !savedIds.has(id));

            if (idsToDelete.length === 0) return;

            // 3. Delete from database
            const { error: deleteError } = await supabase
                .from('articles')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) throw deleteError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            queryClient.invalidateQueries({ queryKey: ['old_articles_count'] });
        }
    });
}

export function useLastSyncTime() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['last_sync', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('feeds')
                .select(`
                    last_fetched_at,
                    subscriptions!inner (user_id)
                `)
                .eq('subscriptions.user_id', user.id)
                .order('last_fetched_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data?.last_fetched_at || null;
        },
        enabled: !!user,
    });
}

export function useSyncFeeds() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { mutate: flushOldArticles } = useFlushOldArticles();

    return useMutation({
        mutationFn: async ({ onProgress }: { onProgress?: (current: number, total: number) => void } = {}) => {
            if (!user) throw new Error("Must be logged in to sync feeds");

            // Fetch user's feeds
            const { data: subs, error: subsError } = await supabase
                .from('subscriptions')
                .select(`
                    feed_id,
                    feeds ( id, url )
                `);

            if (subsError) throw subsError;

            const feeds = subs.map(s => s.feeds).filter(Boolean);
            let totalNewArticles = 0;
            const totalFeeds = feeds.length;
            let currentFeedIndex = 0;

            if (onProgress) onProgress(currentFeedIndex, totalFeeds);

            // For simplicity, fetch all sequentially. In prod, do via edge function worker.
            for (const feed of feeds) {
                // @ts-expect-error ignore feed typing from supabase
                const { url, id: feed_id } = feed;
                try {
                    const { data: parsedFeed } = await supabase.functions.invoke('parse-rss', {
                        body: { url },
                    });

                    if (parsedFeed && parsedFeed.items) {
                        const articlesToInsert = parsedFeed.items.slice(0, 50).map((item: { title?: string, link?: string, imageUrl?: string, content?: string, contentEncoded?: string, contentSnippet?: string, creator?: string, author?: string, isoDate?: string, pubDate?: string }) => ({
                            feed_id,
                            title: item.title?.substring(0, 255) || 'Untitled',
                            url: item.link,
                            image_url: item.imageUrl || null,
                            content: item.content || item.contentEncoded || item.contentSnippet || '',
                            author: item.creator || item.author || '',
                            published_at: item.isoDate || item.pubDate ? new Date(item.isoDate || item.pubDate || '').toISOString() : new Date().toISOString()
                        }));

                        if (articlesToInsert.length > 0) {
                            const { data: insertedData, error: upsertError } = await supabase
                                .from('articles')
                                .upsert(articlesToInsert, { onConflict: 'url' })
                                .select('id, url');

                            if (!upsertError && insertedData) {
                                totalNewArticles += insertedData.length;

                                // Trigger full text extraction asynchronously
                                supabase.functions.invoke('extract-article', {
                                    body: { articles: insertedData }
                                }).catch(err => console.error('Failed to trigger extract-article:', err));
                            }
                        }

                        await supabase.from('feeds').update({ last_fetched_at: new Date().toISOString() }).eq('id', feed_id);
                    }
                } catch (err) {
                    console.error('Failed to sync feed', feed, err);
                }
                currentFeedIndex++;
                if (onProgress) onProgress(currentFeedIndex, totalFeeds);
            }
            return { count: totalNewArticles };
        },
        onSettled: () => {
            flushOldArticles(60);
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            queryClient.invalidateQueries({ queryKey: ['old_articles_count'] }); // Invalidate old_articles_count after flushing
            queryClient.invalidateQueries({ queryKey: ['last_sync'] });
        }
    });
}

export function useAddCurrent() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ name }: { name: string }) => {
            if (!user) throw new Error("Must be logged in to add a current");
            const { error } = await supabase.from('currents').insert({ name, user_id: user.id });
            if (error) throw error;
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['currents'] })
    });
}

export function useDeleteCurrent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('currents').delete().eq('id', id);
            if (error) throw error;
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['currents'] })
    });
}

export function useArticle(id?: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['article', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('articles')
                .select(`
                    id,
                    title,
                    content,
                    author,
                    published_at,
                    url,
                    image_url,
                    feeds (
                        title,
                        icon_url
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return {
                ...data,
                feeds: Array.isArray(data.feeds) ? data.feeds[0] : data.feeds
            } as Record<string, any>;
        },
        enabled: !!id && !!user
    });
}

export function useUnsubscribe() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (feedId: string) => {
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('subscriptions')
                .delete()
                .eq('user_id', user.id)
                .eq('feed_id', feedId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            queryClient.invalidateQueries({ queryKey: ['currents'] });
        },
    });
}

export function useReadArticles() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['read_articles', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('read_articles')
                .select('article_id');
            if (error) throw error;
            return data.map((r: { article_id: string }) => r.article_id);
        },
        enabled: !!user,
    });
}

export function useMarkAsRead() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (articleId: string) => {
            if (!user) return;
            const { error } = await supabase
                .from('read_articles')
                .upsert(
                    { user_id: user.id, article_id: articleId },
                    { onConflict: 'user_id,article_id' }
                );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['read_articles'] });
        }
    });
}

export function useUnmarkAsRead() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (articleId: string) => {
            if (!user) return;
            const { error } = await supabase
                .from('read_articles')
                .delete()
                .match({ user_id: user.id, article_id: articleId });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['read_articles'] });
        }
    });
}

export function useMarkOlderAsRead() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (days: number) => {
            if (!user) return;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // 1. Fetch unread articles older than X days
            // We join with read_articles to find those NOT in the list
            const { data: unreadArticles, error: fetchError } = await supabase
                .from('articles')
                .select('id')
                .lt('published_at', cutoffDate.toISOString());

            if (fetchError) throw fetchError;
            if (!unreadArticles || unreadArticles.length === 0) return;

            // 2. Filter out those already read (client-side simplicity)
            const { data: alreadyRead } = await supabase
                .from('read_articles')
                .select('article_id')
                .eq('user_id', user.id);

            const readIds = new Set(alreadyRead?.map(r => r.article_id));
            const toMark = unreadArticles
                .filter(a => !readIds.has(a.id))
                .map(a => ({ user_id: user.id, article_id: a.id }));

            if (toMark.length === 0) return;

            // 3. Batch insert (Supabase upsert handles this well)
            const { error: insertError } = await supabase
                .from('read_articles')
                .upsert(toMark, { onConflict: 'user_id,article_id' });

            if (insertError) throw insertError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['read_articles'] });
            queryClient.invalidateQueries({ queryKey: ['articles'] });
        }
    });
}

export function useProfile() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!user,
    });
}

export function useUpdateProfile() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
    });
}

export function useReorderCurrents() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (currents: { id: string, order_index: number }[]) => {
            if (!user) throw new Error("Must be logged in");

            // We need to upsert all at once
            const updates = currents.map(c => ({ id: c.id, user_id: user.id, order_index: c.order_index }));

            const { error } = await supabase
                .from('currents')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['currents'] })
    });
}

