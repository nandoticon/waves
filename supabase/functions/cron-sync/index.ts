import { createClient } from 'npm:@supabase/supabase-js';
import Parser from 'npm:rss-parser';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['media:content', 'mediaContent'],
            ['enclosure', 'enclosure'],
            ['image', 'image'],
        ],
    }
});

Deno.serve(async () => {
    try {
        // Authenticate the cron request if coming from pg_cron, or allow no-verify for local testing if needed.
        // For security, usually you verify a secret header or JWT.

        console.log("Starting cron-sync job...");

        // 1. Fetch profiles to determine who needs a sync based on sync_interval
        const { data: profiles, error: profileErr } = await supabase
            .from('profiles')
            .select('id, sync_interval');

        if (profileErr) throw profileErr;

        let totalInserted = 0;

        for (const profile of profiles || []) {
            const intervalHours = profile.sync_interval || 24;

            // Collect feeds for this user that are due for a sync
            // A feed is due if: NOW() - last_fetched_at > intervalHours
            // We'll query subscriptions for this user, then join feeds.
            const { data: subscriptions, error: subErr } = await supabase
                .from('subscriptions')
                .select('feed_id, feeds(id, url, last_fetched_at)')
                .eq('user_id', profile.id);

            if (subErr || !subscriptions) continue;

            const now = new Date();
            const feedsToSync = (subscriptions || [])
                .map((sub: any) => sub.feeds)
                .filter(Boolean)
                .filter((feed: any) => {
                    if (!feed.last_fetched_at) return true;
                    const lastFetched = new Date(feed.last_fetched_at);
                    const hoursSince = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);
                    return hoursSince >= intervalHours;
                });

            // Sync the due feeds
            for (const feed of feedsToSync) {
                try {
                    console.log(`Syncing feed (Cron): ${feed.url}`);
                    const feedData = await parser.parseURL(feed.url);

                    const articlesToInsert = feedData.items.map((item: any) => ({
                        feed_id: feed.id,
                        title: item.title?.substring(0, 500) || 'Untitled',
                        url: item.link || '',
                        author: item.creator || item.author || null,
                        excerpt: (item.contentSnippet || item.content || '').substring(0, 500),
                        content: item.contentEncoded || item.content || '',
                        published_at: item.isoDate || item.pubDate || new Date().toISOString(),
                        image_url: item.enclosure?.url || item.image?.url || item.mediaContent?.['$']?.url || null
                    })).filter((a: any) => a.url);

                    if (articlesToInsert.length > 0) {
                        const { data: inserted, error: insertErr } = await supabase
                            .from('articles')
                            .upsert(articlesToInsert, { onConflict: 'url', ignoreDuplicates: true })
                            .select('id, url');

                        if (insertErr) {
                            console.error(`Error inserting articles for ${feed.url}:`, insertErr);
                        } else if (inserted && inserted.length > 0) {
                            totalInserted += inserted.length;

                            // Trigger full-text extraction for these new articles
                            supabase.functions.invoke('extract-article', {
                                body: { articles: inserted }
                            }).catch((err: unknown) => console.error('Cron: Failed to trigger extract-article:', err));
                        }
                    }

                    // Update last_fetched_at
                    await supabase
                        .from('feeds')
                        .update({ last_fetched_at: new Date().toISOString() })
                        .eq('id', feed.id);

                } catch (feedErr) {
                    console.error(`Failed to sync feed ${feed.url}:`, feedErr);
                }
            }
        }

        return new Response(JSON.stringify({ success: true, newArticles: totalInserted }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: unknown) {
        console.error("Cron sync failed:", err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
