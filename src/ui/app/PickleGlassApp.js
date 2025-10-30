import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import './globals.css';
import { SettingsView } from '../settings/SettingsView.js';
import { ListenView } from '../listen/ListenView.js';
import { AskView } from '../ask/AskView.js';
import { ShortcutSettingsView } from '../settings/ShortCutSettingsView.js';
import { ResearchView } from '../research/ResearchView.js';

import '../listen/audioCore/renderer.js';

export class RaniApp extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: var(--text-color);
            background: transparent !important;
            border-radius: 7px;
        }

        .glass-effect {
            background: rgba(255,255,255,0.08) !important;
            backdrop-filter: blur(32px) saturate(250%) brightness(1.15);
            -webkit-backdrop-filter: blur(32px) saturate(250%) brightness(1.15);
            border-radius: 16px;
            box-shadow: 0 8px 48px rgba(0,0,0,0.18);
            border: 2px solid #00ffff;
            transition: backdrop-filter 0.2s, background 0.2s;
        }

        .glass-effect > * {
            background: none !important;
        }

        listen-view {
            display: block;
            width: 100%;
            height: 100%;
        }

        ask-view, settings-view, history-view, help-view, setup-view, research-view {
            display: block;
            width: 100%;
            height: 100%;
        }
    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        currentResponseIndex: { type: Number },
        isMainViewVisible: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        isClickThrough: { type: Boolean, state: true },
        layoutMode: { type: String },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        structuredData: { type: Object }, 
    };

    constructor() {
        super();
        const urlParams = new URLSearchParams(window.location.search);
        this.currentView = urlParams.get('view') || 'research';
        this.currentResponseIndex = -1;
        this.selectedProfile = localStorage.getItem('selectedProfile') || 'interview';
        
        // Language format migration for legacy users
        let lang = localStorage.getItem('selectedLanguage') || 'en';
        if (lang.includes('-')) {
            const newLang = lang.split('-')[0];
            console.warn(`[Migration] Correcting language format from "${lang}" to "${newLang}".`);
            localStorage.setItem('selectedLanguage', newLang);
            lang = newLang;
        }
        this.selectedLanguage = lang;

        this.selectedScreenshotInterval = localStorage.getItem('selectedScreenshotInterval') || '5';
        this.selectedImageQuality = localStorage.getItem('selectedImageQuality') || 'medium';
        this._isClickThrough = false;

    }

    connectedCallback() {
        super.connectedCallback();
        
        if (window.api) {
            window.api.raniApp.onClickThroughToggled((_, isEnabled) => {
                this._isClickThrough = isEnabled;
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.api) {
            window.api.raniApp.removeAllClickThroughListeners();
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('currentView')) {
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        // Only update localStorage when these specific properties change
        if (changedProperties.has('selectedProfile')) {
            localStorage.setItem('selectedProfile', this.selectedProfile);
        }
        if (changedProperties.has('selectedLanguage')) {
            localStorage.setItem('selectedLanguage', this.selectedLanguage);
        }
        if (changedProperties.has('selectedScreenshotInterval')) {
            localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        }
        if (changedProperties.has('selectedImageQuality')) {
            localStorage.setItem('selectedImageQuality', this.selectedImageQuality);
        }
        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
        }
    }

    async handleClose() {
        if (window.api) {
            await window.api.common.quitApplication();
        }
    }

    // Research event handlers
    async handleSearchPapers(e) {
        const { query } = e.detail;
        try {
            // Send search request to main process
            if (window.api && window.api.research) {
                const results = await window.api.research.searchPapers(query);
                const researchView = this.shadowRoot.querySelector('research-view');
                if (researchView) {
                    researchView.updateSearchResults(results);
                }
            } else {
                // Fallback to mock data if API not available
                console.log('[RaniApp] Research API not available, using mock data');
                this.handleSearchPapersStub(e);
            }
        } catch (error) {
            console.error('Paper search failed:', error);
            // Fallback to mock data on error
            this.handleSearchPapersStub(e);
        }
    }

    // Stub method for testing
    async handleSearchPapersStub(e) {
        const { query } = e.detail;
        console.log('[RaniApp] Search papers:', query);
        const mockResults = [
            {
                id: 'test-1',
                title: 'Test Paper: ' + query,
                authors: 'Test Author',
                abstract: 'This is a test paper result for: ' + query,
                year: 2024,
                venue: 'Test Conference',
                url: 'https://example.com',
                citationCount: 10,
                source: 'test'
            }
        ];
        
        const researchView = this.shadowRoot.querySelector('research-view');
        if (researchView) {
            researchView.updateSearchResults(mockResults);
        }
    }

    async handleImportPaper(e) {
        const { paper } = e.detail;
        try {
            if (window.api && window.api.research) {
                await window.api.research.importPaper(paper);
                // Refresh documents list
                this.handleLoadDocuments();
            } else {
                console.log('[RaniApp] Import paper:', e.detail);
            }
        } catch (error) {
            console.error('Paper import failed:', error);
        }
    }

    async handleDeletePaper(e) {
        const { paper } = e.detail;
        try {
            if (window.api && window.api.research) {
                await window.api.research.deletePaper(paper.id);
                // Refresh documents list
                this.handleLoadDocuments();
            } else {
                console.log('[RaniApp] Delete paper:', e.detail);
            }
        } catch (error) {
            console.error('Paper delete failed:', error);
        }
    }

    async handleDeleteDocument(e) {
        const { document } = e.detail;
        try {
            if (window.api && window.api.documents) {
                await window.api.documents.deleteDocument(document.id);
                // Refresh documents list
                this.handleLoadDocuments();
            } else {
                console.log('[RaniApp] Delete document:', e.detail);
            }
        } catch (error) {
            console.error('Document delete failed:', error);
        }
    }

    async handleOpenPaperFile(e) {
        const { paper } = e.detail;
        try {
            if (window.api && window.api.research) {
                await window.api.research.openPaperFile(paper.file_path);
            } else {
                console.log('[RaniApp] Open paper file:', e.detail);
            }
        } catch (error) {
            console.error('Open paper file failed:', error);
        }
    }

    async handleUploadDocument(e) {
        try {
            if (window.api && window.api.documents) {
                await window.api.documents.selectAndUpload();
                // Refresh documents list
                this.handleLoadDocuments();
            } else {
                console.log('[RaniApp] Upload document');
            }
        } catch (error) {
            console.error('Document upload failed:', error);
        }
    }

    async handleFilesDropped(e) {
        const { files } = e.detail;
        try {
            if (window.api && window.api.documents) {
                for (const file of files) {
                    if (file.type === 'application/pdf') {
                        await window.api.documents.uploadFile(file.path);
                    }
                }
                // Refresh documents list
                this.handleLoadDocuments();
            } else {
                console.log('[RaniApp] Files dropped:', e.detail);
            }
        } catch (error) {
            console.error('File drop failed:', error);
        }
    }

    async handleLoadDocuments(e) {
        try {
            if (window.api && window.api.documents) {
                // Load both regular documents and research papers
                const documents = await window.api.documents.getUserDocuments();
                const papers = window.api.research ? await window.api.research.getUserPapers() : [];
                
                const researchView = this.shadowRoot.querySelector('research-view');
                if (researchView) {
                    researchView.updateDocuments(documents);
                    researchView.updatePapers(papers);
                }
            } else {
                // Fallback to mock data
                console.log('[RaniApp] Load documents');
                const mockDocuments = [
                    {
                        id: 'doc-1',
                        filename: 'Test Paper.pdf',
                        uploaded_at: Math.floor(Date.now() / 1000),
                        file_size: 1024000
                    }
                ];
                
                const researchView = this.shadowRoot.querySelector('research-view');
                if (researchView) {
                    researchView.updateDocuments(mockDocuments);
                }
            }
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    }

    handleDocumentSelected(e) {
        const { document } = e.detail;
        console.log('Document selected:', document);
        // Handle document selection (e.g., show in sidebar)
    }

    async handleOpenDocument(e) {
        const { document } = e.detail;
        try {
            if (window.api && window.api.documents) {
                await window.api.documents.openDocument(document.id);
            } else {
                console.log('[RaniApp] Open document:', e.detail);
            }
        } catch (error) {
            console.error('Failed to open document:', error);
        }
    }




    render() {
        const isSimulatedGlass = !(window.api && window.api.isNativeGlassSupported && window.api.isNativeGlassSupported());
        let view;
        switch (this.currentView) {
            case 'research':
                view = html`<research-view
                    @search-papers=${this.handleSearchPapers}
                    @import-paper=${this.handleImportPaper}
                    @delete-paper=${this.handleDeletePaper}
                    @delete-document=${this.handleDeleteDocument}
                    @upload-document=${this.handleUploadDocument}
                    @files-dropped=${this.handleFilesDropped}
                    @load-documents=${this.handleLoadDocuments}
                    @document-selected=${this.handleDocumentSelected}
                    @open-document=${this.handleOpenDocument}
                    @open-paper-file=${this.handleOpenPaperFile}
                ></research-view>`;
                break;
            case 'listen':
                view = html`<listen-view
                    .currentResponseIndex=${this.currentResponseIndex}
                    .selectedProfile=${this.selectedProfile}
                    .structuredData=${this.structuredData}
                    @response-index-changed=${e => (this.currentResponseIndex = e.detail.index)}
                ></listen-view>`;
                break;
            case 'ask':
                view = html`<ask-view></ask-view>`;
                break;
            case 'settings':
                view = html`<settings-view
                    .selectedProfile=${this.selectedProfile}
                    .selectedLanguage=${this.selectedLanguage}
                    .onProfileChange=${profile => (this.selectedProfile = profile)}
                    .onLanguageChange=${lang => (this.selectedLanguage = lang)}
                ></settings-view>`;
                break;
            case 'shortcut-settings':
                view = html`<shortcut-settings-view></shortcut-settings-view>`;
                break;
            case 'history':
                view = html`<history-view></history-view>`;
                break;
            case 'help':
                view = html`<help-view></help-view>`;
                break;
            case 'setup':
                view = html`<setup-view></setup-view>`;
                break;
            default:
                view = html`<div>Unknown view: ${this.currentView}</div>`;
        }
        return html`
            <div class="${isSimulatedGlass ? 'glass-effect' : ''}">
                ${view}
            </div>
        `;
    }
}

customElements.define('rani-app', RaniApp);
