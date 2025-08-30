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
        :host {
            display: flex;
            height: 100vh;
            background: var(--main-content-background, rgba(0, 0, 0, 0.8));
            color: var(--text-color, #e5e5e7);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border-radius: 8px;
            overflow: hidden;
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
            overflow-y: auto;
            padding: 1rem;
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
            gap: 0.5rem;
            padding: 1rem;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
        }

        .search-container {
            flex: 1;
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
        }

        .secondary-button:hover {
            background: var(--hover-background, rgba(255, 255, 255, 0.1));
            color: var(--text-color, #e5e5e7);
        }

        .content-area {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
        }

        .tab-container {
            display: flex;
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            margin-bottom: 1rem;
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
        }

        .document-item {
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
        }
    `;

    static properties = {
        currentTab: { type: String },
        searchQuery: { type: String },
        searchResults: { type: Array },
        documents: { type: Array },
        isLoading: { type: Boolean },
        selectedDocument: { type: Object }
    };

    constructor() {
        super();
        this.currentTab = 'search';
        this.searchQuery = '';
        this.searchResults = [];
        this.documents = [];
        this.isLoading = false;
        this.selectedDocument = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadDocuments();
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
                                placeholder="Search research papers..."
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
                                class="tab ${this.currentTab === 'annotations' ? 'active' : ''}"
                                @click=${() => this.currentTab = 'annotations'}
                            >
                                Annotations
                            </div>
                        </div>

                        ${this.renderTabContent()}
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
        return html`
            <div class="upload-zone" @drop=${this.handleDrop} @dragover=${this.handleDragOver} @dragleave=${this.handleDragLeave}>
                <p>Drop PDF files here to upload them to your research library</p>
                <button class="action-button" @click=${this.handleUpload}>
                    Choose Files
                </button>
            </div>
            
            ${this.documents.length === 0 ? html`
                <div class="empty-state">
                    <h3>No documents yet</h3>
                    <p>Upload PDF files or import papers from search results</p>
                </div>
            ` : html`
                <div class="document-list">
                    ${this.documents.map(doc => this.renderDocumentCard(doc))}
                </div>
            `}
        `;
    }

    renderDocumentCard(document) {
        return html`
            <div class="document-item" @click=${() => this.openDocument(document)}>
                <h4 class="document-name">${document.filename}</h4>
                <p class="document-info">
                    ${document.file_size ? this.formatFileSize(document.file_size) : ''} • 
                    ${this.formatDate(document.uploaded_at)}
                </p>
            </div>
        `;
    }

    renderDocumentList() {
        if (this.documents.length === 0) {
            return html`
                <div class="empty-state">
                    <p>No documents yet</p>
                </div>
            `;
        }

        return html`
            <div class="document-list">
                ${this.documents.slice(0, 10).map(doc => html`
                    <div class="document-item" @click=${() => this.selectDocument(doc)}>
                        <h4 class="document-name">${doc.filename}</h4>
                        <p class="document-info">${this.formatDate(doc.uploaded_at)}</p>
                    </div>
                `)}
            </div>
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
}

customElements.define('research-view', ResearchView);
