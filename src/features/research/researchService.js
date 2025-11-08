const crypto = require('crypto');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Research Service for RANI
 * Handles research paper discovery, fetching, and management
 */
class ResearchService {
    constructor(databaseClient, documentService) {
        this.db = databaseClient;
        this.documentService = documentService;
        
        // API endpoints
        this.apis = {
            semanticScholar: 'https://api.semanticscholar.org/graph/v1',
            arxiv: 'https://export.arxiv.org/api',
            crossref: 'https://api.crossref.org/works'
        };
        
        // Rate limiting
        this.lastApiCall = 0;
        this.minApiInterval = 1000; // 1 second between API calls
    }

    /**
     * Search for research papers across multiple sources
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of paper results
     */
    async searchPapers(query, options = {}) {
        try {
            const {
                limit = 20,
                source = 'all',
                fields = ['title', 'authors', 'abstract', 'year', 'venue', 'url', 'citationCount'],
                filters = {}
            } = options;

            console.log(`[ResearchService] Searching for papers: "${query}"`);
            
            let allResults = [];

            // Search arXiv
            if (source === 'all' || source === 'arxiv') {
                try {
                    const arxivResults = await this.searchArxiv(query, limit);
                    allResults = allResults.concat(arxivResults);
                    console.log(`[ResearchService] Found ${arxivResults.length} papers from arXiv`);
                } catch (error) {
                    console.error('[ResearchService] arXiv search failed:', error);
                    // Continue execution even if arXiv fails
                }
            }

            // Search Semantic Scholar (commented out for now)
            // if (source === 'all' || source === 'semanticScholar') {
            //     try {
            //         const s2Results = await this.searchSemanticScholar(query, limit, fields);
            //         allResults = allResults.concat(s2Results);
            //         console.log(`[ResearchService] Found ${s2Results.length} papers from Semantic Scholar`);
            //     } catch (error) {
            //         console.error('[ResearchService] Semantic Scholar search failed:', error);
            //     }
            // }

            // Deduplicate by ID and limit results
            const uniqueResults = this.deduplicatePapers(allResults);
            return uniqueResults.slice(0, limit);
            
        } catch (error) {
            console.error('[ResearchService] Failed to search papers:', error);
            throw error;
        }
    }

