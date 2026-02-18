/**
 * Optimizes YouTube Music image URLs.
 * @param {Array} thumbnails - Array of thumbnail objects from API.
 * @param {string} size - 'low' | 'medium' | 'high' | 'max'
 * @returns {string} Optimized URL
 */
export const getOptimizedImage = (thumbnails, size = 'medium') => {
    if (!thumbnails || thumbnails.length === 0) {
        return 'https://placehold.co/300x300/333/333/png?text=No+Image';
    }

    // Sort by height/width to ensure order
    const sorted = [...thumbnails].sort((a, b) => (a.width || 0) - (b.width || 0));

    let selectedThumb;

    switch (size) {
        case 'low': // ~60px - 100px (Lists)
            selectedThumb = sorted[0]; // Smallest
            break;
        case 'medium': // ~300px (Grid Cards)
            // Pick one in the middle or find closest to 300
            selectedThumb = sorted.find(t => t.width >= 200) || sorted[Math.floor(sorted.length / 2)];
            break;
        case 'high': // ~500px+ (Player / Hero)
            selectedThumb = sorted[sorted.length - 1]; // Largest
            break;
        case 'max': // Force max resolution via regex
            selectedThumb = sorted[sorted.length - 1];
            break;
        default:
            selectedThumb = sorted[sorted.length - 1];
    }

    if (!selectedThumb) return '';

    let url = selectedThumb.url;

    // Apply Google Image Resizing params if applicable
    // e.g., s120-c, w544-h544, etc.

    // Check if it's a Google-hosted image
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
        // If it already has sizing params (usually start with =), strip them to get base URL
        // However, some URLs might not use =. But typical YouTube/Google ones do.
        let baseUrl = url;
        if (url.includes('=')) {
            baseUrl = url.split('=')[0];
        }

        switch (size) {
            case 'low': // ~100px
                return baseUrl + '=w120-h120-l90-rj';
            case 'medium': // ~300px
                return baseUrl + '=w300-h300-l90-rj';
            case 'high': // ~544px
            case 'max':
                return baseUrl + '=w544-h544-l90-rj';
        }
    }

    return url;
};
