
import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import '../ask/AskView.js';


export class MainHeader extends LitElement {
    static properties = {
        sidebarOpen: { type: Boolean, state: true },
        listenButtonState: { type: String, state: true },
        isListenActive: { type: Boolean, state: true },
        isResearchActive: { type: Boolean, state: true }
    };

    static styles = css`
            #sidebar-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 54px;
                padding: 0 18px;
                background: rgba(20, 20, 30, 0.82);
                border-bottom: 1px solid rgba(255,255,255,0.08);
                position: sticky;
                top: 0;
                z-index: 2;
            }
            .header-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #listen-btn {
                background: transparent;
                border: 1.5px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 0;
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            #listen-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.5);
            }
            #listen-btn.active {
                background: rgba(239, 68, 68, 0.2);
                border-color: rgba(239, 68, 68, 0.6);
                animation: listen-pulse 2s infinite;
            }
            #listen-btn.active:hover {
                background: rgba(239, 68, 68, 0.3);
            }
            @keyframes listen-pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
                }
                70% {
                    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                }
            }
            #listen-btn svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
                color: white;
                position: relative;
                z-index: 2;
            }
            #listen-btn.active svg {
                color: rgb(239, 68, 68);
            }
            .listen-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(239, 68, 68, 0.3);
                transform: translate(-50%, -50%) scale(0);
                transition: transform 0.2s ease-out;
                z-index: 1;
            }
            #listen-btn.active .listen-indicator {
                animation: listen-indicator-pulse 2s infinite;
            }
            @keyframes listen-indicator-pulse {
                0%, 100% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0.5;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 0;
                }
            }

            /* Research Button */
            #research-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 1.5px solid rgba(255, 255, 255, 0.3);
                background: transparent;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                padding: 0;
                position: relative;
                overflow: hidden;
            }

            #research-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.5);
            }

            #research-btn svg {
                width: 20px;
                height: 20px;
                fill: white;
                transition: all 0.2s ease;
                position: relative;
                z-index: 2;
            }

            #research-btn:hover svg {
                fill: #ffffff;
            }

            #research-btn.active {
                background: rgba(0, 122, 255, 0.2);
                border-color: rgba(0, 122, 255, 0.6);
                animation: research-pulse 2s infinite;
            }

            #research-btn.active:hover {
                background: rgba(0, 122, 255, 0.3);
            }

            #research-btn.active svg {
                fill: #007aff;
            }

            @keyframes research-pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4);
                }
                70% {
                    box-shadow: 0 0 0 10px rgba(0, 122, 255, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(0, 122, 255, 0);
                }
            }

            .research-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(0, 122, 255, 0.3);
                transform: translate(-50%, -50%) scale(0);
                transition: transform 0.2s ease-out;
                z-index: 1;
            }

            #research-btn.active .research-indicator {
                animation: research-indicator-pulse 2s infinite;
            }

            @keyframes research-indicator-pulse {
                0%, 100% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0.5;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 0;
                }
            }

            #sidebar-title {
                font-size: 1.18em;
                font-weight: 600;
                color: #fff;
                letter-spacing: 0.02em;
                font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
            }
            #settings-btn {
                background: none;
                border: none;
                padding: 6px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                transition: background 0.15s;
            }
            #settings-btn:hover {
                background: rgba(120,120,140,0.18);
            }
            #settings-btn svg {
                width: 22px;
                height: 22px;
                display: block;
            }
            html, body {
                margin: 0;
                padding: 0;
                width: 100vw;
                height: 100vh;
                overflow: hidden;
                background: transparent !important;
            }
            #expand-btn {
                position: fixed;
                right: 0;
                top: 50%;
                transform: translateY(-50%);
                z-index: 2001;
                width: 48px;
                height: 48px;
                border-radius: 24px;
                background: rgba(30,30,40,0.85);
                border: 2.5px solid #a259ff;
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                font-size: 2em;
                cursor: pointer;
                box-shadow: 0 2px 16px 0 #a259ff80, 0 2px 8px rgba(0,0,0,0.2);
                transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
                animation: pulse-purple 1.2s infinite alternate;
            }
            #expand-btn.open {
                border-color: #6a5acd;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                /* Keep animation for pulsating effect */
                animation: pulse-purple 1.2s infinite alternate;
            }
            #expand-btn:hover {
                background: rgba(60,60,80,0.95);
                border-color: #fff;
            }
            @keyframes pulse-purple {
                0% {
                    box-shadow: 0 0 0 0 #a259ff80, 0 2px 8px rgba(0,0,0,0.2);
                }
                100% {
                    box-shadow: 0 0 16px 6px #a259ffcc, 0 2px 8px rgba(0,0,0,0.2);
                }
            }
            #sidebar {
                position: fixed;
                right: 0;
                top: 0;
                width: 0;
                height: 100vh;
                background: transparent;
                box-shadow: none;
                border-radius: 0 0 0 0;
                display: flex;
                flex-direction: column;
                opacity: 0;
                pointer-events: none;
                transform: translateX(100%);
                transition: opacity 0.3s, box-shadow 0.3s, transform 0.4s cubic-bezier(.7,0,.3,1), width 0.3s cubic-bezier(.7,0,.3,1), border-radius 0.3s cubic-bezier(.7,0,.3,1);
                overflow: hidden;
            }
            #sidebar.open {
                width: 380px !important;
                height: 100vh !important;
                border-radius: 24px 0 0 24px !important;
                opacity: 1;
                pointer-events: auto;
                box-shadow: -2px 0 32px 0 rgba(0,0,0,0.35);
                transform: translateX(0);
                overflow: auto;
                background: linear-gradient(rgba(16,16,32,0.12), rgba(16,16,32,0.12));
            }
                #sidebar {
                    position: fixed;
                    right: 0;
                    top: 0;
                    width: 0;
                    height: 100vh;
                    background: transparent;
                    box-shadow: none;
                    border-radius: 0;
                    display: flex;
                    flex-direction: column;
                    opacity: 0;
                    pointer-events: none;
                    transition: width 0.4s cubic-bezier(.7,0,.3,1), background 0.4s, box-shadow 0.4s, border-radius 0.4s, opacity 0.4s;
                    overflow: hidden;
                }
                #sidebar.open {
                    width: 380px;
                    border-radius: 24px 0 0 24px;
                    background: linear-gradient(rgba(16,16,32,0.12), rgba(16,16,32,0.12));
                    box-shadow: -2px 0 32px 0 rgba(0,0,0,0.35);
                    overflow: hidden;
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateX(0);
                }
                #sidebar-content {
                    opacity: 0;
                    transform: translateX(100%);
                    transition: opacity 0.4s cubic-bezier(.7,0,.3,1), transform 0.4s cubic-bezier(.7,0,.3,1);
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                #sidebar.open #sidebar-content {
                    opacity: 1;
                    transform: translateX(0);
                }
            #sidebar.open::before {
                content: "";
                position: absolute;
                inset: 0;
                background: url('../assets/starrynight.jpg') center center / cover no-repeat;
                opacity: 1;
                pointer-events: none;
                border-radius: inherit;
                z-index: 0;
            }
            #sidebar > * {
                position: relative;
                z-index: 1;
            }
            /* AskView component is embedded here and handles its own styling */
        `;

