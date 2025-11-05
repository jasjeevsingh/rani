import { LitElement, html, css } from '../assets/lit-core-2.7.4.min.js';

// Simple classMap utility for conditional classes
const classMap = (classes) => {
    return Object.entries(classes)
        .filter(([key, value]) => value)
        .map(([key]) => key)
        .join(' ');
};

/**
 * Research View Component for RANI
 * Main research interface with paper search, document management, and annotations
 */
export class ResearchView extends LitElement {
    static styles = css`
        * {
            box-sizing: border-box;
        }

        :host {
            display: flex;
            height: 100%;
            max-height: 100vh;
            background: var(--main-content-background, rgba(0, 0, 0, 0.8));
            color: var(--text-color, #e5e5e7);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border-radius: 8px;
            overflow: hidden;
            /* Force proper event handling */
            pointer-events: auto;
            touch-action: auto;
        }

        .research-container {
            display: flex;
            width: 100%;
            height: 100%;
        }

        .sidebar {
            width: 300px;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            border-right: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .sidebar-header {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
        }

        .sidebar-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
            color: var(--text-color, #e5e5e7);
        }

        .sidebar-subtitle {
            font-size: 0.875rem;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            margin: 0;
        }

        .sidebar-content {
            flex: 1;
            overflow-y: scroll;
            overflow-x: hidden;
            padding: 1rem;
            min-height: 0;
            max-height: 500px; /* Force a constraint smaller than content */
            height: 0; /* Force flexbox to use flex-grow instead of content height */
            -webkit-overflow-scrolling: touch;
            will-change: scroll-position;
            /* Force scroll container to accept mouse events */
            pointer-events: auto;
            touch-action: pan-y;
            overscroll-behavior: contain;
        }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .toolbar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            flex-shrink: 0;
        }

        .search-container {
            flex: 1;
            min-width: 0;
            position: relative;
        }

        .search-input {
            width: 100%;
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 8px;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color, #e5e5e7);
            font-size: 0.875rem;
            box-sizing: border-box;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-box-shadow, rgba(0, 122, 255, 0.2));
            background: var(--input-focus-background, rgba(0, 0, 0, 0.5));
        }

        .action-button {
            padding: 0.5rem 1rem;
            background: var(--text-input-button-background, #007aff);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: background-color 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
        }

        .action-button:hover {
            background: var(--text-input-button-hover, #0056b3);
        }

        .action-button:disabled {
            background: var(--button-background, rgba(0, 0, 0, 0.5));
            cursor: not-allowed;
            opacity: 0.5;
        }

        .secondary-button {
            padding: 0.5rem 1rem;
            background: transparent;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
        }

        .secondary-button:hover {
            background: var(--hover-background, rgba(255, 255, 255, 0.1));
            color: var(--text-color, #e5e5e7);
        }

        .content-area {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            min-height: 0;
        }

        .tab-container {
            display: flex;
            border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.8));
            flex-shrink: 0;
        }

        .tab-content {
            flex: 1;
            overflow-y: scroll; /* Always show scrollbar track */
            overflow-x: hidden;
            padding: 1rem;
            min-height: 0;
            max-height: 500px; /* Force a constraint smaller than content */
            height: 0; /* Force flexbox to use flex-grow instead of content height */
            -webkit-overflow-scrolling: touch;
            will-change: scroll-position;
            /* Force scroll container to accept mouse events */
            pointer-events: auto;
            touch-action: pan-y;
            overscroll-behavior: contain;
        }

        .tab {
            padding: 0.75rem 1rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            font-size: 0.875rem;
        }

        .tab.active {
            border-bottom-color: var(--focus-border-color, #007aff);
            color: var(--focus-border-color, #007aff);
        }

        .tab:hover:not(.active) {
            background: var(--hover-background, rgba(255, 255, 255, 0.1));
        }

        .search-results {
            display: grid;
            gap: 1rem;
        }

        .paper-card {
            padding: 1rem;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 8px;
            transition: all 0.2s;
        }

        .paper-card:hover {
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .paper-title {
            font-size: 1rem;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
            line-height: 1.4;
            color: var(--text-color, #e5e5e7);
        }

        .paper-authors {
            font-size: 0.875rem;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            margin: 0 0 0.5rem 0;
        }

        .paper-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            margin: 0 0 0.75rem 0;
        }

        .paper-abstract {
            font-size: 0.875rem;
            line-height: 1.5;
            color: var(--text-color, #e5e5e7);
            margin: 0 0 1rem 0;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .paper-actions {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .small-button {
            padding: 0.25rem 0.75rem;
            font-size: 0.75rem;
            border-radius: 4px;
        }

        .document-list {
            display: grid;
            gap: 0.75rem;
            min-height: 0;
        }

        .document-item {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .document-item:hover {
            background: var(--hover-background, rgba(255, 255, 255, 0.1));
        }

        .document-name {
            font-size: 0.875rem;
            font-weight: 500;
            margin: 0 0 0.25rem 0;
        }

        .document-info {
            font-size: 0.75rem;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
        }

        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
        }

        .empty-state h3 {
            margin: 0 0 0.5rem 0;
            color: var(--text-color, #e5e5e7);
        }

        .upload-zone {
            border: 2px dashed var(--border-color);
            border-radius: 8px;
            padding: 2rem;
            text-align: center;
            transition: border-color 0.2s;
            margin-bottom: 1rem;
        }

        .upload-zone.dragover {
            border-color: var(--focus-border-color, #007aff);
            background: var(--focus-box-shadow, rgba(0, 122, 255, 0.2));
        }

        .upload-zone p {
            margin: 0 0 1rem 0;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
        }

        .embedding-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            margin-top: 0.25rem;
            font-weight: 500;
        }

        .status-pending {
            background: rgba(255, 193, 7, 0.2);
            color: #ffc107;
        }

        .status-processing {
            background: rgba(33, 150, 243, 0.2);
            color: #2196f3;
        }

        .status-complete {
            background: rgba(76, 175, 80, 0.2);
            color: #4caf50;
        }

        .status-partial {
            background: rgba(255, 152, 0, 0.2);
            color: #ff9800;
        }

        .status-failed {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
        }

        .status-no-doc {
            background: rgba(158, 158, 158, 0.2);
            color: #9e9e9e;
        }

        .embed-button {
            padding: 0.2rem 0.5rem;
            font-size: 0.7rem;
            border-radius: 4px;
            margin-top: 0.25rem;
        }

        /* Zotero Integration Styles */
        .zotero-container {
            padding: 1.5rem;
            max-width: 800px;
            margin: 0 auto;
        }

        .zotero-header h3 {
            margin: 0 0 0.5rem 0;
            color: var(--text-color, #e5e5e7);
            font-size: 1.5rem;
        }

        .zotero-description {
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            margin: 0 0 1.5rem 0;
            line-height: 1.5;
        }

        .connected-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.75rem;
            background: rgba(76, 175, 80, 0.2);
            color: #4caf50;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-left: 0.5rem;
        }

        .status-message {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
        }

        .status-message.success {
            background: rgba(76, 175, 80, 0.2);
            color: #4caf50;
        }

        .status-message.error {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
        }

        .status-message.info {
            background: rgba(33, 150, 243, 0.2);
            color: #2196f3;
        }

        .zotero-setup,
        .zotero-connected {
            background: var(--card-background, rgba(255, 255, 255, 0.05));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            color: var(--text-color, #e5e5e7);
        }

        .text-input {
            width: 100%;
            padding: 0.75rem;
            font-size: 0.875rem;
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 8px;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color, #e5e5e7);
            box-sizing: border-box;
        }

        .text-input:focus {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
        }

        .help-text {
            font-size: 0.75rem;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            margin-top: 0.5rem;
            line-height: 1.4;
        }

        .link {
            color: var(--focus-border-color, #007aff);
            text-decoration: none;
        }

        .link:hover {
            text-decoration: underline;
        }

        .button-group {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        .button-group button {
            flex: 1;
            min-width: 120px;
        }

        .secondary-button.danger {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
        }

        .secondary-button.danger:hover:not(:disabled) {
            background: rgba(244, 67, 54, 0.3);
        }

        .sync-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .stat-item {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: 8px;
            padding: 1rem;
        }

        .stat-label {
            font-size: 0.75rem;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            margin-bottom: 0.5rem;
        }

        .stat-value {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-color, #e5e5e7);
        }

        .zotero-help {
            background: var(--card-background, rgba(255, 255, 255, 0.05));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 12px;
            padding: 1.5rem;
        }

        .zotero-help h4 {
            margin: 0 0 1rem 0;
            color: var(--text-color, #e5e5e7);
        }

        .zotero-help ol {
            margin: 0;
            padding-left: 1.5rem;
            color: var(--description-color, rgba(255, 255, 255, 0.7));
            line-height: 1.8;
        }

        .zotero-help li {
            margin-bottom: 0.5rem;
        }

        .zotero-help strong {
            color: var(--text-color, #e5e5e7);
        }

        @media (max-width: 768px) {
            .research-container {
                flex-direction: column;
            }

            .sidebar {
                width: 100%;
                height: auto;
                border-right: none;
                border-bottom: 1px solid var(--border-color);
            }

            .toolbar {
                flex-direction: column;
                gap: 0.75rem;
                align-items: stretch;
            }

            .search-container {
                order: -1;
            }

            .button-group button {
                min-width: 100%;
            }

            .sync-stats {
                grid-template-columns: 1fr;
            }
        }
    `;

