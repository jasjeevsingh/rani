const fetch = require('node-fetch');
const { createEmbeddingClient } = require('../common/ai/factory');

const DEFAULT_OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_EMBEDDING_MODEL = process.env.RANI_EMBEDDING_MODEL || 'qwen3-embedding:8b';

/**
 * Service responsible for generating and storing embeddings for document chunks
 */
class DocumentEmbeddingService {
    constructor(databaseClient) {
        this.dbClient = databaseClient;
    }

    db() {
        return this.dbClient.getDb();
    }

    vectorToBuffer(vector) {
        const floatArray = Float32Array.from(vector || []);
        return Buffer.from(floatArray.buffer);
    }

    async getEmbeddingContext() {
        try {
            const baseUrl = DEFAULT_OLLAMA_BASE_URL;
            const healthResponse = await fetch(`${baseUrl}/api/tags`);
            if (!healthResponse.ok) {
                console.warn(`[DocumentEmbeddingService] Failed to reach Ollama at ${baseUrl}. Status: ${healthResponse.status}`);
                return { success: false, reason: 'ollama-unreachable', baseUrl, status: healthResponse.status };
            }

            const tags = await healthResponse.json().catch(() => null);
            const models = Array.isArray(tags?.models) ? tags.models : [];
            const hasModel = models.some(entry => entry?.name === DEFAULT_EMBEDDING_MODEL);
            if (!hasModel) {
                console.warn(`[DocumentEmbeddingService] Embedding model "${DEFAULT_EMBEDDING_MODEL}" is not installed in Ollama.`);
                return { success: false, reason: 'model-not-installed', baseUrl, model: DEFAULT_EMBEDDING_MODEL };
            }

            const client = createEmbeddingClient('ollama', {
                baseUrl,
                model: DEFAULT_EMBEDDING_MODEL,
            });
            return { success: true, client, provider: 'ollama', model: DEFAULT_EMBEDDING_MODEL };
        } catch (error) {
            console.error('[DocumentEmbeddingService] Failed to initialize Ollama embedding client:', error);
            return { success: false, reason: 'client-init-failed', error };
        }
    }

    getChunksNeedingEmbedding({ documentId = null, limit = 64 } = {}) {
        const whereDocument = documentId ? 'AND document_id = ?' : '';
        const stmt = this.db().prepare(`
            SELECT id, document_id, chunk_index, content, metadata
            FROM document_chunks
            WHERE (embedding IS NULL OR sync_state != 'embedded')
            ${whereDocument}
            ORDER BY updated_at ASC
            LIMIT ?
        `);
        return documentId
            ? stmt.all(documentId, limit)
            : stmt.all(limit);
    }

    updateChunksWithEmbeddings(chunks, embeddings, provider, model) {
        const now = Math.floor(Date.now() / 1000);
        const updateStmt = this.db().prepare(`
            UPDATE document_chunks
            SET embedding = ?, metadata = ?, updated_at = ?, sync_state = 'embedded'
            WHERE id = ?
        `);

        const txn = this.db().transaction((chunkBatch, embeddingBatch) => {
            chunkBatch.forEach((chunk, index) => {
                const vector = embeddingBatch[index];
                if (!Array.isArray(vector) || vector.length === 0) {
                    throw new Error('Embedding provider returned empty vector.');
                }

                const buffer = this.vectorToBuffer(vector);
                const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
                metadata.embeddingModel = model;
                metadata.embeddingProvider = provider;
                metadata.embeddingDimension = vector.length;
                metadata.embeddingUpdatedAt = now;

                updateStmt.run(buffer, JSON.stringify(metadata), now, chunk.id);
            });
        });

        txn(chunks, embeddings);
    }

    async embedDocument(documentId, options = {}) {
        return this.embedChunks({ ...options, documentId });
    }

    async embedPendingChunks(options = {}) {
        return this.embedChunks(options);
    }

    async embedChunks({ documentId = null, limit = 64, batchSize = 16 } = {}) {
        const chunks = this.getChunksNeedingEmbedding({ documentId, limit });
        if (!chunks.length) {
            return { success: true, processed: 0, skipped: true, reason: 'no-chunks' };
        }

        const context = await this.getEmbeddingContext();
        if (!context.success) {
            console.warn(`[DocumentEmbeddingService] Skipping chunk embedding: ${context.reason}`);
            return { success: false, processed: 0, skipped: true, reason: context.reason, details: context };
        }

        const { client, provider, model: embeddingModel } = context;

        let processed = 0;
        try {
            for (let index = 0; index < chunks.length; index += batchSize) {
                const batch = chunks.slice(index, index + batchSize);
                const texts = batch.map(chunk => chunk.content);
                const embeddings = await client.embedTexts(texts);
                if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
                    throw new Error('Embedding provider returned unexpected result set.');
                }

                this.updateChunksWithEmbeddings(batch, embeddings, provider, embeddingModel);
                processed += batch.length;
            }
        } catch (error) {
            console.error('[DocumentEmbeddingService] Embedding process failed:', error);
            return { success: false, processed, skipped: false, reason: 'embedding-error' };
        }

        return {
            success: true,
            processed,
            provider,
            model: embeddingModel,
            documentScoped: !!documentId
        };
    }

    async embedQuery(text) {
        if (!text || !text.trim()) {
            return { success: false, reason: 'empty-query' };
        }

        const context = await this.getEmbeddingContext();
        if (!context.success) {
            console.warn(`[DocumentEmbeddingService] Query embedding failed: ${context.reason}`);
            return context;
        }

        try {
            const embeddings = await context.client.embedTexts([text.trim()]);
            if (!Array.isArray(embeddings) || embeddings.length === 0) {
                return { success: false, reason: 'no-embedding' };
            }

            console.log(`[DocumentEmbeddingService] Generated query embedding using ${context.provider}/${context.model}.`);
            return {
                success: true,
                embedding: embeddings[0],
                provider: context.provider,
                model: context.model
            };
        } catch (error) {
            console.error('[DocumentEmbeddingService] Failed to embed query:', error);
            return { success: false, reason: 'embedding-error', error };
        }
    }
}

module.exports = DocumentEmbeddingService;
