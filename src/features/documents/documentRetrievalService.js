const DocumentEmbeddingService = require('./documentEmbeddingService');

class DocumentRetrievalService {
    constructor(databaseClient) {
        this.dbClient = databaseClient;
        this.embeddingService = new DocumentEmbeddingService(databaseClient);
    }

    db() {
        return this.dbClient.getDb();
    }

    vectorFromBuffer(buffer) {
        if (!buffer) return null;
        return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
    }

    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

        let dot = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            const a = vecA[i];
            const b = vecB[i];
            dot += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    buildCandidateQuery(documentIds = [], candidateLimit) {
        const base = `SELECT id, document_id, chunk_index, content, embedding, metadata
            FROM document_chunks
            WHERE embedding IS NOT NULL AND sync_state = 'embedded'`;

        if (documentIds.length > 0) {
            const placeholders = documentIds.map(() => '?').join(',');
            return {
                query: `${base} AND document_id IN (${placeholders}) ORDER BY updated_at DESC LIMIT ?`,
                params: [...documentIds, candidateLimit]
            };
        }

        return {
            query: `${base} ORDER BY updated_at DESC LIMIT ?`,
            params: [candidateLimit]
        };
    }

    fetchCandidateChunks(documentIds = [], candidateLimit = 100) {
        const { query, params } = this.buildCandidateQuery(documentIds, candidateLimit);
        return this.db().prepare(query).all(...params);
    }

    async search({ query, documentIds = [], limit = 5, candidateLimit = 100, minScore = 0.15 } = {}) {
        if (!query || !query.trim()) {
            return { success: false, results: [], reason: 'empty-query' };
        }

        const embeddingResult = await this.embeddingService.embedQuery(query);
        if (!embeddingResult.success) {
            console.warn(`[DocumentRetrievalService] Query embedding unavailable: ${embeddingResult.reason}`);
            return { success: false, results: [], reason: embeddingResult.reason || 'embedding-failed' };
        }

        const candidateRows = this.fetchCandidateChunks(documentIds, Math.max(candidateLimit, limit * 4));
        console.log(`[DocumentRetrievalService] Retrieved ${candidateRows.length} candidate chunks for retrieval.`);
        if (!candidateRows.length) {
            return { success: true, results: [], provider: embeddingResult.provider, model: embeddingResult.model };
        }

        const queryVector = Float32Array.from(embeddingResult.embedding || []);

        const scored = candidateRows
            .map(row => {
                try {
                    const chunkVector = this.vectorFromBuffer(row.embedding);
                    if (!chunkVector) return null;

                    const score = this.cosineSimilarity(queryVector, chunkVector);
                    const metadata = row.metadata ? JSON.parse(row.metadata) : {};

                    return {
                        id: row.id,
                        documentId: row.document_id,
                        chunkIndex: row.chunk_index,
                        content: row.content,
                        metadata,
                        score
                    };
                } catch (error) {
                    console.warn('[DocumentRetrievalService] Failed to score chunk:', error);
                    return null;
                }
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);

        let results = scored
            .filter(item => item.score >= minScore)
            .slice(0, limit);

        if (results.length === 0 && scored.length > 0) {
            console.log('[DocumentRetrievalService] No chunks met minScore threshold; falling back to top-ranked items.');
            results = scored.slice(0, Math.min(limit, scored.length));
        }

        console.log(`[DocumentRetrievalService] Returning ${results.length} chunks (top score=${results[0]?.score?.toFixed?.(3) ?? 'n/a'})`);

        return {
            success: true,
            results,
            provider: embeddingResult.provider,
            model: embeddingResult.model
        };
    }
}

module.exports = DocumentRetrievalService;
