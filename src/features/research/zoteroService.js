const https = require('https');
const crypto = require('crypto');

/**
 * Zotero API Service for RANI
 * Handles authentication and communication with Zotero Web API
 * 
 * API Documentation: https://www.zotero.org/support/dev/web_api/v3/start
 */
class ZoteroService {
    constructor(databaseClient) {
        this.db = databaseClient;
        this.baseUrl = 'https://api.zotero.org';
        this.apiVersion = 3;
    }

    /**
     * Test Zotero API connection with provided credentials
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID (or group ID if using group library)
     * @param {string} libraryType - 'user' or 'group'
     * @returns {Promise<Object>} Connection test result with user info
     */
    async testConnection(apiKey, userId, libraryType = 'user') {
        try {
            console.log('[ZoteroService] Testing connection:', {
                userId,
                libraryType,
                apiKeyLength: apiKey ? apiKey.length : 0,
                apiKeyStart: apiKey ? apiKey.substring(0, 8) + '...' : 'none'
            });
            
            // First, verify the API key itself using /keys/current endpoint
            const keyUrl = `${this.baseUrl}/keys/current`;
            console.log('[ZoteroService] Verifying API key at:', keyUrl);
            const keyInfo = await this.makeRequest(keyUrl, apiKey);
            console.log('[ZoteroService] API key verified. Key info:', {
                userID: keyInfo.userID,
                username: keyInfo.username,
                access: keyInfo.access
            });
            
            // Now test library access by fetching a limited number of items
            const itemsUrl = `${this.baseUrl}/${libraryType}s/${userId}/items?limit=1`;
            console.log('[ZoteroService] Testing library access at:', itemsUrl);
            
            const response = await this.makeRequest(itemsUrl, apiKey);
            
            console.log('[ZoteroService] Connection test succeeded');
            return {
                success: true,
                keyInfo: keyInfo,
                libraryAccessible: true,
                message: `Successfully connected to Zotero as ${keyInfo.username}`
            };
        } catch (error) {
            console.error('[ZoteroService] Connection test failed:', error);
            console.error('[ZoteroService] Error details:', {
                message: error.message,
                stack: error.stack
            });
            return {
                success: false,
                error: error.message,
                message: 'Failed to connect to Zotero. Please check your API key and user ID.'
            };
        }
    }

    /**
     * Fetch all items from Zotero library
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} libraryType - 'user' or 'group'
     * @param {Object} options - Fetch options (limit, start, itemType, etc.)
     * @returns {Promise<Array>} Array of Zotero items
     */
    async fetchItems(apiKey, userId, libraryType = 'user', options = {}) {
        try {
            const {
                limit = 100,
                start = 0,
                itemType = null,
                tag = null,
                q = null, // search query
                since = null // fetch items modified since version number
            } = options;

            let url = `${this.baseUrl}/${libraryType}s/${userId}/items?limit=${limit}&start=${start}`;
            
            if (itemType) url += `&itemType=${itemType}`;
            if (tag) url += `&tag=${encodeURIComponent(tag)}`;
            if (q) url += `&q=${encodeURIComponent(q)}`;
            if (since) url += `&since=${since}`;

            const items = await this.makeRequest(url, apiKey);
            console.log(`[ZoteroService] Fetched ${items.length} items from Zotero`);
            
            return items;
        } catch (error) {
            console.error('[ZoteroService] Failed to fetch items:', error);
            throw error;
        }
    }

    /**
     * Fetch all collections from Zotero library
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} libraryType - 'user' or 'group'
     * @returns {Promise<Array>} Array of collections
     */
    async fetchCollections(apiKey, userId, libraryType = 'user') {
        try {
            const url = `${this.baseUrl}/${libraryType}s/${userId}/collections`;
            const collections = await this.makeRequest(url, apiKey);
            console.log(`[ZoteroService] Fetched ${collections.length} collections from Zotero`);
            
            return collections;
        } catch (error) {
            console.error('[ZoteroService] Failed to fetch collections:', error);
            throw error;
        }
    }

    /**
     * Fetch item attachments (PDFs, etc.)
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} itemKey - Zotero item key
     * @param {string} libraryType - 'user' or 'group'
     * @returns {Promise<Array>} Array of attachments
     */
    async fetchItemAttachments(apiKey, userId, itemKey, libraryType = 'user') {
        try {
            const url = `${this.baseUrl}/${libraryType}s/${userId}/items/${itemKey}/children?itemType=attachment`;
            const attachments = await this.makeRequest(url, apiKey);
            
            return attachments;
        } catch (error) {
            console.error('[ZoteroService] Failed to fetch attachments:', error);
            throw error;
        }
    }

    /**
     * Download PDF attachment from Zotero
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} itemKey - Zotero item key
     * @param {string} libraryType - 'user' or 'group'
     * @returns {Promise<Buffer>} PDF file buffer
     */
    async downloadAttachment(apiKey, userId, itemKey, libraryType = 'user') {
        try {
            const url = `${this.baseUrl}/${libraryType}s/${userId}/items/${itemKey}/file`;
            const buffer = await this.downloadFile(url, apiKey);
            
            return buffer;
        } catch (error) {
            console.error('[ZoteroService] Failed to download attachment:', error);
            throw error;
        }
    }

