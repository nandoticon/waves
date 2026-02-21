import { createClient } from 'npm:@supabase/supabase-js';
import { DOMParser } from 'npm:linkedom';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }

    try {
        // 1. Fetch articles with NULL image_url
        const { data: articles, error: fetchError } = await supabase
            .from('articles')
            .select('id, url')
            .is('image_url', null)
            .order('published_at', { ascending: false })
            .limit(20);

        if (fetchError) throw fetchError;
        if (!articles || articles.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No articles to process', count: 0 }), {
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Backfilling images for ${articles.length} articles...`);

        let foundCount = 0;

        // 2. Scrape each article
        for (const article of articles) {
            try {
                const response = await fetch(article.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    }
                });

                if (!response.ok) continue;

                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');

                const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
                const twitterImg = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
                const linkImg = doc.querySelector('link[rel="image_src"]')?.getAttribute('href');
                const thumbImg = doc.querySelector('meta[name="thumbnail"]')?.getAttribute('content');

                const imageUrl = ogImg || twitterImg || linkImg || thumbImg;

                if (imageUrl) {
                    await supabase
                        .from('articles')
                        .update({ image_url: imageUrl })
                        .eq('id', article.id);
                    foundCount++;
                    console.log(`Found image for: ${article.url}`);
                }
            } catch (e) {
                console.error(`Failed to process ${article.url}:`, e);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Processed ${articles.length} articles, found ${foundCount} images.`,
            count: foundCount
        }), {
            headers: { ...headers, 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        console.error('Backfill error:', err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
            headers: { ...headers, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
