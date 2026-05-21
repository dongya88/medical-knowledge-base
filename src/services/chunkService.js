export class ChunkService {
    constructor(options = {}) {
        this.chunkSize = options.chunkSize || 1000;
        this.chunkOverlap = options.chunkOverlap || 150;
        this.minChunkSize = options.minChunkSize || 800;
        this.maxChunkSize = options.maxChunkSize || 1200;
    }

    chunkText(text, metadata = {}) {
        if (!text || typeof text !== 'string' || text.length < 100) {
            console.warn('ChunkService: Invalid text input, length:', text?.length);
            return [];
        }

        try {
            const chunks = [];
            const chunkSize = 1000;
            const overlap = 150;

            for (let i = 0; i < text.length; i += chunkSize - overlap) {
                const start = i;
                const end = Math.min(i + chunkSize, text.length);
                const chunkText = text.substring(start, end).trim();

                if (chunkText.length >= 200) {
                    chunks.push({
                        text: chunkText,
                        metadata: {
                            ...metadata,
                            chunkIndex: chunks.length,
                            startChar: start,
                            endChar: end,
                            charCount: chunkText.length
                        }
                    });
                }

                if (end >= text.length) break;
            }

            return chunks;
        } catch (error) {
            console.error('ChunkService chunkText error:', error.message);
            return [];
        }
    }

    findBestSeparator(text, separators) {
        for (const separator of separators) {
            const index = text.lastIndexOf(separator);
            if (index > text.length * 0.3) {
                return separator;
            }
        }
        return null;
    }

    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\u200B/g, '')
            .replace(/\u3000/g, ' ')
            .replace(/[\uFEFF\uFFFE]/g, '')
            .trim();
    }

    splitByParagraphs(text) {
        return text.split(/\n\n+/).filter(p => p.trim().length > 50);
    }

    getChunkStats(chunks) {
        const charCounts = chunks.map(c => c.text.length);
        return {
            totalChunks: chunks.length,
            totalChars: charCounts.reduce((a, b) => a + b, 0),
            avgChunkSize: charCounts.length > 0 ? Math.round(charCounts.reduce((a, b) => a + b, 0) / charCounts.length) : 0,
            minChunkSize: charCounts.length > 0 ? Math.min(...charCounts) : 0,
            maxChunkSize: charCounts.length > 0 ? Math.max(...charCounts) : 0
        };
    }
}

export function createChunkService(options) {
    return new ChunkService(options);
}

export default ChunkService;