    constructor() {
        super();
        this.sidebarOpen = false;
        this.listenButtonState = 'Listen';
        this.isListenActive = false;
        this.isResearchActive = false;
        this._handleResize = this._handleResize.bind(this);
        
        // Ensure window starts with transparent background since sidebar starts closed
        console.log('[MainHeader] Constructor - setting initial transparent background');
        if (typeof window !== 'undefined' && window.api && window.api.headerController && window.api.headerController.setSidebarCollapsed) {
            console.log('[MainHeader] Constructor - calling setSidebarCollapsed(false) for initial state');
            window.api.headerController.setSidebarCollapsed(false);
        }
    }

    firstUpdated() {
        window.addEventListener('resize', this._handleResize);
        this._syncSidebarSize();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this._handleResize);
    }

    _handleResize() {
        if (this.sidebarOpen) {
            this._syncSidebarSize();
        }
    }

    _syncSidebarSize() {
        // No-op: CSS now handles width/height for open/closed states
    }

    toggleSidebar() {
        console.log('[MainHeader] toggleSidebar called, current sidebarOpen:', this.sidebarOpen);
        this.sidebarOpen = !this.sidebarOpen;
        console.log('[MainHeader] new sidebarOpen:', this.sidebarOpen);
        this.updateComplete.then(() => {
            this._setArrowDirection(this.sidebarOpen);
            
            // Notify backend about sidebar collapse state
            if (window.api && window.api.headerController && window.api.headerController.setSidebarCollapsed) {
                console.log('[MainHeader] Calling setSidebarCollapsed with:', this.sidebarOpen);
                window.api.headerController.setSidebarCollapsed(this.sidebarOpen);
            } else {
                console.error('[MainHeader] setSidebarCollapsed not available on window.api');
            }
            
            if (this.sidebarOpen) {
                // Opening: resize window immediately to show full animation
                if (window.api && window.api.headerController && window.api.headerController.resizeHeaderWindow) {
                    window.api.getWorkAreaHeight().then(height => {
                        console.log('[MainHeader] Resizing window for open sidebar:', { width: 380, height });
                        window.api.headerController.resizeHeaderWindow({ width: 380, height });
                    });
                }
            }
            // When closing, resize Electron window after animation completes
            if (!this.sidebarOpen) {
                setTimeout(() => {
                    if (window.api && window.api.headerController && window.api.headerController.resizeHeaderWindow) {
                        window.api.getWorkAreaHeight().then(height => {
                            console.log('[MainHeader] Resizing window for closed sidebar:', { width: 81, height: 162 });
                            window.api.headerController.resizeHeaderWindow({ width: 81, height: 162 });
                        });
                    }
                }, 400); // Match CSS transition duration
            }
        });
    }

    _setArrowDirection(open) {
        const expandArrow = this.renderRoot?.getElementById('expand-arrow');
        if (expandArrow) {
            expandArrow.innerHTML = open
                ? '<path d="M9 6L17 14L9 22" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
                : '<path d="M19 6L11 14L19 22" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
        }
    }

    connectedCallback() {
        super.connectedCallback();
        // AskView handles its own message sending and receiving
        
        // Listen for session state changes from backend
        if (window.api && window.api.mainHeader && window.api.mainHeader.onListenChangeSessionResult) {
            window.api.mainHeader.onListenChangeSessionResult((event, data) => {
                console.log('[MainHeader] Listen session state changed:', data);
                if (data.success) {
                    this.listenButtonState = data.state; // 'Listen', 'Stop', 'Done'
                    this.isListenActive = data.state === 'Stop';
                    this.requestUpdate();
                }
            });
        }

        // Research visibility state listener
        if (window.api && window.api.mainHeader && window.api.mainHeader.onResearchVisibilityChanged) {
            window.api.mainHeader.onResearchVisibilityChanged((event, result) => {
                console.log('[MainHeader] Research visibility changed:', result);
                if (result && typeof result.isVisible === 'boolean') {
                    this.isResearchActive = result.isVisible;
                    this.requestUpdate();
                }
            });
        }
    }

    render() {
        const arrowPath = this.sidebarOpen
            ? 'M9 6L17 14L9 22'
            : 'M19 6L11 14L19 22';
        return html`
            <button id="expand-btn" class="${this.sidebarOpen ? 'open' : ''}" @click="${this.toggleSidebar}">
                <svg id="expand-arrow" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="${arrowPath}" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div id="sidebar" class="${this.sidebarOpen ? 'open' : ''}">
                <div id="sidebar-content">
                    <div id="sidebar-header">
                        <span id="sidebar-title">RANI</span>
                        <div class="header-controls">
                            <button 
                                id="listen-btn" 
                                class="${this.isListenActive ? 'active' : ''}" 
                                title="${this.listenButtonState === 'Listen' ? 'Start listening' : this.listenButtonState === 'Stop' ? 'Stop listening' : 'End session'}" 
                                @click="${this._handleListenClick}"
                            >
                                <div class="listen-indicator"></div>
                                ${this.listenButtonState === 'Stop' ? html`
                                    <!-- Stop/Square icon when actively listening -->
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="6" width="12" height="12" rx="2"/>
                                    </svg>
                                ` : this.listenButtonState === 'Done' ? html`
                                    <!-- Checkmark icon when done -->
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                ` : html`
                                    <!-- Microphone icon in default Listen state -->
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                    </svg>
                                `}
                            </button>
                            <button 
                                id="research-btn" 
                                class="${this.isResearchActive ? 'active' : ''}" 
                                title="${this.isResearchActive ? 'Close Research' : 'Open Research'}" 
                                @click="${this._handleResearchClick}"
                            >
                                <div class="research-indicator"></div>
                                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6.5 2A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22H20V2H6.5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                    <line x1="9" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <line x1="9" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <line x1="9" y1="14" x2="13" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                            </button>
                            <button id="settings-btn" title="Settings" @click="${this._openSettings}">
                                <svg viewBox="0 0 4 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.0013 0.664062C1.82449 0.664062 1.65492 0.7343 1.5299 0.859325C1.40487 0.984349 1.33464 1.15392 1.33464 1.33073C1.33464 1.50754 1.40487 1.67711 1.5299 1.80213C1.65492 1.92716 1.82449 1.9974 2.0013 1.9974C2.17811 1.9974 2.34768 1.92716 2.47271 1.80213C2.59773 1.67711 2.66797 1.50754 2.66797 1.33073C2.66797 1.15392 2.59773 0.984349 2.47271 0.859325C2.34768 0.734301 2.17811 0.664062 2.0013 0.664062ZM2.0013 5.33073C1.82449 5.33073 1.65492 5.40097 1.5299 5.52599C1.40487 5.65102 1.33464 5.82058 1.33464 5.9974C1.33464 6.17421 1.40487 6.34378 1.5299 6.4688C1.65492 6.59382 1.82449 6.66406 2.0013 6.66406C2.17811 6.66406 2.34768 6.59382 2.47271 6.4688C2.59773 6.34378 2.66797 6.17421 2.66797 5.9974C2.66797 5.82058 2.59773 5.65102 2.47271 5.52599C2.34768 5.40097 2.17811 5.33073 2.0013 5.33073ZM2.0013 9.9974C1.82449 9.9974 1.65492 10.0676 1.5299 10.1927C1.40487 10.3177 1.33464 10.4873 1.33464 10.6641C1.33464 10.8409 1.40487 11.0104 1.5299 11.1355C1.65492 11.2605 1.82449 11.3307 2.0013 11.3307C2.17811 11.3307 2.34768 11.2605 2.47271 11.1355C2.59773 11.0104 2.66797 10.8409 2.66797 10.6641C2.66797 10.4873 2.59773 10.3177 2.47271 10.1927C2.34768 10.0676 2.17811 9.9974 2.0013 9.9974Z" fill="white" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <!-- Embedded AskView component replaces placeholder chat UI -->
                    <ask-view embedded></ask-view>
                </div>
            </div>
        `;
    }

    _openSettings() {
        if (window.api && window.api.mainHeader && window.api.mainHeader.showSettingsWindow) {
            window.api.mainHeader.showSettingsWindow();
        } else {
            alert('Settings clicked! (Implement settings navigation)');
        }
    }

    async _handleListenClick() {
        console.log('[MainHeader] Listen button clicked, current state:', this.listenButtonState);
        if (window.api && window.api.mainHeader && window.api.mainHeader.sendListenButtonClick) {
            try {
                // Send current state to backend, which will cycle to next state
                const result = await window.api.mainHeader.sendListenButtonClick(this.listenButtonState);
                console.log('[MainHeader] Listen button click result:', result);
                
                // Update state from result
                if (result && result.success && result.state) {
                    this.listenButtonState = result.state;
                    this.isListenActive = result.state === 'Stop';
                    this.requestUpdate();
                }
            } catch (error) {
                console.error('[MainHeader] Error clicking listen button:', error);
            }
        } else {
            console.error('[MainHeader] sendListenButtonClick not available on window.api.mainHeader');
        }
    }

    async _handleResearchClick() {
        console.log('[MainHeader] Research button clicked, current state:', this.isResearchActive);
        if (window.api && window.api.mainHeader && window.api.mainHeader.sendResearchButtonClick) {
            try {
                // Toggle research window visibility
                const result = await window.api.mainHeader.sendResearchButtonClick();
                console.log('[MainHeader] Research button click result:', result);
                
                // Update state from result
                if (result && typeof result.isVisible === 'boolean') {
                    this.isResearchActive = result.isVisible;
                    this.requestUpdate();
                }
            } catch (error) {
                console.error('[MainHeader] Error clicking research button:', error);
            }
        } else {
            console.error('[MainHeader] sendResearchButtonClick not available on window.api.mainHeader');
        }
    }
    

}

customElements.define('main-header', MainHeader);
