const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Zotero Sync Service for RANI
 * Handles synchronization of papers, notes, and attachments between Zotero and RANI
 */
class ZoteroSyncService {
    constructor(databaseClient, zoteroService, researchService, documentService, userDir) {
        this.db = databaseClient;
        this.zoteroService = zoteroService;
        this.researchService = researchService;
        this.documentService = documentService;
        this.userDir = userDir;
        this.zoteroDir = path.join(userDir, 'zotero');
        
        // Ensure zotero directory exists
        if (!fs.existsSync(this.zoteroDir)) {
            fs.mkdirSync(this.zoteroDir, { recursive: true });
        }
    }

    /**
     * Perform full sync with Zotero library
     * @param {string} uid - User ID
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync results
     */
    async syncLibrary(uid, options = {}) {
        try {
            const {
                includeAttachments = true,
                includeNotes = true,
                forceFullSync = false
            } = options;

            console.log(`[ZoteroSyncService] Starting sync for user ${uid}`);
            
            // Get Zotero credentials
            const credentials = await this.zoteroService.getCredentials(uid);
            if (!credentials) {
                throw new Error('No Zotero credentials found. Please connect your Zotero account first.');
            }

            const { api_key, zotero_user_id, library_type, last_sync_version } = credentials;
            
            // Get current library version
            const currentVersion = await this.zoteroService.getLibraryVersion(
                api_key,
                zotero_user_id,
                library_type
            );

            console.log(`[ZoteroSyncService] Library version: ${currentVersion}, Last sync: ${last_sync_version || 'never'}`);

            // Determine if incremental sync is possible
            const since = (!forceFullSync && last_sync_version) ? last_sync_version : null;
            
            // Fetch items from Zotero
            const items = await this.fetchAllItems(
                api_key,
                zotero_user_id,
                library_type,
                since
            );

            console.log(`[ZoteroSyncService] Fetched ${items.length} items from Zotero`);

            // Sync results tracking
            const results = {
                totalItems: items.length,
                imported: 0,
                updated: 0,
                skipped: 0,
                failed: 0,
                errors: []
            };

            // Process each item
            for (const item of items) {
                try {
                    // Skip non-paper items (attachments, notes, etc.)
                    if (this.shouldSkipItem(item)) {
                        results.skipped++;
                        continue;
                    }

                    // Import paper
                    const syncResult = await this.syncItem(
                        uid,
                        item,
                        api_key,
                        zotero_user_id,
                        library_type,
                        { includeAttachments, includeNotes }
                    );

                    if (syncResult.imported) results.imported++;
                    if (syncResult.updated) results.updated++;
                    
                } catch (error) {
                    console.error(`[ZoteroSyncService] Failed to sync item ${item.key}:`, error);
                    results.failed++;
                    results.errors.push({
                        itemKey: item.key,
                        error: error.message
                    });
                }
            }

            // Update last sync version
            await this.zoteroService.updateLastSync(uid, currentVersion);

            console.log(`[ZoteroSyncService] Sync complete:`, results);

            return {
                success: true,
                ...results,
                syncedVersion: currentVersion
            };

        } catch (error) {
            console.error('[ZoteroSyncService] Sync failed:', error);
            throw error;
        }
    }

    /**
     * Fetch all items from Zotero (handles pagination)
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} libraryType - Library type
     * @param {number|null} since - Fetch items since this version
     * @returns {Promise<Array>} All items
     */
    async fetchAllItems(apiKey, userId, libraryType, since = null) {
        const allItems = [];
        const batchSize = 100;
        let start = 0;
        let hasMore = true;

        while (hasMore) {
            const items = await this.zoteroService.fetchItems(
                apiKey,
                userId,
                libraryType,
                { limit: batchSize, start, since }
            );

            allItems.push(...items);
            
            if (items.length < batchSize) {
                hasMore = false;
            } else {
                start += batchSize;
            }
        }

        return allItems;
    }

