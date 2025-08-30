const ResearchFeature = require('../features/research/researchFeature');

/**
 * Research Bridge for RANI
 * Exposes research functionality to the renderer process
 */
class ResearchBridge {
    constructor(ipcMain, databaseClient) {
        this.ipcMain = ipcMain;
        this.researchFeature = new ResearchFeature(databaseClient, this);
        
        console.log('[ResearchBridge] Research functionality initialized');
    }

    /**
     * Handle IPC calls from renderer
     */
    handle(channel, handler) {
        this.ipcMain.handle(channel, async (event, ...args) => {
            try {
                console.log(`[ResearchBridge] Handling: ${channel}`);
                return await handler(...args);
            } catch (error) {
                console.error(`[ResearchBridge] Error in ${channel}:`, error);
                throw error;
            }
        });
    }

    /**
     * Setup preload API exposure
     */
    getPreloadApi() {
        return {
            // Document management API
            documents: {
                // Import a document file
                import: (filePath, metadata = {}) => 
                    window.api.invoke('documents:import', filePath, metadata),
                
                // Get user's documents
                getUserDocuments: (limit = 50) => 
                    window.api.invoke('documents:getUserDocuments', limit),
                
                // Search documents
                search: (searchTerm, limit = 20) => 
                    window.api.invoke('documents:search', searchTerm, limit),
                
                // Get specific document
                getDocument: (documentId) => 
                    window.api.invoke('documents:getDocument', documentId),
                
                // Delete document
                deleteDocument: (documentId) => 
                    window.api.invoke('documents:deleteDocument', documentId),
                
                // Select and upload files via dialog
                selectAndUpload: () => 
                    window.api.invoke('documents:selectAndUpload'),
                
                // Upload specific file
                uploadFile: (filePath) => 
                    window.api.invoke('documents:uploadFile', filePath),
                
                // Open document in viewer
                openDocument: (documentId) => 
                    window.api.invoke('documents:openDocument', documentId)
            },

            // Annotation management API
            annotations: {
                // Create annotation
                create: (annotationData) => 
                    window.api.invoke('annotations:create', annotationData),
                
                // Get document annotations
                getDocumentAnnotations: (documentId) => 
                    window.api.invoke('annotations:getDocumentAnnotations', documentId),
                
                // Get session annotations
                getSessionAnnotations: (sessionId) => 
                    window.api.invoke('annotations:getSessionAnnotations', sessionId),
                
                // Update annotation
                update: (annotationId, updates) => 
                    window.api.invoke('annotations:update', annotationId, updates),
                
                // Delete annotation
                delete: (annotationId) => 
                    window.api.invoke('annotations:delete', annotationId),
                
                // Search annotations
                search: (searchTerm, limit = 20) => 
                    window.api.invoke('annotations:search', searchTerm, limit)
            },

            // Research paper discovery API
            research: {
                // Search for papers
                searchPapers: (query, options = {}) => 
                    window.api.invoke('research:searchPapers', query, options),
                
                // Import/download paper
                importPaper: (paperData) => 
                    window.api.invoke('research:importPaper', paperData),
                
                // Get user's imported papers
                getUserPapers: (limit = 50) => 
                    window.api.invoke('research:getUserPapers', limit)
            }
        };
    }
}

module.exports = ResearchBridge;
