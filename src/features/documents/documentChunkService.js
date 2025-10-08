const crypto = require('crypto');

/**
 * Handles splitting document text into chunks and persisting metadata needed for retrieval
 */
class DocumentChunkService {
    constructor(databaseClient) {
        this.dbClient = databaseClient;
        this.db = () => this.dbClient.getDb();
    }

    /**
     * Remove existing chunks before rebuilding
     */
    deleteChunks(documentId) {
        this.db().prepare('DELETE FROM document_chunks WHERE document_id = ?').run(documentId);
    }

    /**
     * Split text into approximate sized chunks preserving sentence boundaries where possible
     */
    splitIntoChunks(text, options = {}) {
        if (!text || !text.trim()) return [];

        const {
            maxChunkLength = 1200,
            minChunkLength = 400,
            overlap = 150
        } = options;

        const normalized = text.replace(/\r\n/g, '\n');
        const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

        const chunks = [];
        let buffer = '';
        let position = 0;

        const pushChunk = (content, startOffset) => {
            const trimmed = content.trim();
            if (!trimmed) return;
            const endOffset = startOffset + trimmed.length;
            chunks.push({
                content: trimmed,
                contentLength: trimmed.length,
                tokenCount: this.estimateTokenCount(trimmed),
                startOffset,
                endOffset
            });
        };

        for (const paragraph of paragraphs) {
            const nextBuffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
            if (nextBuffer.length < maxChunkLength) {
                buffer = nextBuffer;
                continue;
            }

            // If adding the paragraph makes it too large, flush the buffer first
            if (buffer.length >= minChunkLength) {
                pushChunk(buffer, position);
                position += buffer.length + 2; // account for removed newlines roughly
                buffer = paragraph;
            } else {
                // break long paragraph manually
                const hardChunks = this.hardSplitParagraph(nextBuffer, maxChunkLength, overlap);
                for (const hardChunk of hardChunks) {
                    pushChunk(hardChunk, position);
                    position += hardChunk.length;
                }
                buffer = '';
            }
        }

        if (buffer) {
            pushChunk(buffer, position);
        }

        // ensure overlap if configured
        if (overlap > 0 && chunks.length > 1) {
            const overlapped = [];
            for (let i = 0; i < chunks.length; i++) {
                const current = chunks[i];
                if (i === 0) {
                    overlapped.push(current);
                    continue;
                }
                const prev = chunks[i - 1];
                if (prev.contentLength < overlap) {
                    overlapped.push(current);
                    continue;
                }
                const prefix = prev.content.slice(-overlap);
                overlapped.push({
                    ...current,
                    content: `${prefix}\n\n${current.content}`,
                    contentLength: prefix.length + 2 + current.contentLength,
                    tokenCount: this.estimateTokenCount(`${prefix} ${current.content}`),
                    startOffset: current.startOffset - overlap,
                    endOffset: current.endOffset
                });
            }
            return overlapped;
        }

        return chunks;
    }

    hardSplitParagraph(text, maxChunkLength, overlap) {
        if (text.length <= maxChunkLength) return [text];

        const sentences = text.split(/(?<=[.!?])\s+/);
        const chunks = [];
        let buffer = '';

        for (const sentence of sentences) {
            const tentative = buffer ? `${buffer} ${sentence}` : sentence;
            if (tentative.length > maxChunkLength && buffer) {
                chunks.push(buffer);
                buffer = sentence;
            } else if (tentative.length > maxChunkLength) {
                chunks.push(...this.splitByLength(sentence, maxChunkLength, overlap));
                buffer = '';
            } else {
                buffer = tentative;
            }
        }
        if (buffer) chunks.push(buffer);
        return chunks;
    }

    splitByLength(text, maxChunkLength, overlap) {
        const segments = [];
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + maxChunkLength, text.length);
            segments.push(text.slice(start, end));
            start = end - overlap;
            if (start < 0) start = 0;
        }
        return segments;
    }

    estimateTokenCount(content) {
        if (!content) return 0;
        return Math.ceil(content.split(/\s+/).length * 1.3);
    }

    rebuildDocumentChunks(document, options = {}) {
        const text = options.overrideText || document.extracted_text || '';
        if (!text.trim()) {
            this.deleteChunks(document.id);
            return 0;
        }

        this.deleteChunks(document.id);

        const chunks = this.splitIntoChunks(text, options);
        if (chunks.length === 0) return 0;

        const insert = this.db().prepare(`
            INSERT INTO document_chunks (
                id, document_id, chunk_index, content, content_length, token_count,
                embedding, metadata, created_at, updated_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'pending')
        `);

        const now = Math.floor(Date.now() / 1000);
        const metadataTemplate = {
            filename: document.filename,
            contentType: document.content_type,
            uploadedAt: document.uploaded_at,
        };

        const run = this.db().transaction((chunkList) => {
            chunkList.forEach((chunk, index) => {
                const metadata = {
                    ...metadataTemplate,
                    startOffset: chunk.startOffset,
                    endOffset: chunk.endOffset
                };
                insert.run(
                    crypto.randomUUID(),
                    document.id,
                    index,
                    chunk.content,
                    chunk.contentLength,
                    chunk.tokenCount,
                    JSON.stringify(metadata),
                    now,
                    now
                );
            });
        });

        run(chunks);
        return chunks.length;
    }
}

module.exports = DocumentChunkService;