    static properties = {
        searchResults: { type: Array },
        documents: { type: Array },
        papers: { type: Array },
        currentTab: { type: String },
        selectedDocument: { type: Object },
        isLoading: { type: Boolean },
        searchQuery: { type: String },
        embeddingStatuses: { type: Object },
        documentEmbeddingStatuses: { type: Object },
        // Zotero properties
        zoteroConnected: { type: Boolean },
        zoteroApiKey: { type: String },
        zoteroUserId: { type: String },
        zoteroLibraryType: { type: String },
        zoteroSyncStatus: { type: Object },
        zoteroSyncing: { type: Boolean },
        zoteroStatusMessage: { type: String },
        zoteroStatusType: { type: String }
    };

    constructor() {
        super();
        this.searchResults = [];
        this.documents = [];
        this.papers = [];
        this.currentTab = 'search';
        this.selectedDocument = null;
        this.isLoading = false;
        this.searchQuery = '';
        this.embeddingStatuses = {};
        this.documentEmbeddingStatuses = {};
        // Zotero defaults
        this.zoteroConnected = false;
        this.zoteroApiKey = '';
        this.zoteroUserId = '';
        this.zoteroLibraryType = 'user';
        this.zoteroSyncStatus = null;
        this.zoteroSyncing = false;
        this.zoteroStatusMessage = '';
        this.zoteroStatusType = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadDocuments();
        this.loadZoteroCredentials();
    }

