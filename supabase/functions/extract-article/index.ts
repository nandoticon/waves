import { Readability } from 'npm:@mozilla/readability';
import { DOMParser } from 'npm:linkedom';
import { createClient } from 'npm:@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  // 1. Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const { articles } = await req.json();

    if (!articles || !Array.isArray(articles)) {
      throw new Error('An array of articles is required');
    }

    console.log(`Extracting content for ${articles.length} articles...`);

    // Process in parallel (batches of 5 to avoid memory issues)
    const batchSize = 5;
    let processedCount = 0;

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      await Promise.all(batch.map(async (article: { url: string; id: string; image_url?: string | null }) => {
        if (!article.url || !article.id) return;

        try {
          console.log(`Fetching ${article.url}...`);
          // Add timeout to fetch
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(article.url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.error(`Failed to fetch ${article.url}: ${response.status} ${response.statusText}`);
            return;
          }

          const html = await response.text();

          // Parse with linkedom
          const doc = new DOMParser().parseFromString(html, 'text/html');

          // Use readability to extract content
          const reader = new Readability(doc as unknown as unknown as Document);
          const articleData = reader.parse();

          if (articleData && articleData.content) {
            // Try to find a featured image if missing from RSS
            let featuredImage = null;
            if (!article.image_url) {
              const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                doc.querySelector('meta[name="og:image"]')?.getAttribute('content') ||
                doc.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content') ||
                doc.querySelector('meta[property="og:image:url"]')?.getAttribute('content');

              const twitterImg = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
                doc.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content');

              const linkImg = doc.querySelector('link[rel="image_src"]')?.getAttribute('href');
              const thumbImg = doc.querySelector('meta[name="thumbnail"]')?.getAttribute('content');

              featuredImage = ogImg || twitterImg || linkImg || thumbImg;
            }

            interface UpdateData {
              content: string;
              image_url?: string;
            }
            // Update the article in the database
            const updateData: UpdateData = {
              content: articleData.content,
            };

            if (featuredImage) {
              console.log(`Found featured image for ${article.url}: ${featuredImage}`);
              updateData.image_url = featuredImage;
            }

            const { error } = await supabase
              .from('articles')
              .update(updateData as unknown as Record<string, unknown>)
              .eq('id', article.id);

            if (error) {
              console.error(`Failed to update DB for ${article.id}:`, error);
            } else {
              processedCount++;
              console.log(`Successfully extracted and updated: ${article.url}`);
            }
          } else {
            console.log(`Readability could not extract content for: ${article.url}`);
          }
        } catch (err: unknown) {
          console.error(`Error processing ${article.url}:`, err instanceof Error ? err.message : err);
        }
      }));
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${articles.length} articles, successfully extracted ${processedCount}.`
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: unknown) {
    console.error('Extraction error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