    /**
     * Search Semantic Scholar API
     */
    async searchSemanticScholar(query, limit, fields) {
        await this.rateLimitDelay();
        
        const fieldsParam = fields.join(',');
        const url = `${this.apis.semanticScholar}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fieldsParam}`;
        
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.data) {
                            const papers = response.data.map(paper => ({
                                id: paper.paperId,
                                title: paper.title,
                                authors: paper.authors ? paper.authors.map(a => a.name).join(', ') : '',
                                abstract: paper.abstract || '',
                                year: paper.year || null,
                                venue: paper.venue || '',
                                url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
                                citationCount: paper.citationCount || 0,
                                doi: paper.externalIds?.DOI || null,
                                arxivId: paper.externalIds?.ArXiv || null
                            }));
                            resolve(papers);
                        } else {
                            resolve([]);
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse Semantic Scholar response: ${error.message}`));
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Search arXiv API
     */
    async searchArxiv(query, limit) {
        await this.rateLimitDelay();
        
        const url = `${this.apis.arxiv}/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`;
        
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        // Parse arXiv Atom feed (simplified XML parsing)
                        const papers = this.parseArxivResponse(data);
                        resolve(papers);
                    } catch (error) {
                        reject(new Error(`Failed to parse arXiv response: ${error.message}`));
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Parse arXiv Atom feed response
     */
    parseArxivResponse(xmlData) {
        const papers = [];
        
        // Simple regex-based XML parsing for arXiv
        const entryRegex = /<entry>(.*?)<\/entry>/gs;
        const matches = xmlData.match(entryRegex);
        
        if (!matches) return papers;
        
        matches.forEach(entry => {
            try {
                const id = this.extractXmlValue(entry, 'id');
                const title = this.extractXmlValue(entry, 'title').replace(/\n\s+/g, ' ').trim();
                const summary = this.extractXmlValue(entry, 'summary').replace(/\n\s+/g, ' ').trim();
                const published = this.extractXmlValue(entry, 'published');
                
                // Extract authors
                const authorMatches = entry.match(/<author>\s*<name>(.*?)<\/name>\s*<\/author>/gs);
                const authors = authorMatches ? 
                    authorMatches.map(match => match.match(/<name>(.*?)<\/name>/s)[1].trim()).join(', ') : '';
                
                // Extract arXiv ID and construct URLs
                const arxivId = id.split('/').pop();
                const year = published ? new Date(published).getFullYear() : null;
                
                papers.push({
                    id: arxivId,
                    title,
                    authors,
                    abstract: summary,
                    year,
                    venue: 'arXiv',
                    url: `https://arxiv.org/abs/${arxivId}`,
                    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
                    citationCount: 0, // arXiv doesn't provide citation counts
                    arxivId
                });
            } catch (error) {
                console.warn('[ResearchService] Failed to parse arXiv entry:', error.message);
            }
        });
        
        return papers;
    }

    /**
     * Deduplicate papers by ID or arXiv ID
     * @param {Array} papers - Array of paper objects
     * @returns {Array} Deduplicated papers
     */
    deduplicatePapers(papers) {
        const seen = new Set();
        return papers.filter(paper => {
            const key = paper.arxivId || paper.id;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Extract value from XML tag
     */
    extractXmlValue(xml, tag) {
        const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's');
        const match = xml.match(regex);
        return match ? match[1] : '';
    }

    /**
     * Download and import a research paper
     * @param {Object} paperData - Paper metadata
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Imported document
     */
    async downloadAndImportPaper(paperData, userId) {
        try {
            console.log(`[ResearchService] Downloading paper: ${paperData.title}`);
            
            // Check if paper already exists
            const existingPaper = await this.findExistingPaper(paperData, userId);
            if (existingPaper) {
                console.log('[ResearchService] Paper already exists in database');
                return existingPaper;
            }
            
            let filePath = null;
            
            // Try to download PDF if available
            if (paperData.pdfUrl || paperData.arxivId) {
                try {
                    filePath = await this.downloadPdf(paperData);
                } catch (downloadError) {
                    console.warn('[ResearchService] PDF download failed:', downloadError.message);
                }
            }
            
            // Store paper metadata in research_papers table
            const paperId = await this.storePaperMetadata(paperData, userId, filePath);
            
            // If we have a PDF file, import it as a document
            let document = null;
            if (filePath && fs.existsSync(filePath)) {
                try {
                    document = await this.documentService.importDocument(filePath, userId, {
                        isPaper: true,
                        paperId: paperId,
                        source: paperData.source,
                        doi: paperData.doi,
                        arxivId: paperData.arxivId
                    });
                    
                    // Update paper with document_id
                    if (document && document.id) {
                        this.db.getDb().prepare(
                            'UPDATE research_papers SET document_id = ? WHERE id = ?'
                        ).run(document.id, paperId);
                    }
                } catch (importError) {
                    console.warn('[ResearchService] Document import failed:', importError.message);
                }
            }
            
            console.log(`[ResearchService] Successfully imported paper: ${paperId}`);
            
            return {
                paperId,
                document,
                metadata: paperData,
                filePath
            };
            
        } catch (error) {
            console.error('[ResearchService] Failed to download and import paper:', error);
            throw error;
        }
    }

    /**
     * Download PDF from URL
     */
    async downloadPdf(paperData) {
        return new Promise((resolve, reject) => {
            const url = paperData.pdfUrl || (paperData.arxivId ? 
                `https://arxiv.org/pdf/${paperData.arxivId}.pdf` : null);
            
            if (!url) {
                reject(new Error('No PDF URL available'));
                return;
            }
            
            // Create downloads directory
            const downloadsDir = path.join(process.cwd(), 'data', 'downloads');
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }
            
            // Generate filename
            const filename = `${paperData.id || crypto.randomUUID()}.pdf`;
            const filePath = path.join(downloadsDir, filename);
            
            console.log(`[ResearchService] Downloading PDF from: ${url}`);
            
            const file = fs.createWriteStream(filePath);
            const protocol = url.startsWith('https:') ? https : require('http');
            
            protocol.get(url, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`[ResearchService] PDF downloaded: ${filePath}`);
                        resolve(filePath);
                    });
                } else {
                    file.close();
                    fs.unlinkSync(filePath);
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
            }).on('error', (error) => {
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(error);
            });
        });
    }

    /**
     * Store paper metadata in database
     */
    async storePaperMetadata(paperData, userId, filePath) {
        const paperId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);
        
        const query = `
            INSERT INTO research_papers (
                id, uid, title, authors, abstract, year, venue, url, pdf_url,
                doi, arxiv_id, source, citation_count, metadata, file_path,
                imported_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        this.db.getDb().prepare(query).run(
            paperId, userId, paperData.title, paperData.authors, paperData.abstract,
            paperData.year, paperData.venue, paperData.url, paperData.pdfUrl,
            paperData.doi, paperData.arxivId, paperData.source, paperData.citationCount,
            JSON.stringify(paperData), filePath, now, 'clean'
        );
        
        return paperId;
    }

    /**
     * Find existing paper in database
     */
    async findExistingPaper(paperData, userId) {
        const query = `
            SELECT * FROM research_papers 
            WHERE uid = ? AND (title = ? OR doi = ? OR arxiv_id = ?)
            LIMIT 1
        `;
        
        return this.db.getDb().prepare(query).get(
            userId, paperData.title, paperData.doi, paperData.arxivId
        );
    }

    /**
     * Remove duplicate papers based on title similarity
     */
    deduplicatePapers(papers) {
        const seen = new Set();
        return papers.filter(paper => {
            const normalizedTitle = paper.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
            if (seen.has(normalizedTitle)) {
                return false;
            }
            seen.add(normalizedTitle);
            return true;
        });
    }

    /**
     * Rate limiting for API calls
     */
    async rateLimitDelay() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < this.minApiInterval) {
            const delay = this.minApiInterval - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastApiCall = Date.now();
    }

    /**
     * Get user's imported papers
     */
    async getUserPapers(userId, limit = 50) {
        try {
            const query = `
                SELECT * FROM research_papers 
                WHERE uid = ? 
                ORDER BY imported_at DESC 
                LIMIT ?
            `;
            
            const papers = this.db.getDb().prepare(query).all(userId, limit);
            console.log(`[ResearchService] getUserPapers - Found ${papers.length} papers for user ${userId}`);
            console.log(`[ResearchService] Paper IDs:`, papers.map(p => p.id));
            
            // Check for duplicates
            const ids = papers.map(p => p.id);
            const uniqueIds = [...new Set(ids)];
            if (ids.length !== uniqueIds.length) {
                console.error(`[ResearchService] WARNING: Found duplicate papers in DB! Total: ${ids.length}, Unique: ${uniqueIds.length}`);
            }
            
            return papers.map(paper => ({
                ...paper,
                metadata: paper.metadata ? JSON.parse(paper.metadata) : {}
            }));
        } catch (error) {
            console.error('[ResearchService] Failed to get user papers:', error);
            throw error;
        }
    }

    /**
     * Generate embeddings for a specific paper
     */
    async generatePaperEmbeddings(paperId, userId) {
        try {
            // Get paper
            const paper = this.db.getDb().prepare(
                'SELECT * FROM research_papers WHERE id = ? AND uid = ?'
            ).get(paperId, userId);
            
            if (!paper) {
                throw new Error('Paper not found');
            }
            
            console.log(`[ResearchService] generatePaperEmbeddings - paper:`, {
                id: paper.id,
                title: paper.title,
                document_id: paper.document_id,
                file_path: paper.file_path
            });
            
            // Check if paper has a PDF file but no document_id (needs import)
            if (paper.file_path && !paper.document_id) {
                console.log(`[ResearchService] Paper has PDF but no document_id, importing: ${paper.file_path}`);
                console.warn(`[ResearchService] ⚠️ WARNING: This paper should already have a document_id!`);
                
                const fs = require('fs');
                if (!fs.existsSync(paper.file_path)) {
                    throw new Error('PDF file not found on disk');
                }
                
                // Import the PDF as a document
                const document = await this.documentService.importDocument(paper.file_path, userId, {
                    isPaper: true,
                    paperId: paperId,
                    source: paper.source || 'zotero',
                    zoteroKey: paper.zotero_key,
                    doi: paper.doi,
                    arxivId: paper.arxiv_id
                });
                
                if (document && document.id) {
                    // Update paper with document_id
                    this.db.getDb().prepare(
                        'UPDATE research_papers SET document_id = ? WHERE id = ?'
                    ).run(document.id, paperId);
                    
                    console.log(`[ResearchService] PDF imported as document ${document.id}`);
                    
                    return {
                        success: true,
                        paperId,
                        documentId: document.id,
                        processed: document.chunkCount || 0
                    };
                } else {
                    throw new Error('Failed to import PDF as document');
                }
            }
            
            // If paper has document_id, use it directly
            if (paper.document_id) {
                console.log(`[ResearchService] Generating embeddings for existing document ${paper.document_id}`);
                const result = await this.documentService.generateEmbeddingsForDocument(paper.document_id);
                
                return {
                    success: true,
                    paperId,
                    documentId: paper.document_id,
                    ...result
                };
            }
            
            // Legacy fallback: search for document by metadata
            const documents = this.db.getDb().prepare(
                'SELECT id FROM documents WHERE uid = ?'
            ).all(userId);
            
            let documentId = null;
            for (const doc of documents) {
                const docData = this.db.getDb().prepare(
                    'SELECT metadata FROM documents WHERE id = ?'
                ).get(doc.id);
                
                if (docData && docData.metadata) {
                    try {
                        const metadata = JSON.parse(docData.metadata);
                        if (metadata.paperId === paperId) {
                            documentId = doc.id;
                            break;
                        }
                    } catch (e) {
                        // Skip invalid metadata
                    }
                }
            }
            
            if (!documentId) {
                throw new Error('No PDF available for this paper. Please download it first.');
            }
            
            // Generate embeddings
            console.log(`[ResearchService] Generating embeddings for paper ${paperId}`);
            const result = await this.documentService.generateEmbeddingsForDocument(documentId);
            
            return {
                success: true,
                paperId,
                documentId,
                ...result
            };
            
        } catch (error) {
            console.error('[ResearchService] Failed to generate paper embeddings:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate embeddings for all pending papers
     */
    async generateAllPendingEmbeddings(userId) {
        try {
            // Get all documents for user
            const documents = this.db.getDb().prepare(
                'SELECT id, metadata FROM documents WHERE uid = ?'
            ).all(userId);
            
            const pendingDocs = [];
            
            for (const doc of documents) {
                // Check if has chunks without embeddings
                const pendingChunks = this.db.getDb().prepare(`
                    SELECT COUNT(*) as count
                    FROM document_chunks
                    WHERE document_id = ?
                    AND (embedding IS NULL OR sync_state != 'embedded')
                `).get(doc.id).count;
                
                if (pendingChunks > 0) {
                    pendingDocs.push(doc);
                }
            }
            
            console.log(`[ResearchService] Found ${pendingDocs.length} documents needing embeddings`);
            
            const results = [];
            for (const doc of pendingDocs) {
                try {
                    const result = await this.documentService.generateEmbeddingsForDocument(doc.id);
                    results.push({
                        documentId: doc.id,
                        ...result
                    });
                } catch (error) {
                    console.error(`[ResearchService] Failed for document ${doc.id}:`, error);
                    results.push({
                        documentId: doc.id,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            return {
                success: true,
                total: pendingDocs.length,
                results
            };
            
        } catch (error) {
            console.error('[ResearchService] Failed to generate all embeddings:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get embedding status for a paper
     */
    async getPaperEmbeddingStatus(paperId, userId) {
        try {
            // Get document_id from research_papers table
            const paper = this.db.getDb().prepare(
                'SELECT document_id FROM research_papers WHERE id = ? AND uid = ?'
            ).get(paperId, userId);
            
            if (!paper || !paper.document_id) {
                return { status: 'no-document', totalChunks: 0, embeddedChunks: 0, progress: 0 };
            }
            
            const documentId = paper.document_id;
            
            const result = this.db.getDb().prepare(`
                SELECT 
                    COUNT(*) as total_chunks,
                    COUNT(CASE WHEN sync_state = 'embedded' THEN 1 END) as embedded_chunks
                FROM document_chunks
                WHERE document_id = ?
            `).get(documentId);
            
            const { total_chunks, embedded_chunks } = result;
            
            let status = 'pending';
            if (total_chunks === 0) {
                status = 'no-chunks';
            } else if (embedded_chunks === 0) {
                status = 'pending';
            } else if (embedded_chunks === total_chunks) {
                status = 'complete';
            } else {
                status = 'partial';
            }
            
            return {
                status,
                totalChunks: total_chunks,
                embeddedChunks: embedded_chunks,
                progress: total_chunks > 0 ? (embedded_chunks / total_chunks) * 100 : 0
            };
            
        } catch (error) {
            console.error('[ResearchService] Failed to get embedding status:', error);
            return { status: 'error', error: error.message, totalChunks: 0, embeddedChunks: 0, progress: 0 };
        }
    }

    /**
     * Delete a research paper from the database
     * @param {string} paperId - Paper ID to delete
     * @param {string} userId - User ID (for security)
     */
    async deletePaper(paperId, userId) {
        try {
            console.log(`[ResearchService] Deleting paper: ${paperId}`);
            
            // First get the paper to check if it has a file
            const paper = this.db.getDb().prepare(
                'SELECT file_path FROM research_papers WHERE id = ? AND uid = ?'
            ).get(paperId, userId);
            
            if (!paper) {
                throw new Error('Paper not found or access denied');
            }
            
            // Delete the file if it exists
            if (paper.file_path && fs.existsSync(paper.file_path)) {
                try {
                    fs.unlinkSync(paper.file_path);
                    console.log(`[ResearchService] Deleted file: ${paper.file_path}`);
                } catch (error) {
                    console.warn(`[ResearchService] Failed to delete file: ${error.message}`);
                }
            }
            
            // Delete from database
            const result = this.db.getDb().prepare(
                'DELETE FROM research_papers WHERE id = ? AND uid = ?'
            ).run(paperId, userId);
            
            console.log(`[ResearchService] Paper deleted successfully`);
            return { success: true, deletedRows: result.changes };
        } catch (error) {
            console.error('[ResearchService] Failed to delete paper:', error);
            throw error;
        }
    }
}

module.exports = ResearchService;