    firstUpdated() {
        // Aggressively ensure wheel/scroll events work
        const tabContent = this.shadowRoot.querySelector('.tab-content');
        const researchContainer = this.shadowRoot.querySelector('.research-container');
        
        if (tabContent) {
            // Force the element to be scrollable and focusable
            tabContent.setAttribute('tabindex', '0');
            tabContent.style.pointerEvents = 'auto';
            
            // Log scroll info for debugging
            console.log('[ResearchView] Tab content dimensions:', {
                scrollHeight: tabContent.scrollHeight,
                clientHeight: tabContent.clientHeight,
                offsetHeight: tabContent.offsetHeight,
                scrollTop: tabContent.scrollTop,
                hasOverflow: tabContent.scrollHeight > tabContent.clientHeight
            });
            
            // Manually handle scroll since default behavior isn't working
            tabContent.addEventListener('wheel', (e) => {
                e.preventDefault(); // Prevent any default behavior
                e.stopPropagation(); // Stop event from bubbling
                
                // Get fresh dimensions
                const maxScroll = tabContent.scrollHeight - tabContent.clientHeight;
                
                // Manually scroll the element
                const scrollAmount = e.deltaY;
                const newScrollTop = Math.max(0, Math.min(tabContent.scrollTop + scrollAmount, maxScroll));
                tabContent.scrollTop = newScrollTop;
                
                console.log('[ResearchView] Wheel event - deltaY:', e.deltaY, 'scrollTop:', tabContent.scrollTop, 
                           'maxScroll:', maxScroll, 'scrollHeight:', tabContent.scrollHeight, 
                           'clientHeight:', tabContent.clientHeight);
            }, { passive: false, capture: true }); // passive: false allows preventDefault
        }
        
        // Also add to the entire container
        if (researchContainer) {
            researchContainer.style.pointerEvents = 'auto';
        }
        
        // Log to confirm this method runs
        console.log('[ResearchView] firstUpdated completed, manual scroll setup done');
    }

