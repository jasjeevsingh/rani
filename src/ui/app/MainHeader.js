
import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';


export class MainHeader extends LitElement {
    static properties = {
        sidebarOpen: { type: Boolean, state: true },
        chatMessages: { type: Array, state: true },
        chatInput: { type: String, state: true },
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
                    overflow: auto;
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
            #chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 24px 16px 8px 16px;
                color: #fff;
                font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                font-size: 1.05em;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .chat-message {
                background: rgba(20,20,30,0.7);
                border-radius: 12px;
                padding: 10px 14px;
                max-width: 85%;
                word-break: break-word;
            }
            .chat-message.user {
                align-self: flex-end;
                background: linear-gradient(90deg, #6a5acd 60%, #483d8b 100%);
            }
            .chat-message.assistant {
                align-self: flex-start;
                background: linear-gradient(90deg, #23243a 60%, #1a1b2a 100%);
            }
            #chat-input-bar {
                display: flex;
                padding: 12px 16px 16px 16px;
                background: none;
                border-top: 1px solid rgba(255,255,255,0.08);
                gap: 8px;
            }
            #chat-input {
                flex: 1;
                border-radius: 8px;
                border: none;
                padding: 10px 12px;
                font-size: 1em;
                background: rgba(255,255,255,0.12);
                color: #fff;
                outline: none;
            }
            #send-btn {
                border-radius: 8px;
                border: none;
                opacity: 0.7;
                background: #6a5acd;
                color: #fff;
                font-size: 1.1em;
                padding: 0 18px;
                cursor: pointer;
                transition: background 0.2s;
            }
            #send-btn:hover {
                background: #483d8b;
            }
        `;

    constructor() {
        super();
        this.sidebarOpen = false;
        this.chatMessages = [];
        this.chatInput = '';
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
                            console.log('[MainHeader] Resizing window for closed sidebar:', { width: 81, height: 90 });
                            window.api.headerController.resizeHeaderWindow({ width: 81, height: 90 });
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

    handleInput(e) {
        this.chatInput = e.target.value;
    }

    handleSend(e) {
        e.preventDefault();
        const message = this.chatInput.trim();
        if (!message) return;
        this.chatMessages = [...this.chatMessages, { role: 'user', text: message }];
        this.chatInput = '';
        if (window.api && window.api.mainHeader && window.api.mainHeader.sendMessage) {
            window.api.mainHeader.sendMessage(message);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.api && window.api.mainHeader && window.api.mainHeader.onMessage) {
            window.api.mainHeader.onMessage((event, msg) => {
                this.chatMessages = [...this.chatMessages, { role: 'assistant', text: msg }];
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
                        <span id="sidebar-title">Rani</span>
                        <button id="settings-btn" title="Settings" @click="${this._openSettings}">
                            <svg viewBox="0 0 4 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.0013 0.664062C1.82449 0.664062 1.65492 0.7343 1.5299 0.859325C1.40487 0.984349 1.33464 1.15392 1.33464 1.33073C1.33464 1.50754 1.40487 1.67711 1.5299 1.80213C1.65492 1.92716 1.82449 1.9974 2.0013 1.9974C2.17811 1.9974 2.34768 1.92716 2.47271 1.80213C2.59773 1.67711 2.66797 1.50754 2.66797 1.33073C2.66797 1.15392 2.59773 0.984349 2.47271 0.859325C2.34768 0.734301 2.17811 0.664062 2.0013 0.664062ZM2.0013 5.33073C1.82449 5.33073 1.65492 5.40097 1.5299 5.52599C1.40487 5.65102 1.33464 5.82058 1.33464 5.9974C1.33464 6.17421 1.40487 6.34378 1.5299 6.4688C1.65492 6.59382 1.82449 6.66406 2.0013 6.66406C2.17811 6.66406 2.34768 6.59382 2.47271 6.4688C2.59773 6.34378 2.66797 6.17421 2.66797 5.9974C2.66797 5.82058 2.59773 5.65102 2.47271 5.52599C2.34768 5.40097 2.17811 5.33073 2.0013 5.33073ZM2.0013 9.9974C1.82449 9.9974 1.65492 10.0676 1.5299 10.1927C1.40487 10.3177 1.33464 10.4873 1.33464 10.6641C1.33464 10.8409 1.40487 11.0104 1.5299 11.1355C1.65492 11.2605 1.82449 11.3307 2.0013 11.3307C2.17811 11.3307 2.34768 11.2605 2.47271 11.1355C2.59773 11.0104 2.66797 10.8409 2.66797 10.6641C2.66797 10.4873 2.59773 10.3177 2.47271 10.1927C2.34768 10.0676 2.17811 9.9974 2.0013 9.9974Z" fill="white" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div id="chat-messages">
                        ${this.chatMessages.map(msg => html`
                            <div class="chat-message ${msg.role}">${msg.text}</div>
                        `)}
                    </div>
                    <form id="chat-input-bar" @submit="${this.handleSend}">
                        <input id="chat-input" type="text" .value="${this.chatInput}" @input="${this.handleInput}" placeholder="Type a message..." autocomplete="off" />
                        <button id="send-btn" type="submit">Send</button>
                    </form>
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


    

}

customElements.define('main-header', MainHeader);
