import { LitElement, html, css } from 'lit';

/**
 * Zotero Settings Component for RANI
 * Allows users to connect their Zotero account and sync their library
 */
export class ZoteroSettings extends LitElement {
    static properties = {
        connected: { type: Boolean },
        apiKey: { type: String },
        userId: { type: String },
        libraryType: { type: String },
        syncStatus: { type: Object },
        isLoading: { type: Boolean },
        isSyncing: { type: Boolean },
        statusMessage: { type: String },
        statusType: { type: String } // 'success', 'error', 'info'
    };

    static styles = css`
        :host {
            display: block;
            padding: 20px;
            max-width: 800px;
        }

        .section {
            background: var(--surface-color, #ffffff);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            border: 1px solid var(--border-color, #e0e0e0);
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--text-primary, #1a1a1a);
        }

        .section-description {
            font-size: 14px;
            color: var(--text-secondary, #666);
            margin-bottom: 20px;
            line-height: 1.5;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--text-primary, #1a1a1a);
        }

        input[type="text"],
        input[type="password"],
        select {
            width: 100%;
            padding: 10px 12px;
            font-size: 14px;
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 8px;
            background: var(--input-bg, #ffffff);
            color: var(--text-primary, #1a1a1a);
            box-sizing: border-box;
        }

        input:focus,
        select:focus {
            outline: none;
            border-color: var(--primary-color, #4a90e2);
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }

        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }

        button {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-primary {
            background: var(--primary-color, #4a90e2);
            color: white;
        }

        .btn-primary:hover:not(:disabled) {
            background: var(--primary-hover, #357abd);
        }

        .btn-secondary {
            background: var(--secondary-bg, #f5f5f5);
            color: var(--text-primary, #1a1a1a);
        }

        .btn-secondary:hover:not(:disabled) {
            background: var(--secondary-hover, #e0e0e0);
        }

        .btn-danger {
            background: #ef4444;
            color: white;
        }

        .btn-danger:hover:not(:disabled) {
            background: #dc2626;
        }

        .status-message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-message.success {
            background: #d1fae5;
            color: #065f46;
        }

        .status-message.error {
            background: #fee2e2;
            color: #991b1b;
        }

        .status-message.info {
            background: #dbeafe;
            color: #1e40af;
        }

        .sync-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }

        .sync-info-item {
            padding: 12px;
            background: var(--secondary-bg, #f9f9f9);
            border-radius: 8px;
        }

        .sync-info-label {
            font-size: 12px;
            color: var(--text-secondary, #666);
            margin-bottom: 4px;
        }

        .sync-info-value {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary, #1a1a1a);
        }

        .help-text {
            font-size: 13px;
            color: var(--text-secondary, #666);
            margin-top: 6px;
            line-height: 1.4;
        }

        .link {
            color: var(--primary-color, #4a90e2);
            text-decoration: none;
        }

        .link:hover {
            text-decoration: underline;
        }

        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .connected-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: #d1fae5;
            color: #065f46;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
        }

        .connected-badge::before {
            content: '●';
            color: #10b981;
        }
    `;

    constructor() {
        super();
        this.connected = false;
        this.apiKey = '';
        this.userId = '';
        this.libraryType = 'user';
        this.syncStatus = null;
        this.isLoading = false;
        this.isSyncing = false;
        this.statusMessage = '';
        this.statusType = '';
    }

    async connectedCallback() {
        super.connectedCallback();
        await this.loadCredentials();
        if (this.connected) {
            await this.loadSyncStatus();
        }
    }

    async loadCredentials() {
        try {
            const credentials = await window.api.zotero.getCredentials();
            if (credentials) {
                this.connected = true;
                this.userId = credentials.zotero_user_id;
                this.libraryType = credentials.library_type || 'user';
                this.apiKey = '••••••••'; // Hide the actual API key
            }
        } catch (error) {
            console.error('Failed to load Zotero credentials:', error);
        }
    }

    async loadSyncStatus() {
        try {
            this.syncStatus = await window.api.zotero.getSyncStatus();
        } catch (error) {
            console.error('Failed to load sync status:', error);
        }
    }