    /**
     * Sync a single Zotero item to RANI
     * @param {string} uid - User ID
     * @param {Object} zoteroItem - Zotero item
     * @param {string} apiKey - Zotero API key
     * @param {string} zoteroUserId - Zotero user ID
     * @param {string} libraryType - Library type
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync result
     */
    async syncItem(uid, zoteroItem, apiKey, zoteroUserId, libraryType, options = {}) {
        const { includeAttachments, includeNotes } = options;
        
        // Parse Zotero item to RANI format
        const paperData = this.zoteroService.parseZoteroItem(zoteroItem);
        
        // Check if item already exists in RANI
        const existingItem = await this.findExistingZoteroItem(uid, zoteroItem.key);
        
        let paperId;
        let imported = false;
        let updated = false;

        if (existingItem) {
            // Update existing item if version changed
            if (existingItem.zotero_version !== zoteroItem.version) {
                await this.updateZoteroItem(existingItem.id, paperData, zoteroItem.version);
                paperId = existingItem.id;
                updated = true;
                console.log(`[ZoteroSyncService] Updated item: ${paperData.title}`);
            } else {
                paperId = existingItem.id;
                console.log(`[ZoteroSyncService] Item up to date: ${paperData.title}`);
            }
        } else {
            // Import as new paper
            paperId = await this.importZoteroItem(uid, paperData, zoteroItem);
            imported = true;
            console.log(`[ZoteroSyncService] Imported new item: ${paperData.title}`);
        }

        // Sync attachments (PDFs)
        if (includeAttachments && paperId) {
            try {
                await this.syncAttachments(
                    uid,
                    paperId,
                    zoteroItem.key,
                    apiKey,
                    zoteroUserId,
                    libraryType
                );
            } catch (error) {
                console.error(`[ZoteroSyncService] Failed to sync attachments for ${zoteroItem.key}:`, error);
            }
        }

        // Sync notes
        if (includeNotes && paperId) {
            try {
                await this.syncNotes(
                    uid,
                    paperId,
                    zoteroItem.key,
                    apiKey,
                    zoteroUserId,
                    libraryType
                );
            } catch (error) {
                console.error(`[ZoteroSyncService] Failed to sync notes for ${zoteroItem.key}:`, error);
            }
        }

        return { imported, updated, paperId };
    }

    /**
     * Check if Zotero item should be skipped
     * @param {Object} item - Zotero item
     * @returns {boolean} True if should skip
     */
    shouldSkipItem(item) {
        const skipTypes = ['attachment', 'note', 'annotation'];
        return skipTypes.includes(item.data.itemType);
    }

    /**
     * Find existing Zotero item in RANI database
     * @param {string} uid - User ID
     * @param {string} zoteroKey - Zotero item key
     * @returns {Promise<Object|null>} Existing item or null
     */
    async findExistingZoteroItem(uid, zoteroKey) {
        try {
            const query = `
                SELECT id, zotero_version
                FROM research_papers
                WHERE uid = ? AND zotero_key = ?
            `;
            
            const result = this.db.getDb().prepare(query).get(uid, zoteroKey);
            return result || null;
        } catch (error) {
            console.error('[ZoteroSyncService] Error finding existing item:', error);
            return null;
        }
    }

