const crypto = require('crypto');
const https = require('https');
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
            arxiv: 'http://export.arxiv.org/api',
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
            
            // For now, return mock results to test the UI
            const mockResults = [
                {
                    id: 'mock-1',
                    title: 'A Survey of Large Language Models for Research',
                    authors: 'Smith, J., Doe, J.',
                    abstract: 'This paper surveys the current state of large language models and their applications in research contexts.',
                    year: 2024,
                    venue: 'ArXiv',
                    url: 'https://arxiv.org/abs/2401.00000',
                    citationCount: 42,
                    source: 'mock'
                },
                {
                    id: 'mock-2',
                    title: 'Advances in Natural Language Processing',
                    authors: 'Johnson, A., Brown, K.',
                    abstract: 'Recent developments in NLP have shown significant improvements in understanding and generation tasks.',
                    year: 2023,
                    venue: 'ACL',
                    url: 'https://aclanthology.org/2023.acl-long.1',
                    citationCount: 128,
                    source: 'mock'
                }
            ];
            
            return mockResults.slice(0, limit);
            
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
                const authorMatches = entry.match(/<author><name>(.*?)<\/name><\/author>/g);
                const authors = authorMatches ? 
                    authorMatches.map(match => match.match(/<name>(.*?)<\/name>/)[1]).join(', ') : '';
                
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
            return papers.map(paper => ({
                ...paper,
                metadata: paper.metadata ? JSON.parse(paper.metadata) : {}
            }));
        } catch (error) {
            console.error('[ResearchService] Failed to get user papers:', error);
            throw error;
        }
    }
}

module.exports = ResearchService;
