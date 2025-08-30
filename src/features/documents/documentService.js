const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Document Service for RANI
 * Handles PDF processing, text extraction, and document management
 */
class DocumentService {
    constructor(databaseClient, userDir) {
        this.db = databaseClient;
        this.userDir = userDir;
        this.documentsDir = path.join(userDir, 'documents');
        
        // Initialize directories without awaiting in constructor
        this.ensureDirectories().catch(error => {
            console.error('[DocumentService] Failed to create documents directory:', error);
        });
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.documentsDir, { recursive: true });
        } catch (error) {
            console.error('[DocumentService] Failed to create documents directory:', error);
        }
    }

    /**
     * Process and store an uploaded document
     * @param {string} filePath - Path to the uploaded file
     * @param {string} originalName - Original filename
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Document metadata
     */
    async processDocument(filePath, originalName, userId) {
        try {
            const documentId = crypto.randomUUID();
            const fileStats = await fs.stat(filePath);
            const contentType = this.getContentType(originalName);
            
            // Generate storage path
            const storagePath = path.join(this.documentsDir, `${documentId}${path.extname(originalName)}`);
            
            // Copy file to documents directory
            await fs.copyFile(filePath, storagePath);
            
            // Extract text content based on file type
            let extractedText = '';
            let metadata = {};
            
            if (contentType === 'application/pdf') {
                try {
                    const pdfResult = await this.extractPDFContent(storagePath);
                    extractedText = pdfResult.text;
                    metadata = pdfResult.metadata;
                } catch (error) {
                    console.warn('[DocumentService] PDF extraction failed, storing without text:', error.message);
                }
            } else if (contentType.startsWith('text/')) {
                extractedText = await fs.readFile(storagePath, 'utf-8');
            }

            // Store document metadata in database
            const document = {
                id: documentId,
                uid: userId,
                filename: originalName,
                content_type: contentType,
                file_path: storagePath,
                file_size: fileStats.size,
                extracted_text: extractedText,
                metadata: JSON.stringify(metadata),
                uploaded_at: Math.floor(Date.now() / 1000),
                sync_state: 'clean'
            };

            await this.storeDocument(document);
            
            console.log(`[DocumentService] Successfully processed document: ${originalName} (${documentId})`);
            
            return {
                id: documentId,
                filename: originalName,
                contentType,
                fileSize: fileStats.size,
                uploadedAt: document.uploaded_at,
                hasText: extractedText.length > 0,
                metadata
            };
        } catch (error) {
            console.error('[DocumentService] Failed to process document:', error);
            throw error;
        }
    }

    /**
     * Extract text and metadata from PDF files
     */
    async extractPDFContent(filePath) {
        try {
            const fs = require('fs');
            let pdfParse;
            
            try {
                pdfParse = require('pdf-parse');
            } catch (requireError) {
                console.warn('[DocumentService] pdf-parse not found, using fallback text extraction');
                return {
                    text: `[PDF Text Content]
Filename: ${path.basename(filePath)}
Note: PDF text extraction requires the 'pdf-parse' library to be installed.
Run: npm install pdf-parse

This document contains PDF content that would be extracted and made searchable.`,
                    metadata: {
                        pages: 0,
                        title: path.basename(filePath),
                        author: '',
                        subject: 'PDF content extraction not available',
                        creator: '',
                        creationDate: null
                    }
                };
            }
            
            console.log(`[DocumentService] Extracting text from PDF: ${filePath}`);
            
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer, {
                // Options for pdf-parse
                max: 0, // 0 means no limit
                version: 'v1.10.100' // PDF version to use
            });
            
            // Extract and structure the content
            const extractedText = data.text;
            const pageCount = data.numpages;
            const pdfInfo = data.info || {};
            
            console.log(`[DocumentService] Successfully extracted ${extractedText.length} characters from ${pageCount} pages`);
            
            // Create structured metadata
            const metadata = {
                pages: pageCount,
                title: pdfInfo.Title || path.basename(filePath),
                author: pdfInfo.Author || '',
                subject: pdfInfo.Subject || '',
                creator: pdfInfo.Creator || '',
                creationDate: pdfInfo.CreationDate ? new Date(pdfInfo.CreationDate) : null,
                keywords: pdfInfo.Keywords || '',
                extractedAt: new Date().toISOString()
            };
            
            // Create structured text content with metadata header
            const structuredText = [
                `[PDF Document: ${metadata.title}]`,
                metadata.author ? `Author: ${metadata.author}` : '',
                metadata.subject ? `Subject: ${metadata.subject}` : '',
                `Pages: ${pageCount}`,
                metadata.creationDate ? `Created: ${metadata.creationDate.toISOString()}` : '',
                '--- Content ---',
                extractedText
            ].filter(line => line).join('\n\n');
            
            return {
                text: structuredText,
                metadata: metadata
            };
        } catch (error) {
            console.error('[DocumentService] Failed to extract PDF content:', error);
            
            // Return fallback content instead of throwing
            return {
                text: `[PDF Text Extraction Error]
Filename: ${path.basename(filePath)}
Error: ${error.message}

This PDF document could not be processed for text extraction. The file may be encrypted, corrupted, or contain only images.`,
                metadata: {
                    pages: 0,
                    title: path.basename(filePath),
                    author: '',
                    subject: 'Extraction failed',
                    creator: '',
                    creationDate: null,
                    error: error.message
                }
            };
        }
    }

    /**
     * Get document by ID
     */
    async getDocument(documentId, userId) {
        try {
            const query = `SELECT * FROM documents WHERE id = ? AND uid = ?`;
            const document = this.db.getDb().prepare(query).get(documentId, userId);
            
            if (!document) {
                return null;
            }

            return {
                ...document,
                metadata: document.metadata ? JSON.parse(document.metadata) : {}
            };
        } catch (error) {
            console.error('[DocumentService] Failed to get document:', error);
            throw error;
        }
    }

    /**
     * Get all documents for a user
     */
    async getUserDocuments(userId, limit = 50, offset = 0) {
        try {
            const query = `
                SELECT id, filename, content_type, file_size, uploaded_at, metadata
                FROM documents 
                WHERE uid = ? 
                ORDER BY uploaded_at DESC 
                LIMIT ? OFFSET ?
            `;
            const documents = this.db.getDb().prepare(query).all(userId, limit, offset);
            
            return documents.map(doc => ({
                ...doc,
                metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
            }));
        } catch (error) {
            console.error('[DocumentService] Failed to get user documents:', error);
            throw error;
        }
    }

    /**
     * Delete a document
     */
    async deleteDocument(documentId, userId) {
        try {
            const document = await this.getDocument(documentId, userId);
            if (!document) {
                throw new Error('Document not found');
            }

            // Delete file from storage
            try {
                await fs.unlink(document.file_path);
            } catch (error) {
                console.warn('[DocumentService] Failed to delete file from storage:', error.message);
            }

            // Delete from database
            const query = `DELETE FROM documents WHERE id = ? AND uid = ?`;
            this.db.getDb().prepare(query).run(documentId, userId);
            
            // Delete associated annotations
            const deleteAnnotationsQuery = `DELETE FROM annotations WHERE document_id = ?`;
            this.db.getDb().prepare(deleteAnnotationsQuery).run(documentId);
            
            console.log(`[DocumentService] Successfully deleted document: ${documentId}`);
            return true;
        } catch (error) {
            console.error('[DocumentService] Failed to delete document:', error);
            throw error;
        }
    }

    /**
     * Search documents by text content
     */
    async searchDocuments(userId, searchTerm, limit = 20) {
        try {
            const query = `
                SELECT id, filename, content_type, file_size, uploaded_at, metadata,
                       CASE 
                           WHEN filename LIKE ? THEN 3
                           WHEN extracted_text LIKE ? THEN 2
                           WHEN metadata LIKE ? THEN 1
                           ELSE 0
                       END as relevance
                FROM documents 
                WHERE uid = ? AND (
                    filename LIKE ? OR 
                    extracted_text LIKE ? OR 
                    metadata LIKE ?
                )
                ORDER BY relevance DESC, uploaded_at DESC
                LIMIT ?
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const documents = this.db.getDb().prepare(query).all(
                searchPattern, searchPattern, searchPattern, userId,
                searchPattern, searchPattern, searchPattern, limit
            );
            
            return documents.map(doc => ({
                ...doc,
                metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
            }));
        } catch (error) {
            console.error('[DocumentService] Failed to search documents:', error);
            throw error;
        }
    }

    /**
     * Store document in database
     */
    async storeDocument(document) {
        const query = `
            INSERT INTO documents (
                id, uid, filename, content_type, file_path, file_size,
                extracted_text, metadata, uploaded_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        this.db.getDb().prepare(query).run(
            document.id, document.uid, document.filename, document.content_type,
            document.file_path, document.file_size, document.extracted_text,
            document.metadata, document.uploaded_at, document.sync_state
        );
    }

    /**
     * Get content type from filename
     */
    getContentType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.rtf': 'application/rtf'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Get document statistics for a user
     */
    async getDocumentStats(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_documents,
                    SUM(file_size) as total_size,
                    COUNT(CASE WHEN extracted_text != '' THEN 1 END) as documents_with_text,
                    COUNT(CASE WHEN content_type = 'application/pdf' THEN 1 END) as pdf_count
                FROM documents 
                WHERE uid = ?
            `;
            
            const stats = this.db.getDb().prepare(query).get(userId);
            return stats || {
                total_documents: 0,
                total_size: 0,
                documents_with_text: 0,
                pdf_count: 0
            };
        } catch (error) {
            console.error('[DocumentService] Failed to get document stats:', error);
            throw error;
        }
    }
}

module.exports = DocumentService;
