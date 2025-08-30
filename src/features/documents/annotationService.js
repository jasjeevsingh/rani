const crypto = require('crypto');

/**
 * Annotation Service for RANI
 * Handles PDF annotations, highlights, and note-taking
 */
class AnnotationService {
    constructor(databaseClient) {
        this.db = databaseClient;
    }

    /**
     * Create a new annotation
     * @param {Object} annotationData - Annotation data
     * @returns {Promise<Object>} Created annotation
     */
    async createAnnotation(annotationData) {
        try {
            const annotationId = crypto.randomUUID();
            const now = Math.floor(Date.now() / 1000);
            
            const annotation = {
                id: annotationId,
                document_id: annotationData.documentId,
                session_id: annotationData.sessionId || null,
                page_number: annotationData.pageNumber || 1,
                coordinates: JSON.stringify(annotationData.coordinates || {}),
                highlight_text: annotationData.highlightText || '',
                note_text: annotationData.noteText || '',
                annotation_type: annotationData.type || 'highlight',
                created_at: now,
                sync_state: 'clean'
            };

            await this.storeAnnotation(annotation);
            
            console.log(`[AnnotationService] Created annotation: ${annotationId} for document: ${annotationData.documentId}`);
            
            return {
                id: annotationId,
                documentId: annotation.document_id,
                sessionId: annotation.session_id,
                pageNumber: annotation.page_number,
                coordinates: JSON.parse(annotation.coordinates),
                highlightText: annotation.highlight_text,
                noteText: annotation.note_text,
                type: annotation.annotation_type,
                createdAt: annotation.created_at
            };
        } catch (error) {
            console.error('[AnnotationService] Failed to create annotation:', error);
            throw error;
        }
    }

    /**
     * Get all annotations for a document
     * @param {string} documentId - Document ID
     * @returns {Promise<Array>} Array of annotations
     */
    async getDocumentAnnotations(documentId) {
        try {
            const query = `
                SELECT * FROM annotations 
                WHERE document_id = ? 
                ORDER BY page_number ASC, created_at ASC
            `;
            const annotations = this.db.getDb().prepare(query).all(documentId);
            
            return annotations.map(annotation => ({
                id: annotation.id,
                documentId: annotation.document_id,
                sessionId: annotation.session_id,
                pageNumber: annotation.page_number,
                coordinates: annotation.coordinates ? JSON.parse(annotation.coordinates) : {},
                highlightText: annotation.highlight_text,
                noteText: annotation.note_text,
                type: annotation.annotation_type,
                createdAt: annotation.created_at
            }));
        } catch (error) {
            console.error('[AnnotationService] Failed to get document annotations:', error);
            throw error;
        }
    }

    /**
     * Get annotations for a specific session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Array>} Array of annotations
     */
    async getSessionAnnotations(sessionId) {
        try {
            const query = `
                SELECT a.*, d.filename, d.content_type
                FROM annotations a
                LEFT JOIN documents d ON a.document_id = d.id
                WHERE a.session_id = ? 
                ORDER BY a.created_at ASC
            `;
            const annotations = this.db.getDb().prepare(query).all(sessionId);
            
            return annotations.map(annotation => ({
                id: annotation.id,
                documentId: annotation.document_id,
                sessionId: annotation.session_id,
                pageNumber: annotation.page_number,
                coordinates: annotation.coordinates ? JSON.parse(annotation.coordinates) : {},
                highlightText: annotation.highlight_text,
                noteText: annotation.note_text,
                type: annotation.annotation_type,
                createdAt: annotation.created_at,
                document: {
                    filename: annotation.filename,
                    contentType: annotation.content_type
                }
            }));
        } catch (error) {
            console.error('[AnnotationService] Failed to get session annotations:', error);
            throw error;
        }
    }

    /**
     * Update an annotation
     * @param {string} annotationId - Annotation ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated annotation
     */
    async updateAnnotation(annotationId, updates) {
        try {
            const allowedFields = ['note_text', 'highlight_text', 'coordinates', 'annotation_type'];
            const updateFields = [];
            const updateValues = [];
            
            for (const [field, value] of Object.entries(updates)) {
                if (allowedFields.includes(field)) {
                    updateFields.push(`${field} = ?`);
                    if (field === 'coordinates') {
                        updateValues.push(JSON.stringify(value));
                    } else {
                        updateValues.push(value);
                    }
                }
            }
            
            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            updateValues.push(annotationId);
            const query = `UPDATE annotations SET ${updateFields.join(', ')} WHERE id = ?`;
            
            this.db.getDb().prepare(query).run(...updateValues);
            
            // Return updated annotation
            return await this.getAnnotation(annotationId);
        } catch (error) {
            console.error('[AnnotationService] Failed to update annotation:', error);
            throw error;
        }
    }