    render() {
        return html`
            <div class="research-container">
                <div class="sidebar">
                    <div class="sidebar-header">
                        <h2 class="sidebar-title">Research Library</h2>
                        <p class="sidebar-subtitle">Manage your papers and documents</p>
                    </div>
                    <div class="sidebar-content">
                        ${this.renderDocumentList()}
                    </div>
                </div>

                <div class="main-content">
                    <div class="toolbar">
                        <div class="search-container">
                            <input
                                type="text"
                                class="search-input"
                                placeholder="Search arXiv..."
                                .value=${this.searchQuery}
                                @input=${this.handleSearchInput}
                                @keydown=${this.handleSearchKeydown}
                            />
                        </div>
                        <button 
                            class="action-button"
                            @click=${this.handleSearch}
                            ?disabled=${this.isLoading || !this.searchQuery.trim()}
                        >
                            ${this.isLoading ? 'Searching...' : 'Search Papers'}
                        </button>
                        <button class="secondary-button" @click=${this.handleUpload}>
                            Upload PDF
                        </button>
                    </div>

                    <div class="content-area">
                        <div class="tab-container">
                            <div 
                                class="tab ${this.currentTab === 'search' ? 'active' : ''}"
                                @click=${() => this.currentTab = 'search'}
                            >
                                Search Results
                            </div>
                            <div 
                                class="tab ${this.currentTab === 'library' ? 'active' : ''}"
                                @click=${() => this.currentTab = 'library'}
                            >
                                My Library
                            </div>
                            <div 
                                class="tab ${this.currentTab === 'zotero' ? 'active' : ''}"
                                @click=${() => this.currentTab = 'zotero'}
                            >
                                Zotero ${this.zoteroConnected ? '✓' : ''}
                            </div>
                            <div 
                                class="tab ${this.currentTab === 'annotations' ? 'active' : ''}"
                                @click=${() => this.currentTab = 'annotations'}
                            >
                                Annotations
                            </div>
                        </div>

                        <div class="tab-content">
                            ${this.renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabContent() {
        switch (this.currentTab) {
            case 'search':
                return this.renderSearchResults();
            case 'library':
                return this.renderLibrary();
            case 'zotero':
                return this.renderZotero();
            case 'annotations':
                return this.renderAnnotations();
            default:
                return html`<div class="empty-state">Select a tab</div>`;
        }
    }

    renderSearchResults() {
        if (this.isLoading) {
            return html`<div class="loading">Searching for papers...</div>`;
        }

        if (this.searchResults.length === 0) {
            return html`
                <div class="empty-state">
                    <h3>No search results</h3>
                    <p>Enter a search query to find research papers</p>
                </div>
            `;
        }

        return html`
            <div class="search-results">
                ${this.searchResults.map(paper => this.renderPaperCard(paper))}
            </div>
        `;
    }

    renderPaperCard(paper) {
        return html`
            <div class="paper-card">
                <h3 class="paper-title">${paper.title}</h3>
                <p class="paper-authors">${paper.authors}</p>
                <div class="paper-meta">
                    ${paper.year ? html`<span>${paper.year}</span>` : ''}
                    ${paper.venue ? html`<span>${paper.venue}</span>` : ''}
                    ${paper.citationCount ? html`<span>${paper.citationCount} citations</span>` : ''}
                    <span class="source-tag">${paper.source}</span>
                </div>
                <p class="paper-abstract">${paper.abstract}</p>
                <div class="paper-actions">
                    <button 
                        class="action-button small-button"
                        @click=${() => this.importPaper(paper)}
                    >
                        Import
                    </button>
                    ${paper.url ? html`
                        <button 
                            class="secondary-button small-button"
                            @click=${() => this.openPaperUrl(paper.url)}
                        >
                            View Online
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderLibrary() {
        const totalItems = this.documents.length + this.papers.length;
        
        return html`
            <div class="upload-zone" @drop=${this.handleDrop} @dragover=${this.handleDragOver} @dragleave=${this.handleDragLeave}>
                <p>Drop PDF files here to upload them to your research library</p>
                <button class="action-button" @click=${this.handleUpload}>
                    Choose Files
                </button>
            </div>
            
            ${totalItems === 0 ? html`
                <div class="empty-state">
                    <h3>No documents yet</h3>
                    <p>Upload PDF files or import papers from search results</p>
                </div>
            ` : html`
                <div class="document-list">
                    ${this.papers.map(paper => this.renderPaperLibraryCard(paper))}
                    ${this.documents.map(doc => this.renderDocumentCard(doc))}
                </div>
            `}
        `;
    }

    renderPaperLibraryCard(paper) {
        const status = this.embeddingStatuses[paper.id] || { status: 'loading' };
        
        // Trigger loading status if we don't have it yet
        if (!this.embeddingStatuses[paper.id]) {
            this.loadSinglePaperStatus(paper.id);
        }
        
        return html`
            <div class="document-item" style="display: block;">
                <div style="cursor: pointer;" @click=${() => this.openPaper(paper)}>
                    <h4 class="document-name">${paper.title}</h4>
                    <p class="document-info" style="margin-bottom: 0.5rem;">
                        ${paper.authors ? paper.authors.substring(0, 60) + '...' : 'Unknown authors'} • 
                        ${paper.year || 'Unknown year'} • 
                        ${paper.venue || 'arXiv'}
                        ${paper.imported_at ? ' • Added ' + this.formatDate(paper.imported_at) : ''}
                    </p>
                    ${this.renderEmbeddingBadge(status)}
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    ${(status.status === 'pending' || status.status === 'failed' || status.status === 'partial' || status.status === 'loading') ? html`
                        <button 
                            class="secondary-button"
                            @click=${(e) => { e.stopPropagation(); this.embedPaper(paper); }}
                            ?disabled=${status.status === 'processing' || status.status === 'loading'}
                            title="Generate embeddings for RAG search"
                        >
                            ${status.status === 'processing' ? '⚙️ Processing...' : '🔄 Embed'}
                        </button>
                    ` : ''}
                    
                    <button 
                        class="secondary-button"
                        @click=${(e) => { e.stopPropagation(); this.handleDeletePaper(paper); }}
                        title="Remove from library"
                    >
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
    }

    renderDocumentCard(document) {
        const status = this.documentEmbeddingStatuses[document.id] || { status: 'loading' };
        
        // Trigger loading status if we don't have it yet
        if (!this.documentEmbeddingStatuses[document.id]) {
            this.loadSingleDocumentStatus(document.id);
        }
        
        return html`
            <div class="document-item" style="display: block;">
                <div style="cursor: pointer;" @click=${() => this.openDocument(document)}>
                    <h4 class="document-name">${document.filename}</h4>
                    <p class="document-info" style="margin-bottom: 0.5rem;">
                        ${document.file_size ? this.formatFileSize(document.file_size) : ''} • 
                        ${this.formatDate(document.uploaded_at)}
                    </p>
                    ${this.renderEmbeddingBadge(status)}
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    ${(status.status === 'pending' || status.status === 'failed' || status.status === 'partial' || status.status === 'loading') ? html`
                        <button 
                            class="secondary-button"
                            @click=${(e) => { e.stopPropagation(); this.embedDocument(document); }}
                            ?disabled=${status.status === 'processing' || status.status === 'loading'}
                            title="Generate embeddings for RAG search"
                        >
                            ${status.status === 'processing' ? '⚙️ Processing...' : '🔄 Embed'}
                        </button>
                    ` : ''}
                    
                    <button 
                        class="secondary-button"
                        @click=${(e) => { e.stopPropagation(); this.handleDeleteDocument(document); }}
                        title="Remove from library"
                    >
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
    }

    renderDocumentList() {
        const totalItems = this.documents.length + this.papers.length;
        
        if (totalItems === 0) {
            return html`
                <div class="empty-state">
                    <p>No documents yet</p>
                </div>
            `;
        }

        return html`
            <div class="document-list">
                ${this.papers.slice(0, 10).map(paper => this.renderSidebarPaperCard(paper))}
                ${this.documents.slice(0, 10).map(doc => html`
                    <div class="document-item" @click=${() => this.selectDocument(doc)}>
                        <h4 class="document-name">${doc.filename}</h4>
                        <p class="document-info">${this.formatDate(doc.uploaded_at)}</p>
                    </div>
                `)}
            </div>
        `;
    }

    renderSidebarPaperCard(paper) {
        const status = this.embeddingStatuses[paper.id] || { status: 'loading' };
        
        // Trigger loading status if we don't have it yet
        if (!this.embeddingStatuses[paper.id]) {
            this.loadSinglePaperStatus(paper.id);
        }
        
        return html`
            <div class="document-item" style="display: block; padding: 0.75rem;">
                <div @click=${() => this.openPaper(paper)} style="cursor: pointer;">
                    <h4 class="document-name" style="margin-bottom: 0.25rem;">${paper.title}</h4>
                    <p class="document-info" style="margin-bottom: 0.25rem; font-size: 0.7rem;">
                        ${paper.year || 'N/A'} • ${paper.venue || 'arXiv'}
                    </p>
                    ${this.renderEmbeddingBadge(status)}
                </div>
                
                <div style="display: flex; gap: 0.25rem; margin-top: 0.5rem;">
                    ${(status.status === 'pending' || status.status === 'failed' || status.status === 'partial' || status.status === 'loading') ? html`
                        <button 
                            class="secondary-button embed-button"
                            @click=${(e) => { e.stopPropagation(); this.embedPaper(paper); }}
                            ?disabled=${status.status === 'processing' || status.status === 'loading'}
                            title="Generate embeddings for RAG search"
                        >
                            ${status.status === 'processing' ? '⚙️ Processing...' : '🔄 Embed'}
                        </button>
                    ` : ''}
                    
                    <button 
                        class="secondary-button embed-button"
                        @click=${(e) => { e.stopPropagation(); this.handleDeletePaper(paper); }}
                        title="Remove from library"
                    >
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
    }

    renderEmbeddingBadge(status) {
        const badges = {
            'pending': { icon: '🟡', text: 'Not Embedded', class: 'status-pending' },
            'processing': { icon: '⚙️', text: 'Generating...', class: 'status-processing' },
            'complete': { icon: '✅', text: 'Ready', class: 'status-complete' },
            'partial': { icon: '🟠', text: 'Partial', class: 'status-partial' },
            'failed': { icon: '❌', text: 'Failed', class: 'status-failed' },
            'no-document': { icon: '⚠️', text: 'No PDF', class: 'status-no-doc' },
            'no-chunks': { icon: '⚠️', text: 'No Text', class: 'status-no-doc' },
            'loading': { icon: '⏳', text: 'Checking...', class: 'status-processing' },
            'error': { icon: '⚠️', text: 'Error', class: 'status-failed' }
        };
        
        const badge = badges[status.status] || { icon: '🟡', text: 'Checking...', class: 'status-pending' };
        
        return html`
            <span class="embedding-badge ${badge.class}">
                ${badge.icon} ${badge.text}
                ${status.progress > 0 && status.progress < 100 ? ` (${Math.round(status.progress)}%)` : ''}
            </span>
        `;
    }

    renderAnnotations() {
        return html`
            <div class="empty-state">
                <h3>Annotations</h3>
                <p>Your highlights and notes will appear here</p>
            </div>
        `;
    }

    // Event handlers
    handleSearchInput(e) {
        this.searchQuery = e.target.value;
    }

    handleSearchKeydown(e) {
        if (e.key === 'Enter' && this.searchQuery.trim()) {
            this.handleSearch();
        }
    }

    async handleSearch() {
        if (!this.searchQuery.trim() || this.isLoading) return;

        this.isLoading = true;
        this.currentTab = 'search';
        
        try {
            // Dispatch event to main app to handle research API
            this.dispatchEvent(new CustomEvent('search-papers', {
                detail: { query: this.searchQuery },
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async importPaper(paper) {
        try {
            this.dispatchEvent(new CustomEvent('import-paper', {
                detail: { paper },
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('Import failed:', error);
        }
    }

    openPaperUrl(url) {
        window.open(url, '_blank');
    }

    handleUpload() {
        this.dispatchEvent(new CustomEvent('upload-document', {
            bubbles: true,
            composed: true
        }));
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.dispatchEvent(new CustomEvent('files-dropped', {
                detail: { files },
                bubbles: true,
                composed: true
            }));
        }
        
        e.target.classList.remove('dragover');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.target.classList.remove('dragover');
    }

    async loadDocuments() {
        try {
            this.dispatchEvent(new CustomEvent('load-documents', {
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    }

    async loadEmbeddingStatuses() {
        if (!window.api?.research) return;
        
        for (const paper of this.papers) {
            try {
                const status = await window.api.research.getPaperEmbeddingStatus(paper.id);
                this.embeddingStatuses[paper.id] = status;
            } catch (error) {
                console.error('Failed to load embedding status:', error);
                this.embeddingStatuses[paper.id] = { status: 'error' };
            }
        }
        this.requestUpdate();
    }

    async loadSinglePaperStatus(paperId) {
        if (!window.api?.research) return;
        
        try {
            const status = await window.api.research.getPaperEmbeddingStatus(paperId);
            this.embeddingStatuses[paperId] = status;
            this.requestUpdate();
        } catch (error) {
            console.error('Failed to load embedding status:', error);
            this.embeddingStatuses[paperId] = { status: 'error' };
            this.requestUpdate();
        }
    }

    handleDeletePaper(paper) {
        // Dispatch event that parent will handle
        this.dispatchEvent(new CustomEvent('delete-paper', {
            detail: { paper },
            bubbles: true,
            composed: true
        }));
    }

    handleDeleteDocument(document) {
        // Dispatch event that parent will handle
        this.dispatchEvent(new CustomEvent('delete-document', {
            detail: { document },
            bubbles: true,
            composed: true
        }));
    }

    async loadSingleDocumentStatus(documentId) {
        if (!window.api?.documents) return;
        
        try {
            const status = await window.api.documents.getDocumentEmbeddingStatus(documentId);
            this.documentEmbeddingStatuses[documentId] = status;
            this.requestUpdate();
        } catch (error) {
            console.error('Failed to load document embedding status:', error);
            this.documentEmbeddingStatuses[documentId] = { status: 'error' };
            this.requestUpdate();
        }
    }

    async embedDocument(document) {
        if (!window.api?.documents) return;
        
        try {
            this.documentEmbeddingStatuses[document.id] = { status: 'processing', progress: 0 };
            this.requestUpdate();
            
            await window.api.documents.generateEmbeddingsForDocument(document.id);
            
            // Reload status
            await this.loadSingleDocumentStatus(document.id);
        } catch (error) {
            console.error('Failed to embed document:', error);
            this.documentEmbeddingStatuses[document.id] = { status: 'failed' };
            this.requestUpdate();
        }
    }

    handleDeleteDocument(document) {
        // Dispatch event that parent will handle
        this.dispatchEvent(new CustomEvent('delete-document', {
            detail: { document },
            bubbles: true,
            composed: true
        }));
    }

    async loadSingleDocumentStatus(documentId) {
        if (!window.api?.documents) return;
        
        try {
            const status = await window.api.documents.getDocumentEmbeddingStatus(documentId);
            this.documentEmbeddingStatuses[documentId] = status;
            this.requestUpdate();
        } catch (error) {
            console.error('Failed to load document embedding status:', error);
            this.documentEmbeddingStatuses[documentId] = { status: 'error' };
            this.requestUpdate();
        }
    }

    async embedDocument(document) {
        if (!window.api?.documents) return;
        
        try {
            this.documentEmbeddingStatuses[document.id] = { status: 'processing', progress: 0 };
            this.requestUpdate();
            
            await window.api.documents.generateEmbeddingsForDocument(document.id);
            
            // Reload status
            await this.loadSingleDocumentStatus(document.id);
        } catch (error) {
            console.error('Failed to embed document:', error);
            this.documentEmbeddingStatuses[document.id] = { status: 'failed' };
            this.requestUpdate();
        }
    }

    async embedPaper(paper) {
        try {
            this.embeddingStatuses[paper.id] = { status: 'processing' };
            this.requestUpdate();
            
            const result = await window.api.research.generatePaperEmbeddings(paper.id);
            
            if (result.success) {
                this.embeddingStatuses[paper.id] = { 
                    status: 'complete',
                    totalChunks: result.processed,
                    embeddedChunks: result.processed,
                    progress: 100
                };
            } else {
                this.embeddingStatuses[paper.id] = { 
                    status: 'failed', 
                    error: result.error 
                };
            }
            
            this.requestUpdate();
        } catch (error) {
            console.error('Embedding generation failed:', error);
            this.embeddingStatuses[paper.id] = { status: 'failed', error: error.message };
            this.requestUpdate();
        }
    }

    async embedAllPapers() {
        try {
            const result = await window.api.research.generateAllPendingEmbeddings();
            // Refresh statuses after batch operation
            await this.loadEmbeddingStatuses();
        } catch (error) {
            console.error('Batch embedding failed:', error);
        }
    }

    selectDocument(document) {
        this.selectedDocument = document;
        this.dispatchEvent(new CustomEvent('document-selected', {
            detail: { document },
            bubbles: true,
            composed: true
        }));
    }

    openDocument(document) {
        this.dispatchEvent(new CustomEvent('open-document', {
            detail: { document },
            bubbles: true,
            composed: true
        }));
    }

    // Public methods for updating from parent
    updateSearchResults(results) {
        this.searchResults = results;
        this.requestUpdate();
    }

    updateDocuments(documents) {
        this.documents = documents;
        this.requestUpdate();
    }

    updatePapers(papers) {
        this.papers = papers;
        this.requestUpdate();
        // Load embedding statuses for all papers
        this.loadEmbeddingStatuses();
    }

    async deletePaper(paper) {
        try {
            this.dispatchEvent(new CustomEvent('delete-paper', {
                detail: { paper },
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('Delete failed:', error);
        }
    }

    openPaper(paper) {
        // If paper has a file_path, open it, otherwise open the URL
        if (paper.file_path) {
            this.dispatchEvent(new CustomEvent('open-paper-file', {
                detail: { paper },
                bubbles: true,
                composed: true
            }));
        } else if (paper.url) {
            this.openPaperUrl(paper.url);
        }
    }

    // Utility methods
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(timestamp) {
        return new Date(timestamp * 1000).toLocaleDateString();
    }

    // Zotero Integration Methods
    async loadZoteroCredentials() {
        try {
            const credentials = await window.api.zotero.getCredentials();
            if (credentials) {
                this.zoteroConnected = true;
                this.zoteroUserId = credentials.zotero_user_id;
                this.zoteroLibraryType = credentials.library_type || 'user';
                this.zoteroApiKey = '••••••••'; // Hide the actual API key
                await this.loadZoteroSyncStatus();
            }
        } catch (error) {
            console.error('Failed to load Zotero credentials:', error);
        }
    }

    async loadZoteroSyncStatus() {
        try {
            this.zoteroSyncStatus = await window.api.zotero.getSyncStatus();
        } catch (error) {
            console.error('Failed to load sync status:', error);
        }
    }

    async handleZoteroTestConnection() {
        // Debug: Check what's in the input field DOM element
        const userIdInput = this.shadowRoot.querySelector('#zotero-user-id');
        const userIdFromDOM = userIdInput ? userIdInput.value : 'not found';
        
        console.log('[ResearchView] === ZOTERO CONNECTION TEST DEBUG ===');
        console.log('[ResearchView] Component properties:', {
            apiKey: this.zoteroApiKey ? `${this.zoteroApiKey.substring(0, 8)}...` : 'none',
            userId: this.zoteroUserId,
            libraryType: this.zoteroLibraryType
        });
        console.log('[ResearchView] DOM input field value:', userIdFromDOM);
        console.log('[ResearchView] About to call testConnection with:', {
            param1_apiKey: this.zoteroApiKey ? `${this.zoteroApiKey.substring(0, 8)}...` : 'none',
            param2_userId: this.zoteroUserId,
            param3_libraryType: this.zoteroLibraryType
        });
        
        if (!this.zoteroApiKey || !this.zoteroUserId || this.zoteroApiKey === '••••••••') {
            this.showZoteroStatus('Please enter your API key and User ID', 'error');
            return;
        }

        this.isLoading = true;
        this.zoteroStatusMessage = '';

        try {
            const result = await window.api.zotero.testConnection(
                this.zoteroApiKey,
                this.zoteroUserId,
                this.zoteroLibraryType
            );

            if (result.success) {
                this.showZoteroStatus('Successfully connected to Zotero!', 'success');
            } else {
                this.showZoteroStatus(result.message || 'Connection failed', 'error');
            }
        } catch (error) {
            console.error('[ResearchView] Test connection error:', error);
            this.showZoteroStatus('Failed to connect to Zotero. Please check your credentials.', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async handleZoteroConnect() {
        if (!this.zoteroApiKey || !this.zoteroUserId || this.zoteroApiKey === '••••••••') {
            this.showZoteroStatus('Please enter your API key and User ID', 'error');
            return;
        }

        this.isLoading = true;
        this.zoteroStatusMessage = '';

        try {
            // First test the connection
            const testResult = await window.api.zotero.testConnection(
                this.zoteroApiKey,
                this.zoteroUserId,
                this.zoteroLibraryType
            );

            if (!testResult.success) {
                this.showZoteroStatus(testResult.message || 'Connection failed', 'error');
                this.isLoading = false;
                return;
            }

            // Save credentials
            await window.api.zotero.saveCredentials(
                this.zoteroApiKey,
                this.zoteroUserId,
                this.zoteroLibraryType
            );

            this.zoteroConnected = true;
            this.showZoteroStatus('Zotero account connected successfully!', 'success');
            await this.loadZoteroSyncStatus();
            
        } catch (error) {
            this.showZoteroStatus('Failed to save Zotero credentials', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async handleZoteroDisconnect() {
        if (!confirm('Are you sure you want to disconnect your Zotero account? Your synced papers will remain in RANI.')) {
            return;
        }

        try {
            await window.api.zotero.deleteCredentials();
            this.zoteroConnected = false;
            this.zoteroApiKey = '';
            this.zoteroUserId = '';
            this.zoteroSyncStatus = null;
            this.showZoteroStatus('Zotero account disconnected', 'info');
        } catch (error) {
            this.showZoteroStatus('Failed to disconnect Zotero account', 'error');
        }
    }

    async handleZoteroSync() {
        this.zoteroSyncing = true;
        this.zoteroStatusMessage = '';

        try {
            this.showZoteroStatus('Syncing with Zotero...', 'info');
            
            const result = await window.api.zotero.syncLibrary({
                includeAttachments: true,
                includeNotes: true,
                forceFullSync: false
            });

            if (result.success) {
                this.showZoteroStatus(
                    `Sync complete! Imported: ${result.imported}, Updated: ${result.updated}, Failed: ${result.failed}`,
                    'success'
                );
                await this.loadZoteroSyncStatus();
                await this.loadDocuments(); // Refresh library
            }
        } catch (error) {
            this.showZoteroStatus('Sync failed: ' + error.message, 'error');
        } finally {
            this.zoteroSyncing = false;
        }
    }

    async handleZoteroFullSync() {
        if (!confirm('This will perform a complete re-sync of your entire Zotero library. This may take some time. Continue?')) {
            return;
        }

        this.zoteroSyncing = true;
        this.zoteroStatusMessage = '';

        try {
            this.showZoteroStatus('Performing full sync with Zotero...', 'info');
            
            const result = await window.api.zotero.syncLibrary({
                includeAttachments: true,
                includeNotes: true,
                forceFullSync: true
            });

            if (result.success) {
                this.showZoteroStatus(
                    `Full sync complete! Imported: ${result.imported}, Updated: ${result.updated}`,
                    'success'
                );
                await this.loadZoteroSyncStatus();
                await this.loadDocuments();
            }
        } catch (error) {
            this.showZoteroStatus('Full sync failed: ' + error.message, 'error');
        } finally {
            this.zoteroSyncing = false;
        }
    }

    async handleZoteroDeleteSynced() {
        if (!confirm('This will delete all papers imported from Zotero. Are you sure? This cannot be undone.')) {
            return;
        }

        try {
            const count = await window.api.zotero.deleteAllSyncedItems();
            this.showZoteroStatus(`Deleted ${count} Zotero papers from RANI`, 'success');
            await this.loadZoteroSyncStatus();
            await this.loadDocuments();
        } catch (error) {
            this.showZoteroStatus('Failed to delete synced items: ' + error.message, 'error');
        }
    }

    showZoteroStatus(message, type) {
        this.zoteroStatusMessage = message;
        this.zoteroStatusType = type;
        this.requestUpdate();
    }

    formatZoteroDate(timestamp) {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    }

    renderZotero() {
        return html`
            <div class="zotero-container">
                <div class="zotero-header">
                    <h3>Zotero Integration</h3>
                    <p class="zotero-description">
                        Connect your Zotero account to import your research library, papers, notes, and PDFs.
                        ${this.zoteroConnected ? html`<span class="connected-badge">✓ Connected</span>` : ''}
                    </p>
                </div>

                ${this.zoteroStatusMessage ? html`
                    <div class="status-message ${this.zoteroStatusType}">
                        ${this.zoteroStatusMessage}
                    </div>
                ` : ''}

                ${!this.zoteroConnected ? html`
                    <div class="zotero-setup">
                        <div class="form-group">
                            <label for="zotero-api-key">Zotero API Key</label>
                            <input
                                id="zotero-api-key"
                                type="password"
                                class="text-input"
                                placeholder="Enter your Zotero API key"
                                .value=${this.zoteroApiKey}
                                @input=${(e) => this.zoteroApiKey = e.target.value}
                            />
                            <div class="help-text">
                                Get your API key from 
                                <a href="https://www.zotero.org/settings/keys" target="_blank" class="link">
                                    Zotero Settings → API Keys
                                </a>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="zotero-user-id">User ID</label>
                            <input
                                id="zotero-user-id"
                                type="text"
                                class="text-input"
                                placeholder="Enter your Zotero User ID"
                                .value=${this.zoteroUserId}
                                @input=${(e) => this.zoteroUserId = e.target.value}
                            />
                            <div class="help-text">
                                Find your User ID on your Zotero profile or in
                                <a href="https://www.zotero.org/settings/keys" target="_blank" class="link">
                                    API Keys settings
                                </a>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="zotero-library-type">Library Type</label>
                            <select
                                id="zotero-library-type"
                                class="text-input"
                                .value=${this.zoteroLibraryType}
                                @change=${(e) => this.zoteroLibraryType = e.target.value}
                            >
                                <option value="user">Personal Library</option>
                                <option value="group">Group Library</option>
                            </select>
                            <div class="help-text">
                                Select "Personal Library" for your own collection
                            </div>
                        </div>

                        <div class="button-group">
                            <button
                                class="secondary-button"
                                @click=${this.handleZoteroTestConnection}
                                ?disabled=${this.isLoading}
                            >
                                ${this.isLoading ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button
                                class="action-button"
                                @click=${this.handleZoteroConnect}
                                ?disabled=${this.isLoading}
                            >
                                ${this.isLoading ? 'Connecting...' : 'Connect Zotero'}
                            </button>
                        </div>
                    </div>
                ` : html`
                    <div class="zotero-connected">
                        <div class="sync-stats">
                            <div class="stat-item">
                                <div class="stat-label">Last Sync</div>
                                <div class="stat-value">
                                    ${this.formatZoteroDate(this.zoteroSyncStatus?.lastSync)}
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Synced Items</div>
                                <div class="stat-value">
                                    ${this.zoteroSyncStatus?.syncedItems || 0}
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Library Type</div>
                                <div class="stat-value">
                                    ${this.zoteroLibraryType === 'user' ? 'Personal' : 'Group'}
                                </div>
                            </div>
                        </div>

                        <div class="button-group">
                            <button
                                class="action-button"
                                @click=${this.handleZoteroSync}
                                ?disabled=${this.zoteroSyncing}
                            >
                                ${this.zoteroSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <button
                                class="secondary-button"
                                @click=${this.handleZoteroFullSync}
                                ?disabled=${this.zoteroSyncing}
                            >
                                Full Re-sync
                            </button>
                            <button
                                class="secondary-button danger"
                                @click=${this.handleZoteroDeleteSynced}
                                ?disabled=${this.zoteroSyncing}
                            >
                                Delete Synced Items
                            </button>
                            <button
                                class="secondary-button"
                                @click=${this.handleZoteroDisconnect}
                                ?disabled=${this.zoteroSyncing}
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                `}

                <div class="zotero-help">
                    <h4>How It Works</h4>
                    <ol>
                        <li><strong>Get API Key:</strong> Visit Zotero Settings and create a new API key with read access.</li>
                        <li><strong>Find User ID:</strong> Your User ID is shown on the API Keys page or in your profile URL.</li>
                        <li><strong>Connect:</strong> Enter your credentials and click "Connect Zotero".</li>
                        <li><strong>Sync:</strong> Click "Sync Now" to import your papers, PDFs, and notes.</li>
                        <li><strong>Access:</strong> All Zotero papers appear in "My Library" tab.</li>
                    </ol>
                </div>
            </div>
        `;
    }
}

customElements.define('research-view', ResearchView);
