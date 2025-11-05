const DocumentService = require('../documents/documentService');
const AnnotationService = require('../documents/annotationService');
const ResearchService = require('./researchService');
const ZoteroService = require('./zoteroService');
const ZoteroSyncService = require('./zoteroSyncService');

/**
 * Research Feature Integration for RANI
 * Coordinates document management, annotations, and research functionality
 */
class ResearchFeature {
    constructor(databaseClient, ipcBridge) {
        this.db = databaseClient;
        this.ipc = ipcBridge;
        
        // Create user directory
        const os = require('os');
        const path = require('path');
        const userDir = path.join(os.homedir(), '.rani');
        
        // Initialize services
        this.documentService = new DocumentService(databaseClient, userDir);
        this.annotationService = new AnnotationService(databaseClient);
        this.researchService = new ResearchService(databaseClient, this.documentService);
        this.zoteroService = new ZoteroService(databaseClient);
        this.zoteroSyncService = new ZoteroSyncService(
            databaseClient,
            this.zoteroService,
            this.researchService,
            this.documentService,
            userDir
        );
        
        this.setupIpcHandlers();
    }

    setupIpcHandlers() {
        // Document management
        this.ipc.handle('documents:import', async (filePath, metadata = {}) => {
            const userId = await this.getCurrentUserId();
            return await this.documentService.importDocument(filePath, userId, metadata);
        });

        this.ipc.handle('documents:getUserDocuments', async (limit = 50) => {
            const userId = await this.getCurrentUserId();
            return await this.documentService.getUserDocuments(userId, limit);
        });

        this.ipc.handle('documents:search', async (searchTerm, limit = 20) => {
            const userId = await this.getCurrentUserId();
            return await this.documentService.searchDocuments(userId, searchTerm, limit);
        });

        this.ipc.handle('documents:getDocument', async (documentId) => {
            const userId = await this.getCurrentUserId();
            return await this.documentService.getDocument(documentId, userId);
        });

        this.ipc.handle('documents:deleteDocument', async (documentId) => {
            const userId = await this.getCurrentUserId();
            return await this.documentService.deleteDocument(documentId, userId);
        });

        this.ipc.handle('documents:selectAndUpload', async () => {
            return await this.selectAndUploadFile();
        });

        this.ipc.handle('documents:uploadFile', async (filePath) => {
            // Get current user ID (implement user session management)
            const userId = await this.getCurrentUserId();
            return await this.documentService.importDocument(filePath, userId);
        });

        this.ipc.handle('documents:openDocument', async (documentId) => {
            return await this.openDocumentViewer(documentId);
        });

        this.ipc.handle('documents:generateEmbeddings', async (documentId) => {
            const userId = await this.getCurrentUserId();
            return await this.documentService.generateEmbeddingsForDocument(documentId, userId);
        });

        this.ipc.handle('documents:getEmbeddingStatus', async (documentId) => {
            const userId = await this.getCurrentUserId();
            return await this.documentService.getDocumentEmbeddingStatus(documentId, userId);
        });

        // Annotation management
        this.ipc.handle('annotations:create', async (annotationData) => {
            return await this.annotationService.createAnnotation(annotationData);
        });

        this.ipc.handle('annotations:getDocumentAnnotations', async (documentId) => {
            return await this.annotationService.getDocumentAnnotations(documentId);
        });

        this.ipc.handle('annotations:getSessionAnnotations', async (sessionId) => {
            return await this.annotationService.getSessionAnnotations(sessionId);
        });

        this.ipc.handle('annotations:update', async (annotationId, updates) => {
            return await this.annotationService.updateAnnotation(annotationId, updates);
        });

        this.ipc.handle('annotations:delete', async (annotationId) => {
            return await this.annotationService.deleteAnnotation(annotationId);
        });

        this.ipc.handle('annotations:search', async (userId, searchTerm, limit = 20) => {
            return await this.annotationService.searchAnnotations(userId, searchTerm, limit);
        });

        // Research paper discovery
        this.ipc.handle('research:searchPapers', async (query, options = {}) => {
            return await this.researchService.searchPapers(query, options);
        });

        this.ipc.handle('research:importPaper', async (paperData) => {
            const userId = await this.getCurrentUserId();
            return await this.researchService.downloadAndImportPaper(paperData, userId);
        });

        this.ipc.handle('research:getUserPapers', async (limit = 50) => {
            const userId = await this.getCurrentUserId();
            return await this.researchService.getUserPapers(userId, limit);
        });

        this.ipc.handle('research:deletePaper', async (paperId) => {
            const userId = await this.getCurrentUserId();
            return await this.researchService.deletePaper(paperId, userId);
        });

        this.ipc.handle('research:openPaperFile', async (filePath) => {
            const { shell } = require('electron');
            if (filePath && require('fs').existsSync(filePath)) {
                await shell.openPath(filePath);
                return { success: true };
            }
            throw new Error('File not found');
        });

        // Manual embedding operations
        this.ipc.handle('research:generatePaperEmbeddings', async (paperId) => {
            const userId = await this.getCurrentUserId();
            return await this.researchService.generatePaperEmbeddings(paperId, userId);
        });

        this.ipc.handle('research:generateAllPendingEmbeddings', async () => {
            const userId = await this.getCurrentUserId();
            return await this.researchService.generateAllPendingEmbeddings(userId);
        });

        this.ipc.handle('research:getPaperEmbeddingStatus', async (paperId) => {
            const userId = await this.getCurrentUserId();
            return await this.researchService.getPaperEmbeddingStatus(paperId, userId);
        });

        // Download paper from arXiv
        this.ipc.handle('research:downloadFromArxiv', async (paperId) => {
            const userId = await this.getCurrentUserId();
            
            // Get paper info
            const paper = this.db.getDb().prepare(
                'SELECT arxiv_id, title FROM research_papers WHERE id = ? AND uid = ?'
            ).get(paperId, userId);
            
            if (!paper) {
                return { success: false, error: 'Paper not found' };
            }
            
            if (!paper.arxiv_id) {
                return { success: false, error: 'No arXiv ID available for this paper' };
            }
            
            try {
                await this.zoteroSyncService.downloadFromArxiv(userId, paperId, paper.arxiv_id, paper.title);
                return { success: true };
            } catch (error) {
                console.error('[ResearchFeature] arXiv download failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Zotero integration handlers
        this.ipc.handle('zotero:testConnection', async (apiKey, userId, libraryType) => {
            console.log('[ResearchFeature] IPC handler received:', {
                apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
                userId,
                libraryType
            });
            return await this.zoteroService.testConnection(apiKey, userId, libraryType);
        });

        this.ipc.handle('zotero:saveCredentials', async (apiKey, zoteroUserId, libraryType) => {
            const uid = await this.getCurrentUserId();
            return await this.zoteroService.saveCredentials(uid, apiKey, zoteroUserId, libraryType);
        });

        this.ipc.handle('zotero:getCredentials', async () => {
            const uid = await this.getCurrentUserId();
            return await this.zoteroService.getCredentials(uid);
        });

        this.ipc.handle('zotero:deleteCredentials', async () => {
            const uid = await this.getCurrentUserId();
            return await this.zoteroService.deleteCredentials(uid);
        });

        this.ipc.handle('zotero:syncLibrary', async (options = {}) => {
            const uid = await this.getCurrentUserId();
            return await this.zoteroSyncService.syncLibrary(uid, options);
        });

        this.ipc.handle('zotero:getSyncStatus', async () => {
            const uid = await this.getCurrentUserId();
            return await this.zoteroSyncService.getSyncStatus(uid);
        });

        this.ipc.handle('zotero:deleteAllSyncedItems', async () => {
            const uid = await this.getCurrentUserId();
            return await this.zoteroSyncService.deleteAllSyncedItems(uid);
        });
    }

    /**
     * Open file dialog and upload selected PDF
     */
    async selectAndUploadFile() {
        const { dialog } = require('electron');
        const { BrowserWindow } = require('electron');
        
        const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'PDF Documents', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const userId = await this.getCurrentUserId();
            const uploadResults = [];

            for (const filePath of result.filePaths) {
                try {
                    const document = await this.documentService.importDocument(filePath, userId);
                    uploadResults.push(document);
                } catch (error) {
                    console.error(`Failed to upload ${filePath}:`, error);
                    uploadResults.push({ error: error.message, filePath });
                }
            }

            return uploadResults;
        }

        return [];
    }

    /**
     * Open document in external viewer or internal PDF viewer
     */
    async openDocumentViewer(documentId) {
        try {
            const userId = await this.getCurrentUserId();
            const document = await this.documentService.getDocument(documentId, userId);
            if (!document) {
                throw new Error('Document not found');
            }

            const { shell } = require('electron');
            const fs = require('fs');

            if (document.file_path && fs.existsSync(document.file_path)) {
                // Open with system default application
                await shell.openPath(document.file_path);
                return { success: true, path: document.file_path };
            } else {
                throw new Error('Document file not found on disk');
            }
        } catch (error) {
            console.error('Failed to open document:', error);
            throw error;
        }
    }

    /**
     * Get current user ID (placeholder - implement proper user session management)
     */
    async getCurrentUserId() {
        // TODO: Implement proper user session management
        // For now, return a default user ID
        return 'default-user';
    }

    /**
     * Create a research session with linked documents and annotations
     */
    async createResearchSession(sessionData) {
        try {
            const sessionId = require('crypto').randomUUID();
            const now = Math.floor(Date.now() / 1000);
            const userId = await this.getCurrentUserId();

            // Store session in database (extend sessions table if needed)
            const query = `
                INSERT INTO sessions (
                    id, uid, title, model_provider, model_name, 
                    system_prompt, created_at, updated_at, 
                    conversation_data, sync_state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const conversationData = {
                type: 'research_session',
                documents: sessionData.documentIds || [],
                research_topic: sessionData.topic || '',
                research_questions: sessionData.questions || [],
                session_metadata: sessionData.metadata || {}
            };

            this.db.getDb().prepare(query).run(
                sessionId, userId, sessionData.title || 'Research Session',
                'research', 'research_assistant', 'research_assistant',
                now, now, JSON.stringify(conversationData), 'clean'
            );

            // Link annotations to session if provided
            if (sessionData.annotationIds && sessionData.annotationIds.length > 0) {
                for (const annotationId of sessionData.annotationIds) {
                    await this.annotationService.linkToSession(annotationId, sessionId);
                }
            }

            console.log(`[ResearchFeature] Created research session: ${sessionId}`);
            return {
                sessionId,
                title: sessionData.title,
                createdAt: now,
                documentCount: sessionData.documentIds?.length || 0,
                annotationCount: sessionData.annotationIds?.length || 0
            };

        } catch (error) {
            console.error('[ResearchFeature] Failed to create research session:', error);
            throw error;
        }
    }

    /**
     * Get research session with linked content
     */
    async getResearchSession(sessionId) {
        try {
            // Get session data
            const sessionQuery = `SELECT * FROM sessions WHERE id = ?`;
            const session = this.db.getDb().prepare(sessionQuery).get(sessionId);
            
            if (!session) {
                throw new Error('Session not found');
            }

            const conversationData = session.conversation_data ? 
                JSON.parse(session.conversation_data) : {};

            // Get linked annotations
            const annotations = await this.annotationService.getSessionAnnotations(sessionId);

            // Get linked documents
            const documents = [];
            if (conversationData.documents && conversationData.documents.length > 0) {
                for (const docId of conversationData.documents) {
                    const userId = await this.getCurrentUserId();
                    const doc = await this.documentService.getDocument(docId, userId);
                    if (doc) documents.push(doc);
                }
            }

            return {
                session,
                annotations,
                documents,
                metadata: conversationData
            };

        } catch (error) {
            console.error('[ResearchFeature] Failed to get research session:', error);
            throw error;
        }
    }

    /**
     * Generate research insights from session data
     */
    async generateResearchInsights(sessionId) {
        try {
            const sessionData = await this.getResearchSession(sessionId);
            
            // Compile research content
            const insights = {
                sessionId,
                title: sessionData.session.title,
                documentCount: sessionData.documents.length,
                annotationCount: sessionData.annotations.length,
                keyThemes: [],
                highlightedConcepts: [],
                researchQuestions: sessionData.metadata.research_questions || [],
                recommendations: []
            };

            // Extract themes from annotations
            if (sessionData.annotations.length > 0) {
                const annotationTexts = sessionData.annotations
                    .map(a => a.noteText || a.highlightText)
                    .filter(text => text && text.length > 10);
                
                // Simple keyword extraction (could be enhanced with NLP)
                const wordFreq = {};
                annotationTexts.forEach(text => {
                    const words = text.toLowerCase()
                        .replace(/[^\w\s]/g, ' ')
                        .split(/\s+/)
                        .filter(word => word.length > 3);
                    
                    words.forEach(word => {
                        wordFreq[word] = (wordFreq[word] || 0) + 1;
                    });
                });

                insights.keyThemes = Object.entries(wordFreq)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([word, freq]) => ({ term: word, frequency: freq }));
            }

            // Generate recommendations
            if (insights.documentCount > 0) {
                insights.recommendations.push('Consider creating concept maps to visualize connections between papers');
            }
            
            if (insights.annotationCount > 5) {
                insights.recommendations.push('Export annotations to create a literature review outline');
            }

            return insights;

        } catch (error) {
            console.error('[ResearchFeature] Failed to generate research insights:', error);
            throw error;
        }
    }

    /**
     * Install pdf-parse dependency if not available
     */
    async ensurePdfParseInstalled() {
        try {
            require('pdf-parse');
            return true;
        } catch (error) {
            console.warn('[ResearchFeature] pdf-parse not installed, attempting to install...');
            
            try {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                
                await execAsync('npm install pdf-parse', { cwd: process.cwd() });
                console.log('[ResearchFeature] Successfully installed pdf-parse');
                return true;
            } catch (installError) {
                console.error('[ResearchFeature] Failed to install pdf-parse:', installError);
                return false;
            }
        }
    }
}

module.exports = ResearchFeature;