    /**
     * Delete an annotation
     * @param {string} annotationId - Annotation ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteAnnotation(annotationId) {
        try {
            const query = `DELETE FROM annotations WHERE id = ?`;
            const result = this.db.getDb().prepare(query).run(annotationId);
            
            console.log(`[AnnotationService] Deleted annotation: ${annotationId}`);
            return result.changes > 0;
        } catch (error) {
            console.error('[AnnotationService] Failed to delete annotation:', error);
            throw error;
        }
    }

    /**
     * Get a single annotation by ID
     * @param {string} annotationId - Annotation ID
     * @returns {Promise<Object|null>} Annotation data
     */
    async getAnnotation(annotationId) {
        try {
            const query = `SELECT * FROM annotations WHERE id = ?`;
            const annotation = this.db.getDb().prepare(query).get(annotationId);
            
            if (!annotation) {
                return null;
            }
            
            return {
                id: annotation.id,
                documentId: annotation.document_id,
                sessionId: annotation.session_id,
                pageNumber: annotation.page_number,
                coordinates: annotation.coordinates ? JSON.parse(annotation.coordinates) : {},
                highlightText: annotation.highlight_text,
                noteText: annotation.note_text,
                type: annotation.annotation_type,
                createdAt: annotation.created_at
            };
        } catch (error) {
            console.error('[AnnotationService] Failed to get annotation:', error);
            throw error;
        }
    }

    /**
     * Search annotations by text content
     * @param {string} userId - User ID (to filter documents)
     * @param {string} searchTerm - Search term
     * @param {number} limit - Maximum results
     * @returns {Promise<Array>} Array of matching annotations
     */
    async searchAnnotations(userId, searchTerm, limit = 20) {
        try {
            const query = `
                SELECT a.*, d.filename, d.content_type,
                       CASE 
                           WHEN a.note_text LIKE ? THEN 3
                           WHEN a.highlight_text LIKE ? THEN 2
                           WHEN d.filename LIKE ? THEN 1
                           ELSE 0
                       END as relevance
                FROM annotations a
                LEFT JOIN documents d ON a.document_id = d.id
                WHERE d.uid = ? AND (
                    a.note_text LIKE ? OR 
                    a.highlight_text LIKE ? OR 
                    d.filename LIKE ?
                )
                ORDER BY relevance DESC, a.created_at DESC
                LIMIT ?
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const annotations = this.db.getDb().prepare(query).all(
                searchPattern, searchPattern, searchPattern, userId,
                searchPattern, searchPattern, searchPattern, limit
            );
            
            return annotations.map(annotation => ({
                id: annotation.id,
                documentId: annotation.document_id,
                sessionId: annotation.session_id,
                pageNumber: annotation.page_number,
                coordinates: annotation.coordinates ? JSON.parse(annotation.coordinates) : {},
                highlightText: annotation.highlight_text,
                noteText: annotation.note_text,
                type: annotation.annotation_type,
                createdAt: annotation.created_at,
                relevance: annotation.relevance,
                document: {
                    filename: annotation.filename,
                    contentType: annotation.content_type
                }
            }));
        } catch (error) {
            console.error('[AnnotationService] Failed to search annotations:', error);
            throw error;
        }
    }

    /**
     * Get annotation statistics for a document
     * @param {string} documentId - Document ID
     * @returns {Promise<Object>} Annotation statistics
     */
    async getDocumentAnnotationStats(documentId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_annotations,
                    COUNT(CASE WHEN annotation_type = 'highlight' THEN 1 END) as highlights,
                    COUNT(CASE WHEN annotation_type = 'note' THEN 1 END) as notes,
                    COUNT(CASE WHEN note_text != '' THEN 1 END) as annotations_with_notes,
                    MAX(page_number) as max_page_annotated
                FROM annotations 
                WHERE document_id = ?
            `;
            
            const stats = this.db.getDb().prepare(query).get(documentId);
            return stats || {
                total_annotations: 0,
                highlights: 0,
                notes: 0,
                annotations_with_notes: 0,
                max_page_annotated: 0
            };
        } catch (error) {
            console.error('[AnnotationService] Failed to get annotation stats:', error);
            throw error;
        }
    }

    /**
     * Link annotation to a research session
     * @param {string} annotationId - Annotation ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} Success status
     */
    async linkToSession(annotationId, sessionId) {
        try {
            const query = `UPDATE annotations SET session_id = ? WHERE id = ?`;
            const result = this.db.getDb().prepare(query).run(sessionId, annotationId);
            
            console.log(`[AnnotationService] Linked annotation ${annotationId} to session ${sessionId}`);
            return result.changes > 0;
        } catch (error) {
            console.error('[AnnotationService] Failed to link annotation to session:', error);
            throw error;
        }
    }

    /**
     * Store annotation in database
     */
    async storeAnnotation(annotation) {
        const query = `
            INSERT INTO annotations (
                id, document_id, session_id, page_number, coordinates,
                highlight_text, note_text, annotation_type, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        this.db.getDb().prepare(query).run(
            annotation.id, annotation.document_id, annotation.session_id,
            annotation.page_number, annotation.coordinates, annotation.highlight_text,
            annotation.note_text, annotation.annotation_type, annotation.created_at,
            annotation.sync_state
        );
    }
}

module.exports = AnnotationService;
