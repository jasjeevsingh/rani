const fetch = require('node-fetch');
const { createEmbeddingClient } = require('../common/ai/factory');

const DEFAULT_OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_EMBEDDING_MODEL = process.env.RANI_EMBEDDING_MODEL || 'nomic-embed-text';

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
            // Check for model with or without :latest tag
            const hasModel = models.some(entry => {
                const modelName = entry?.name || '';
                return modelName === DEFAULT_EMBEDDING_MODEL || 
                       modelName === `${DEFAULT_EMBEDDING_MODEL}:latest` ||
                       modelName.startsWith(`${DEFAULT_EMBEDDING_MODEL}:`);
            });
            if (!hasModel) {
                console.warn(`[DocumentEmbeddingService] Embedding model "${DEFAULT_EMBEDDING_MODEL}" is not installed in Ollama.`);
                console.warn(`[DocumentEmbeddingService] Available models:`, models.map(m => m?.name));
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
        console.log(`[DocumentEmbeddingService] updateChunksWithEmbeddings called:`, {
            chunkCount: chunks.length,
            embeddingCount: embeddings.length,
            provider,
            model
        });
        
        const now = Math.floor(Date.now() / 1000);
        const updateStmt = this.db().prepare(`
            UPDATE document_chunks
            SET embedding = ?, metadata = ?, updated_at = ?, sync_state = 'embedded'
            WHERE id = ?
        `);

        const txn = this.db().transaction((chunkBatch, embeddingBatch) => {
            chunkBatch.forEach((chunk, index) => {
                const vector = embeddingBatch[index];
                console.log(`[DocumentEmbeddingService] Processing chunk ${index + 1}/${chunkBatch.length}: id=${chunk.id.substring(0, 8)}, vectorLength=${vector?.length || 0}`);
                
                if (!Array.isArray(vector) || vector.length === 0) {
                    console.error(`[DocumentEmbeddingService] ERROR: Empty or invalid vector for chunk ${chunk.id}`);
                    throw new Error('Embedding provider returned empty vector.');
                }

                const buffer = this.vectorToBuffer(vector);
                console.log(`[DocumentEmbeddingService] Converted vector to buffer: ${buffer.length} bytes`);
                
                const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
                metadata.embeddingModel = model;
                metadata.embeddingProvider = provider;
                metadata.embeddingDimension = vector.length;
                metadata.embeddingUpdatedAt = now;

                const result = updateStmt.run(buffer, JSON.stringify(metadata), now, chunk.id);
                console.log(`[DocumentEmbeddingService] UPDATE result: changes=${result.changes}, lastInsertRowid=${result.lastInsertRowid}`);
            });
        });

        console.log(`[DocumentEmbeddingService] Starting transaction to update ${chunks.length} chunks...`);
        txn(chunks, embeddings);
        console.log(`[DocumentEmbeddingService] ✅ Transaction complete - ${chunks.length} chunks updated with embeddings`);
    }

    async embedDocument(documentId, options = {}) {
        return this.embedChunks({ ...options, documentId });
    }

    async embedPendingChunks(options = {}) {
        return this.embedChunks(options);
    }

    async embedChunks({ documentId = null, limit = 64, batchSize = 16 } = {}) {
        console.log(`[DocumentEmbeddingService] embedChunks called with documentId=${documentId}, limit=${limit}, batchSize=${batchSize}`);
        
        const chunks = this.getChunksNeedingEmbedding({ documentId, limit });
        console.log(`[DocumentEmbeddingService] Found ${chunks.length} chunks needing embedding`);
        
        if (!chunks.length) {
            return { success: true, processed: 0, skipped: true, reason: 'no-chunks' };
        }

        console.log(`[DocumentEmbeddingService] Getting embedding context...`);
        const context = await this.getEmbeddingContext();
        console.log(`[DocumentEmbeddingService] Embedding context result:`, context.success ? `success (${context.provider}/${context.model})` : `failed (${context.reason})`);
        
        if (!context.success) {
            console.warn(`[DocumentEmbeddingService] Skipping chunk embedding: ${context.reason}`);
            return { success: false, processed: 0, skipped: true, reason: context.reason, details: context };
        }

        const { client, provider, model: embeddingModel } = context;

        let processed = 0;
        const totalBatches = Math.ceil(chunks.length / batchSize);
        
        try {
            for (let index = 0; index < chunks.length; index += batchSize) {
                const currentBatch = Math.floor(index / batchSize) + 1;
                const batch = chunks.slice(index, index + batchSize);
                const texts = batch.map(chunk => chunk.content);
                
                console.log(`[DocumentEmbeddingService] Processing batch ${currentBatch}/${totalBatches} (${batch.length} chunks)...`);
                
                const embeddings = await client.embedTexts(texts);
                
                console.log(`[DocumentEmbeddingService] Received ${embeddings?.length || 0} embeddings from Ollama`);
                console.log(`[DocumentEmbeddingService] First embedding sample: dimension=${embeddings?.[0]?.length}, type=${typeof embeddings?.[0]}`);
                
                if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
                    console.error(`[DocumentEmbeddingService] ERROR: Expected ${batch.length} embeddings, got ${embeddings?.length || 0}`);
                    throw new Error('Embedding provider returned unexpected result set.');
                }

                console.log(`[DocumentEmbeddingService] About to call updateChunksWithEmbeddings with ${batch.length} chunks`);
                this.updateChunksWithEmbeddings(batch, embeddings, provider, embeddingModel);
                console.log(`[DocumentEmbeddingService] updateChunksWithEmbeddings returned successfully`);
                processed += batch.length;
                
                console.log(`[DocumentEmbeddingService] Batch ${currentBatch}/${totalBatches} complete. Total processed: ${processed}/${chunks.length}`);
            }
        } catch (error) {
            console.error('[DocumentEmbeddingService] Embedding process failed:', error);
            return { success: false, processed, skipped: false, reason: 'embedding-error' };
        }

        console.log(`[DocumentEmbeddingService] Embedding complete! Processed ${processed} chunks using ${provider}/${embeddingModel}`);
        
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