    async handleTestConnection() {
        if (!this.apiKey || !this.userId || this.apiKey === '••••••••') {
            this.showStatus('Please enter your API key and User ID', 'error');
            return;
        }

        this.isLoading = true;
        this.statusMessage = '';

        try {
            const result = await window.api.zotero.testConnection(
                this.apiKey,
                this.userId,
                this.libraryType
            );

            if (result.success) {
                this.showStatus('Successfully connected to Zotero!', 'success');
            } else {
                this.showStatus(result.message || 'Connection failed', 'error');
            }
        } catch (error) {
            this.showStatus('Failed to connect to Zotero. Please check your credentials.', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async handleConnect() {
        if (!this.apiKey || !this.userId || this.apiKey === '••••••••') {
            this.showStatus('Please enter your API key and User ID', 'error');
            return;
        }

        this.isLoading = true;
        this.statusMessage = '';

        try {
            // First test the connection
            const testResult = await window.api.zotero.testConnection(
                this.apiKey,
                this.userId,
                this.libraryType
            );

            if (!testResult.success) {
                this.showStatus(testResult.message || 'Connection failed', 'error');
                this.isLoading = false;
                return;
            }

            // Save credentials
            await window.api.zotero.saveCredentials(
                this.apiKey,
                this.userId,
                this.libraryType
            );

            this.connected = true;
            this.showStatus('Zotero account connected successfully!', 'success');
            await this.loadSyncStatus();
            
        } catch (error) {
            this.showStatus('Failed to save Zotero credentials', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async handleDisconnect() {
        if (!confirm('Are you sure you want to disconnect your Zotero account? Your synced papers will remain in RANI.')) {
            return;
        }

        try {
            await window.api.zotero.deleteCredentials();
            this.connected = false;
            this.apiKey = '';
            this.userId = '';
            this.syncStatus = null;
            this.showStatus('Zotero account disconnected', 'info');
        } catch (error) {
            this.showStatus('Failed to disconnect Zotero account', 'error');
        }
    }

    async handleSync() {
        this.isSyncing = true;
        this.statusMessage = '';

        try {
            this.showStatus('Syncing with Zotero...', 'info');
            
            const result = await window.api.zotero.syncLibrary({
                includeAttachments: true,
                includeNotes: true,
                forceFullSync: false
            });

            if (result.success) {
                this.showStatus(
                    `Sync complete! Imported: ${result.imported}, Updated: ${result.updated}, Failed: ${result.failed}`,
                    'success'
                );
                await this.loadSyncStatus();
                
                // Notify parent to refresh papers list
                this.dispatchEvent(new CustomEvent('sync-complete', {
                    detail: result,
                    bubbles: true,
                    composed: true
                }));
            }
        } catch (error) {
            this.showStatus('Sync failed: ' + error.message, 'error');
        } finally {
            this.isSyncing = false;
        }
    }

    async handleFullSync() {
        if (!confirm('This will perform a complete re-sync of your entire Zotero library. This may take some time. Continue?')) {
            return;
        }

        this.isSyncing = true;
        this.statusMessage = '';

        try {
            this.showStatus('Performing full sync with Zotero...', 'info');
            
            const result = await window.api.zotero.syncLibrary({
                includeAttachments: true,
                includeNotes: true,
                forceFullSync: true
            });

            if (result.success) {
                this.showStatus(
                    `Full sync complete! Imported: ${result.imported}, Updated: ${result.updated}`,
                    'success'
                );
                await this.loadSyncStatus();
                
                this.dispatchEvent(new CustomEvent('sync-complete', {
                    detail: result,
                    bubbles: true,
                    composed: true
                }));
            }
        } catch (error) {
            this.showStatus('Full sync failed: ' + error.message, 'error');
        } finally {
            this.isSyncing = false;
        }
    }

    async handleDeleteSynced() {
        if (!confirm('This will delete all papers imported from Zotero. Are you sure? This cannot be undone.')) {
            return;
        }

        try {
            const count = await window.api.zotero.deleteAllSyncedItems();
            this.showStatus(`Deleted ${count} Zotero papers from RANI`, 'success');
            await this.loadSyncStatus();
            
            this.dispatchEvent(new CustomEvent('sync-complete', {
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            this.showStatus('Failed to delete synced items: ' + error.message, 'error');
        }
    }

    showStatus(message, type) {
        this.statusMessage = message;
        this.statusType = type;
    }

    handleApiKeyInput(e) {
        this.apiKey = e.target.value;
    }

    handleUserIdInput(e) {
        this.userId = e.target.value;
    }

    handleLibraryTypeChange(e) {
        this.libraryType = e.target.value;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    }

    render() {
        return html`
            <div class="section">
                <div class="section-title">
                    Zotero Integration
                    ${this.connected ? html`<span class="connected-badge">Connected</span>` : ''}
                </div>
                <div class="section-description">
                    Connect your Zotero account to import your research library, papers, notes, and PDFs into RANI.
                    Changes made in Zotero can be synced to keep your libraries in sync.
                </div>

                ${this.statusMessage ? html`
                    <div class="status-message ${this.statusType}">
                        ${this.statusMessage}
                    </div>
                ` : ''}

                ${!this.connected ? html`
                    <div class="form-group">
                        <label for="api-key">Zotero API Key</label>
                        <input
                            id="api-key"
                            type="password"
                            placeholder="Enter your Zotero API key"
                            .value=${this.apiKey}
                            @input=${this.handleApiKeyInput}
                        />
                        <div class="help-text">
                            Get your API key from 
                            <a href="https://www.zotero.org/settings/keys" target="_blank" class="link">
                                Zotero Settings → API Keys
                            </a>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="user-id">User ID</label>
                        <input
                            id="user-id"
                            type="text"
                            placeholder="Enter your Zotero User ID"
                            .value=${this.userId}
                            @input=${this.handleUserIdInput}
                        />
                        <div class="help-text">
                            Find your User ID on your Zotero profile page or in
                            <a href="https://www.zotero.org/settings/keys" target="_blank" class="link">
                                API Keys settings
                            </a>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="library-type">Library Type</label>
                        <select
                            id="library-type"
                            .value=${this.libraryType}
                            @change=${this.handleLibraryTypeChange}
                        >
                            <option value="user">Personal Library</option>
                            <option value="group">Group Library</option>
                        </select>
                        <div class="help-text">
                            Select "Personal Library" for your own collection, or "Group Library" for a shared collection
                        </div>
                    </div>

                    <div class="button-group">
                        <button
                            class="btn-secondary"
                            @click=${this.handleTestConnection}
                            ?disabled=${this.isLoading}
                        >
                            ${this.isLoading ? html`<span class="spinner"></span>` : 'Test Connection'}
                        </button>
                        <button
                            class="btn-primary"
                            @click=${this.handleConnect}
                            ?disabled=${this.isLoading}
                        >
                            ${this.isLoading ? html`<span class="spinner"></span>` : 'Connect Zotero'}
                        </button>
                    </div>
                ` : html`
                    <div class="sync-info">
                        <div class="sync-info-item">
                            <div class="sync-info-label">Last Sync</div>
                            <div class="sync-info-value">
                                ${this.formatDate(this.syncStatus?.lastSync)}
                            </div>
                        </div>
                        <div class="sync-info-item">
                            <div class="sync-info-label">Synced Items</div>
                            <div class="sync-info-value">
                                ${this.syncStatus?.syncedItems || 0}
                            </div>
                        </div>
                        <div class="sync-info-item">
                            <div class="sync-info-label">Library Type</div>
                            <div class="sync-info-value">
                                ${this.libraryType === 'user' ? 'Personal' : 'Group'}
                            </div>
                        </div>
                    </div>

                    <div class="button-group">
                        <button
                            class="btn-primary"
                            @click=${this.handleSync}
                            ?disabled=${this.isSyncing}
                        >
                            ${this.isSyncing ? html`<span class="spinner"></span>` : 'Sync Now'}
                        </button>
                        <button
                            class="btn-secondary"
                            @click=${this.handleFullSync}
                            ?disabled=${this.isSyncing}
                        >
                            Full Re-sync
                        </button>
                        <button
                            class="btn-danger"
                            @click=${this.handleDeleteSynced}
                            ?disabled=${this.isSyncing}
                        >
                            Delete Synced Items
                        </button>
                        <button
                            class="btn-secondary"
                            @click=${this.handleDisconnect}
                            ?disabled=${this.isSyncing}
                        >
                            Disconnect
                        </button>
                    </div>
                `}
            </div>

            <div class="section">
                <div class="section-title">How It Works</div>
                <div class="section-description">
                    <strong>1. Get Your API Key:</strong> Visit Zotero Settings and create a new API key with read access to your library.<br><br>
                    <strong>2. Find Your User ID:</strong> Your User ID is shown on the API Keys page or in your profile URL.<br><br>
                    <strong>3. Connect:</strong> Enter your credentials above and click "Connect Zotero".<br><br>
                    <strong>4. Sync:</strong> Click "Sync Now" to import your papers, PDFs, and notes from Zotero.<br><br>
                    <strong>5. Work Seamlessly:</strong> All your Zotero papers will appear in RANI's Research Library, complete with annotations and attachments.
                </div>
            </div>
        `;
    }
}

customElements.define('zotero-settings', ZoteroSettings);