    /**
     * Fetch notes for an item
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} itemKey - Zotero item key
     * @param {string} libraryType - 'user' or 'group'
     * @returns {Promise<Array>} Array of notes
     */
    async fetchItemNotes(apiKey, userId, itemKey, libraryType = 'user') {
        try {
            const url = `${this.baseUrl}/${libraryType}s/${userId}/items/${itemKey}/children?itemType=note`;
            const notes = await this.makeRequest(url, apiKey);
            
            return notes;
        } catch (error) {
            console.error('[ZoteroService] Failed to fetch notes:', error);
            throw error;
        }
    }

    /**
     * Get library version (for sync tracking)
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} libraryType - 'user' or 'group'
     * @returns {Promise<number>} Library version number
     */
    async getLibraryVersion(apiKey, userId, libraryType = 'user') {
        try {
            const url = `${this.baseUrl}/${libraryType}s/${userId}/items?limit=1`;
            const response = await this.makeRequestWithHeaders(url, apiKey);
            
            const version = response.headers['last-modified-version'];
            return parseInt(version, 10);
        } catch (error) {
            console.error('[ZoteroService] Failed to get library version:', error);
            throw error;
        }
    }

    /**
     * Parse Zotero item to RANI paper format
     * @param {Object} zoteroItem - Zotero item object
     * @returns {Object} Paper object in RANI format
     */
    parseZoteroItem(zoteroItem) {
        const { data, key, version } = zoteroItem;
        
        // Extract basic metadata
        const title = data.title || 'Untitled';
        const authors = this.formatAuthors(data.creators);
        const abstract = data.abstractNote || '';
        const year = this.extractYear(data.date);
        const doi = data.DOI || null;
        const url = data.url || null;
        
        // Extract publication venue
        const venue = data.publicationTitle || data.journalAbbreviation || 
                     data.proceedingsTitle || data.bookTitle || '';
        
        // Check for arXiv ID
        const arxivId = this.extractArxivId(data);
        
        return {
            title,
            authors,
            abstract,
            year,
            venue,
            doi,
            url,
            arxivId,
            source: 'zotero',
            zoteroKey: key,
            zoteroVersion: version,
            citationCount: 0, // Zotero doesn't provide citation counts
            metadata: JSON.stringify({
                itemType: data.itemType,
                tags: data.tags || [],
                collections: data.collections || [],
                dateAdded: data.dateAdded,
                dateModified: data.dateModified,
                extra: data.extra || '',
                language: data.language || ''
            })
        };
    }

    /**
     * Format authors from Zotero creators array
     * @param {Array} creators - Zotero creators array
     * @returns {string} Formatted author string
     */
    formatAuthors(creators = []) {
        if (!creators || creators.length === 0) return '';
        
        return creators
            .filter(c => c.creatorType === 'author')
            .map(c => {
                if (c.name) return c.name;
                return `${c.firstName || ''} ${c.lastName || ''}`.trim();
            })
            .join(', ');
    }

    /**
     * Extract year from Zotero date field
     * @param {string} dateString - Zotero date string
     * @returns {number|null} Year or null
     */
    extractYear(dateString) {
        if (!dateString) return null;
        
        const yearMatch = dateString.match(/\d{4}/);
        return yearMatch ? parseInt(yearMatch[0], 10) : null;
    }

    /**
     * Extract arXiv ID from Zotero item
     * @param {Object} itemData - Zotero item data
     * @returns {string|null} arXiv ID or null
     */
    extractArxivId(itemData) {
        // Check URL for arXiv
        if (itemData.url && itemData.url.includes('arxiv.org')) {
            const match = itemData.url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
            if (match) return match[1];
        }
        
        // Check extra field for arXiv ID
        if (itemData.extra) {
            const match = itemData.extra.match(/arXiv:\s*(\d+\.\d+)/i);
            if (match) return match[1];
        }
        
        return null;
    }

    /**
     * Make HTTP GET request to Zotero API
     * @param {string} url - API endpoint URL
     * @param {string} apiKey - Zotero API key
     * @returns {Promise<any>} Parsed JSON response
     */
    async makeRequest(url, apiKey) {
        return new Promise((resolve, reject) => {
            console.log('[ZoteroService] Making request to:', url);
            
            const options = {
                headers: {
                    'Zotero-API-Key': apiKey,
                    'Zotero-API-Version': this.apiVersion.toString()
                }
            };

            https.get(url, options, (res) => {
                console.log('[ZoteroService] Response status:', res.statusCode);
                console.log('[ZoteroService] Response headers:', res.headers);
                
                let data = '';
                
                res.on('data', chunk => data += chunk);
                
                res.on('end', () => {
                    console.log('[ZoteroService] Response received, length:', data.length);
                    
                    if (res.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (error) {
                            console.error('[ZoteroService] JSON parse error:', error);
                            reject(new Error('Failed to parse Zotero API response'));
                        }
                    } else {
                        console.error('[ZoteroService] Non-200 status code:', res.statusCode);
                        console.error('[ZoteroService] Response data:', data);
                        reject(new Error(`Zotero API error: ${res.statusCode} - ${data}`));
                    }
                });
            }).on('error', (error) => {
                console.error('[ZoteroService] HTTP request error:', error);
                reject(error);
            });
        });
    }