    /**
     * Import new Zotero item to RANI
     * @param {string} uid - User ID
     * @param {Object} paperData - Parsed paper data
     * @param {Object} zoteroItem - Original Zotero item
     * @returns {Promise<string>} Paper ID
     */
    async importZoteroItem(uid, paperData, zoteroItem) {
        const paperId = crypto.randomUUID();
        const now = Date.now();

        const query = `
            INSERT INTO research_papers (
                id, uid, title, authors, abstract, year, venue, url, pdf_url,
                doi, arxiv_id, source, citation_count, metadata,
                zotero_key, zotero_version, added_at, imported_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.getDb().prepare(query).run(
            paperId, uid, paperData.title, paperData.authors, paperData.abstract,
            paperData.year, paperData.venue, paperData.url, null,
            paperData.doi, paperData.arxivId, 'zotero', 0, paperData.metadata,
            paperData.zoteroKey, paperData.zoteroVersion, now, now, 'clean'
        );

        return paperId;
    }

    /**
     * Update existing Zotero item in RANI
     * @param {string} paperId - Paper ID
     * @param {Object} paperData - Updated paper data
     * @param {number} version - Zotero version
     * @returns {Promise<void>}
     */
    async updateZoteroItem(paperId, paperData, version) {
        const query = `
            UPDATE research_papers
            SET title = ?, authors = ?, abstract = ?, year = ?, venue = ?,
                url = ?, doi = ?, arxiv_id = ?, metadata = ?, zotero_version = ?,
                imported_at = ?, sync_state = 'clean'
            WHERE id = ?
        `;

        const now = Date.now();

        this.db.getDb().prepare(query).run(
            paperData.title, paperData.authors, paperData.abstract,
            paperData.year, paperData.venue, paperData.url,
            paperData.doi, paperData.arxivId, paperData.metadata,
            version, now, paperId
        );
    }

    /**
     * Sync attachments (PDFs) for a Zotero item
     * @param {string} uid - User ID
     * @param {string} paperId - Paper ID in RANI
     * @param {string} zoteroKey - Zotero item key
     * @param {string} apiKey - Zotero API key
     * @param {string} zoteroUserId - Zotero user ID
     * @param {string} libraryType - Library type
     * @returns {Promise<void>}
     */
    async syncAttachments(uid, paperId, zoteroKey, apiKey, zoteroUserId, libraryType) {
        try {
            // Fetch attachments from Zotero
            const attachments = await this.zoteroService.fetchItemAttachments(
                apiKey,
                zoteroUserId,
                zoteroKey,
                libraryType
            );

            // Filter for PDF attachments
            const pdfAttachments = attachments.filter(att => 
                att.data.contentType === 'application/pdf' ||
                att.data.filename?.endsWith('.pdf')
            );

            // If no PDF in Zotero, just log and return
            if (pdfAttachments.length === 0) {
                console.log(`[ZoteroSyncService] No PDF attachments found for ${zoteroKey}`);
                return;
            }

            // Download and save the first PDF
            const pdfAttachment = pdfAttachments[0];
            
            try {
                const pdfBuffer = await this.zoteroService.downloadAttachment(
                    apiKey,
                    zoteroUserId,
                    pdfAttachment.key,
                    libraryType
                );

                // Save PDF to disk
                const filename = pdfAttachment.data.filename || `${paperId}.pdf`;
                const filePath = path.join(this.zoteroDir, filename);
                
                fs.writeFileSync(filePath, pdfBuffer);
                
                console.log(`[ZoteroSyncService] Downloaded PDF: ${filename}`);
                
                // Just update file path - embedding will be done manually via UI button
                const updateQuery = `
                    UPDATE research_papers
                    SET file_path = ?, pdf_url = ?
                    WHERE id = ?
                `;
                
                this.db.getDb().prepare(updateQuery).run(
                    filePath, 
                    pdfAttachment.data.url,
                    paperId
                );
                
            } catch (error) {
                console.error(`[ZoteroSyncService] Failed to download PDF for ${zoteroKey}:`, error);
            }

        } catch (error) {
            console.error(`[ZoteroSyncService] Failed to sync attachments:`, error);
            throw error;
        }
    }

    /**
     * Download PDF from arXiv as fallback when Zotero doesn't have it
     * @param {string} uid - User ID
     * @param {string} paperId - Paper ID
     * @param {string} arxivId - arXiv ID
     * @param {string} title - Paper title (for filename)
     * @returns {Promise<void>}
     */
    async downloadFromArxiv(uid, paperId, arxivId, title) {
        const https = require('https');
        
        try {
            const arxivUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
            console.log(`[ZoteroSyncService] Downloading from arXiv: ${arxivUrl}`);
            
            return new Promise((resolve, reject) => {
                https.get(arxivUrl, (response) => {
                    if (response.statusCode === 200) {
                        const chunks = [];
                        
                        response.on('data', (chunk) => {
                            chunks.push(chunk);
                        });
                        
                        response.on('end', async () => {
                            try {
                                const pdfBuffer = Buffer.concat(chunks);
                                
                                // Save PDF to disk
                                const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
                                const filename = `${safeTitle}_${arxivId}.pdf`;
                                const filePath = path.join(this.zoteroDir, filename);
                                
                                fs.writeFileSync(filePath, pdfBuffer);
                                console.log(`[ZoteroSyncService] Downloaded arXiv PDF: ${filename}`);
                                
                                // Just update file path - embedding will be done manually via UI button
                                const updateQuery = `
                                    UPDATE research_papers
                                    SET file_path = ?, pdf_url = ?
                                    WHERE id = ?
                                `;
                                
                                this.db.getDb().prepare(updateQuery).run(filePath, arxivUrl, paperId);
                                
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        });
                        
                        response.on('error', reject);
                    } else {
                        console.error(`[ZoteroSyncService] arXiv download failed with status ${response.statusCode}`);
                        reject(new Error(`HTTP ${response.statusCode}`));
                    }
                }).on('error', reject);
            });
            
        } catch (error) {
            console.error(`[ZoteroSyncService] Failed to download from arXiv:`, error);
            throw error;
        }
    }

    /**
     * Sync notes for a Zotero item
     * @param {string} uid - User ID
     * @param {string} paperId - Paper ID in RANI
     * @param {string} zoteroKey - Zotero item key
     * @param {string} apiKey - Zotero API key
     * @param {string} zoteroUserId - Zotero user ID
     * @param {string} libraryType - Library type
     * @returns {Promise<void>}
     */
    async syncNotes(uid, paperId, zoteroKey, apiKey, zoteroUserId, libraryType) {
        try {
            // Fetch notes from Zotero
            const notes = await this.zoteroService.fetchItemNotes(
                apiKey,
                zoteroUserId,
                zoteroKey,
                libraryType
            );

            if (notes.length === 0) {
                return;
            }

            console.log(`[ZoteroSyncService] Found ${notes.length} notes for ${zoteroKey}`);

            // Import each note as an annotation
            for (const note of notes) {
                try {
                    await this.importZoteroNote(uid, paperId, note);
                } catch (error) {
                    console.error(`[ZoteroSyncService] Failed to import note ${note.key}:`, error);
                }
            }

        } catch (error) {
            console.error(`[ZoteroSyncService] Failed to sync notes:`, error);
            throw error;
        }
    }

    /**
     * Import Zotero note as RANI annotation
     * @param {string} uid - User ID
     * @param {string} paperId - Paper ID
     * @param {Object} zoteroNote - Zotero note object
     * @returns {Promise<string>} Annotation ID
     */
    async importZoteroNote(uid, paperId, zoteroNote) {
        // Check if note already exists
        const existingNote = await this.findExistingZoteroNote(paperId, zoteroNote.key);
        
        if (existingNote) {
            console.log(`[ZoteroSyncService] Note already imported: ${zoteroNote.key}`);
            return existingNote.id;
        }

        const annotationId = crypto.randomUUID();
        const now = Date.now();
        
        // Strip HTML tags from note content
        const noteText = this.stripHtml(zoteroNote.data.note || '');

        const query = `
            INSERT INTO annotations (
                id, document_id, note_text, annotation_type,
                zotero_note_key, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.getDb().prepare(query).run(
            annotationId, paperId, noteText, 'note',
            zoteroNote.key, now, 'clean'
        );

        console.log(`[ZoteroSyncService] Imported note: ${zoteroNote.key}`);

        return annotationId;
    }

    /**
     * Find existing Zotero note in RANI
     * @param {string} paperId - Paper ID
     * @param {string} zoteroNoteKey - Zotero note key
     * @returns {Promise<Object|null>} Existing annotation or null
     */
    async findExistingZoteroNote(paperId, zoteroNoteKey) {
        try {
            const query = `
                SELECT id
                FROM annotations
                WHERE document_id = ? AND zotero_note_key = ?
            `;
            
            const result = this.db.getDb().prepare(query).get(paperId, zoteroNoteKey);
            return result || null;
        } catch (error) {
            console.error('[ZoteroSyncService] Error finding existing note:', error);
            return null;
        }
    }

    /**
     * Strip HTML tags from text
     * @param {string} html - HTML string
     * @returns {string} Plain text
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    /**
     * Get sync status for user
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Sync status
     */
    async getSyncStatus(uid) {
        try {
            const credentials = await this.zoteroService.getCredentials(uid);
            
            if (!credentials) {
                return {
                    connected: false,
                    message: 'Not connected to Zotero'
                };
            }

            const query = `
                SELECT COUNT(*) as count
                FROM research_papers
                WHERE uid = ? AND source = 'zotero'
            `;
            
            const result = this.db.getDb().prepare(query).get(uid);
            const syncedCount = result ? result.count : 0;

            return {
                connected: true,
                lastSync: credentials.last_sync_at,
                lastSyncVersion: credentials.last_sync_version,
                syncedItems: syncedCount,
                libraryType: credentials.library_type
            };

        } catch (error) {
            console.error('[ZoteroSyncService] Failed to get sync status:', error);
            return {
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Delete all synced Zotero items for user
     * @param {string} uid - User ID
     * @returns {Promise<number>} Number of items deleted
     */
    async deleteAllSyncedItems(uid) {
        try {
            // Get all Zotero papers with file paths
            const query = `
                SELECT id, file_path
                FROM research_papers
                WHERE uid = ? AND source = 'zotero'
            `;
            
            const papers = this.db.getDb().prepare(query).all(uid);

            // Delete PDF files
            for (const paper of papers) {
                if (paper.file_path && fs.existsSync(paper.file_path)) {
                    try {
                        fs.unlinkSync(paper.file_path);
                    } catch (error) {
                        console.error(`[ZoteroSyncService] Failed to delete file ${paper.file_path}:`, error);
                    }
                }
            }

            // Delete papers from database
            const deleteQuery = `
                DELETE FROM research_papers
                WHERE uid = ? AND source = 'zotero'
            `;
            
            this.db.getDb().prepare(deleteQuery).run(uid);

            console.log(`[ZoteroSyncService] Deleted ${papers.length} Zotero items for user ${uid}`);

            return papers.length;

        } catch (error) {
            console.error('[ZoteroSyncService] Failed to delete synced items:', error);
            throw error;
        }
    }
}

module.exports = ZoteroSyncService;
