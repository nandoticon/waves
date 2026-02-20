export function stripHtml(html: string): string {
    if (!html) return '';

    // Remove all HTML tags
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent || '';

    // Additional cleaning: trim whitespace and remove double lines
    return text.trim().replace(/\n\s*\n/g, '\n');
}

export function decodeEntities(text: string): string {
    if (!text) return '';
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.documentElement.textContent || '';
}

export function cleanExcerpt(text: string): string {
    if (!text) return '';
    // First strip HTML, then decode entities
    return decodeEntities(stripHtml(text));
}