    /**
     * Make HTTP GET request and return response with headers
     * @param {string} url - API endpoint URL
     * @param {string} apiKey - Zotero API key
     * @returns {Promise<Object>} Response object with data and headers
     */
    async makeRequestWithHeaders(url, apiKey) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'Zotero-API-Key': apiKey,
                    'Zotero-API-Version': this.apiVersion.toString()
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', chunk => data += chunk);
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            resolve({ data: parsed, headers: res.headers });
                        } catch (error) {
                            reject(new Error('Failed to parse Zotero API response'));
                        }
                    } else {
                        reject(new Error(`Zotero API error: ${res.statusCode} - ${data}`));
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Download file from Zotero
     * @param {string} url - File URL
     * @param {string} apiKey - Zotero API key
     * @param {number} redirectCount - Internal redirect counter
     * @returns {Promise<Buffer>} File buffer
     */
    async downloadFile(url, apiKey, redirectCount = 0) {
        const MAX_REDIRECTS = 5;
        
        if (redirectCount >= MAX_REDIRECTS) {
            throw new Error('Too many redirects');
        }

        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'Zotero-API-Key': apiKey,
                    'Zotero-API-Version': this.apiVersion.toString()
                }
            };

            https.get(url, options, (res) => {
                // Follow redirects (301, 302, 303, 307, 308)
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    const redirectUrl = res.headers.location;
                    if (!redirectUrl) {
                        reject(new Error(`Redirect ${res.statusCode} without location header`));
                        return;
                    }
                    
                    console.log(`[ZoteroService] Following redirect (${res.statusCode}) to: ${redirectUrl}`);
                    
                    // Follow the redirect
                    this.downloadFile(redirectUrl, apiKey, redirectCount + 1)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                
                if (res.statusCode === 200) {
                    const chunks = [];
                    
                    res.on('data', chunk => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                } else {
                    reject(new Error(`Failed to download file: ${res.statusCode}`));
                }
            }).on('error', reject);
        });
    }

    /**
     * Save Zotero credentials to database
     * @param {string} uid - User ID
     * @param {string} apiKey - Zotero API key
     * @param {string} userId - Zotero user ID
     * @param {string} libraryType - 'user' or 'group'
     * @returns {Promise<void>}
     */
    async saveCredentials(uid, apiKey, userId, libraryType = 'user') {
        try {
            const query = `
                INSERT OR REPLACE INTO zotero_credentials 
                (uid, api_key, zotero_user_id, library_type, updated_at)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const now = Date.now();
            this.db.getDb().prepare(query).run(uid, apiKey, userId, libraryType, now);
            
            console.log(`[ZoteroService] Saved credentials for user ${uid}`);
        } catch (error) {
            console.error('[ZoteroService] Failed to save credentials:', error);
            throw error;
        }
    }

    /**
     * Get Zotero credentials from database
     * @param {string} uid - User ID
     * @returns {Promise<Object|null>} Credentials or null
     */
    async getCredentials(uid) {
        try {
            const query = `
                SELECT api_key, zotero_user_id, library_type, last_sync_version, last_sync_at
                FROM zotero_credentials
                WHERE uid = ?
            `;
            
            const result = this.db.getDb().prepare(query).get(uid);
            return result || null;
        } catch (error) {
            console.error('[ZoteroService] Failed to get credentials:', error);
            return null;
        }
    }

    /**
     * Update last sync information
     * @param {string} uid - User ID
     * @param {number} version - Library version number
     * @returns {Promise<void>}
     */
    async updateLastSync(uid, version) {
        try {
            const query = `
                UPDATE zotero_credentials
                SET last_sync_version = ?, last_sync_at = ?
                WHERE uid = ?
            `;
            
            const now = Date.now();
            this.db.getDb().prepare(query).run(version, now, uid);
            
            console.log(`[ZoteroService] Updated last sync for user ${uid} to version ${version}`);
        } catch (error) {
            console.error('[ZoteroService] Failed to update last sync:', error);
            throw error;
        }
    }

    /**
     * Delete Zotero credentials
     * @param {string} uid - User ID
     * @returns {Promise<void>}
     */
    async deleteCredentials(uid) {
        try {
            const query = `DELETE FROM zotero_credentials WHERE uid = ?`;
            this.db.getDb().prepare(query).run(uid);
            
            console.log(`[ZoteroService] Deleted credentials for user ${uid}`);
        } catch (error) {
            console.error('[ZoteroService] Failed to delete credentials:', error);
            throw error;
        }
    }
}

module.exports = ZoteroService;
