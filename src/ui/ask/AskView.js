import { html, css, LitElement } from '../../ui/assets/lit-core-2.7.4.min.js';
import { parser, parser_write, parser_end, default_renderer } from '../../ui/assets/smd.js';
import './askAudioCaptureVADSafe.js';

export class AskView extends LitElement {
    static properties = {
        currentResponse: { type: String },
        currentQuestion: { type: String },
        isLoading: { type: Boolean },
        copyState: { type: String },
        isHovering: { type: Boolean },
        hoveredLineIndex: { type: Number },
        lineCopyState: { type: Object },
        showTextInput: { type: Boolean },
        headerText: { type: String },
        headerAnimating: { type: Boolean },
        isStreaming: { type: Boolean },
        isListening: { type: Boolean },
        sttTranscription: { type: String },
        voiceActivity: { type: Boolean },
        conversationalResponse: { type: String },
        conversationHistory: { type: Array },
        retrievalResults: { type: Array },
        embedded: { type: Boolean }, // New: Embedded mode flag for sidebar
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s ease-out;
            will-change: transform, opacity;
        }

        /* Embedded mode: Adapt for sidebar (380px width) */
        :host([embedded]) {
            /* Remove standalone window animations and transitions */
        }

        :host([embedded]) .ask-container {
            /* Remove window-specific styling for embedded mode */
            background: transparent;
            border-radius: 0;
            outline: none;
            backdrop-filter: none;
            max-height: none;
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative; /* Establish positioning context */
        }

        :host([embedded]) .ask-container::before {
            /* Remove blur backdrop in embedded mode */
            display: none;
        }

        :host([embedded]) .response-header {
            /* Hide header in embedded mode (sidebar has its own header) */
            display: none;
        }

        :host([embedded]) .close-button {
            /* Hide close button in embedded mode (sidebar manages visibility) */
            display: none;
        }

        :host([embedded]) .conversation-container {
            /* Adjust container for sidebar - fill available space */
            max-height: none;
            flex: 1 1 0; /* Allow shrinking to 0 to respect flex constraints */
            min-height: 0; /* Critical: allow flex container to shrink below content size */
            /* Ensure proper scrolling stays within bounds */
            overflow-y: auto !important; /* Force scrolling */
            overflow-x: hidden;
            padding: 12px 16px;
            position: relative; /* Create stacking context */
        }

        :host([embedded]) .text-input-container {
            /* Simplify input styling for sidebar */
            background: rgba(0, 0, 0, 0.4);
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            flex: 0 0 auto; /* Never shrink, never grow - stay fixed size */
            flex-shrink: 0; /* Explicitly prevent shrinking */
            position: relative;
            z-index: 2; /* Ensure input stays above content */
        }

        :host([embedded]) #textInput {
            /* Adjust input for narrower sidebar width */
            padding: 8px 12px;
        }

        :host([embedded]) .submit-btn {
            /* Adjust button for sidebar */
            padding: 0 12px;
        }

        :host([embedded]) .mic-button {
            /* Adjust mic button size for sidebar */
            width: 36px;
            height: 36px;
        }

        :host([embedded]) .conversation-message {
            /* Adjust message width for sidebar */
            max-width: 100%;
        }

        :host([embedded]) .conversation-message-content {
            /* Better text wrapping in narrower sidebar */
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        /* Disable window resize animations in embedded mode */
        :host([embedded]) .hiding,
        :host([embedded]) .showing,
        :host([embedded]) .hidden {
            animation: none;
            opacity: 1;
            transform: none;
        }

        :host(.hiding) {
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }

        :host(.showing) {
            animation: slideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        :host(.hidden) {
            opacity: 0;
            transform: translateY(-150%) scale(0.85);
            pointer-events: none;
        }

        @keyframes slideUp {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
            }
            30% {
                opacity: 0.7;
                transform: translateY(-20%) scale(0.98);
                filter: blur(0.5px);
            }
            70% {
                opacity: 0.3;
                transform: translateY(-80%) scale(0.92);
                filter: blur(1.5px);
            }
            100% {
                opacity: 0;
                transform: translateY(-150%) scale(0.85);
                filter: blur(2px);
            }
        }

        @keyframes slideDown {
            0% {
                opacity: 0;
                transform: translateY(-150%) scale(0.85);
                filter: blur(2px);
            }
            30% {
                opacity: 0.5;
                transform: translateY(-50%) scale(0.92);
                filter: blur(1px);
            }
            65% {
                opacity: 0.9;
                transform: translateY(-5%) scale(0.99);
                filter: blur(0.2px);
            }
            85% {
                opacity: 0.98;
                transform: translateY(2%) scale(1.005);
                filter: blur(0px);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
            }
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        /* Allow text selection in assistant responses */
        .response-container, .response-container * {
            user-select: text !important;
            cursor: text !important;
        }

        .response-container pre {
            background: rgba(0, 0, 0, 0.4) !important;
            border-radius: 8px !important;
            padding: 12px !important;
            margin: 8px 0 !important;
            overflow-x: auto !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .response-container code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
            font-size: 11px !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .response-container pre code {
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            display: block !important;
        }

        .response-container p code {
            background: rgba(255, 255, 255, 0.1) !important;
            padding: 2px 4px !important;
            border-radius: 3px !important;
            color: #ffd700 !important;
        }

        .hljs-keyword {
            color: #ff79c6 !important;
        }
        .hljs-string {
            color: #f1fa8c !important;
        }
        .hljs-comment {
            color: #6272a4 !important;
        }
        .hljs-number {
            color: #bd93f9 !important;
        }
        .hljs-function {
            color: #50fa7b !important;
        }
        .hljs-variable {
            color: #8be9fd !important;
        }
        .hljs-built_in {
            color: #ffb86c !important;
        }
        .hljs-title {
            color: #50fa7b !important;
        }
        .hljs-attr {
            color: #50fa7b !important;
        }
        .hljs-tag {
            color: #ff79c6 !important;
        }

        .ask-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            outline: 0.5px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(1px);
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            max-height: 700px; /* Ensure container doesn't exceed maximum in standalone mode */
        }

        .ask-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            filter: blur(10px);
            z-index: -1;
        }

        .response-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: transparent;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
        }

        .response-header.hidden {
            display: none;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .response-icon {
            width: 20px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .response-icon svg {
            width: 12px;
            height: 12px;
            stroke: rgba(255, 255, 255, 0.9);
        }

        .response-label {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            white-space: nowrap;
            position: relative;
            overflow: hidden;
        }

        .response-label.animating {
            animation: fadeInOut 0.3s ease-in-out;
        }

        @keyframes fadeInOut {
            0% {
                opacity: 1;
                transform: translateY(0);
            }
            50% {
                opacity: 0;
                transform: translateY(-10px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: flex-end;
        }

        .question-text {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 300px;
            margin-right: 8px;
        }

        .header-controls {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-shrink: 0;
        }

        .copy-button {
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 4px;
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            flex-shrink: 0;
            transition: background-color 0.15s ease;
            position: relative;
            overflow: hidden;
        }

        .copy-button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .copy-button svg {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        }

        .copy-button .check-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .copy-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .check-icon {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }

        .close-button {
            background: rgba(255, 255, 255, 0.07);
            color: white;
            border: none;
            padding: 4px;
            border-radius: 20px;
            outline: 1px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(0.5px);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .close-button:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 1);
        }

        .response-container {
            flex: 1;
            padding: 16px;
            padding-left: 48px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.6;
            background: transparent;
            min-height: 0;
            max-height: 400px;
            position: relative;
        }

        .response-container.hidden {
            display: none;
        }

        .response-container::-webkit-scrollbar {
            width: 6px;
        }

        .response-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .loading-dots {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 40px;
        }

        .loading-dot {
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
        }

        .loading-dot:nth-child(1) {
            animation-delay: 0s;
        }

        .loading-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .loading-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes pulse {
            0%,
            80%,
            100% {
                opacity: 0.3;
                transform: scale(0.8);
            }
            40% {
                opacity: 1;
                transform: scale(1.2);
            }
        }

        .response-line {
            position: relative;
            padding: 2px 0;
            margin: 0;
            transition: background-color 0.15s ease;
        }

        .response-line:hover {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        .line-copy-button {
            position: absolute;
            left: -32px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            padding: 2px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.15s ease, background-color 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .response-line:hover .line-copy-button {
            opacity: 1;
        }

        .line-copy-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .line-copy-button.copied {
            background: rgba(40, 167, 69, 0.3);
        }

        .line-copy-button svg {
            width: 12px;
            height: 12px;
            stroke: rgba(255, 255, 255, 0.9);
        }

        .text-input-container {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.8);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
            transform-origin: bottom;
            flex: 0 0 auto; /* Never grow or shrink the input bar */
            backdrop-filter: blur(10px);
            border-radius: 0 0 12px 12px; /* Match parent container radius */
        }

        /* Enhanced styling when focus lock is active */
        :host(.focus-lock) .text-input-container {
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .text-input-container.hidden {
            opacity: 0;
            transform: scaleY(0);
            padding: 0;
            height: 0;
            overflow: hidden;
            border-top: none;
        }

        .text-input-container.no-response {
            border-top: none;
        }

        #textInput {
            flex: 1;
            padding: 10px 14px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 20px;
            outline: none;
            border: none;
            color: white;
            font-size: 14px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 400;
        }

        #textInput::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        #textInput:focus {
            outline: none;
        }

        .response-line h1,
        .response-line h2,
        .response-line h3,
        .response-line h4,
        .response-line h5,
        .response-line h6 {
            color: rgba(255, 255, 255, 0.95);
            margin: 16px 0 8px 0;
            font-weight: 600;
        }

        .response-line p {
            margin: 8px 0;
            color: rgba(255, 255, 255, 0.9);
        }

        .response-line ul,
        .response-line ol {
            margin: 8px 0;
            padding-left: 20px;
        }

        .response-line li {
            margin: 4px 0;
            color: rgba(255, 255, 255, 0.9);
        }

        .response-line code {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.95);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 13px;
        }

        .response-line pre {
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.95);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 12px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .response-line pre code {
            background: none;
            padding: 0;
        }

        .response-line blockquote {
            border-left: 3px solid rgba(255, 255, 255, 0.3);
            margin: 12px 0;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.8);
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
        }

        .btn-gap {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 4px;
        }

        /* ────────────────[ RANI BYPASS ]─────────────── */
        :host-context(body.has-rani) .ask-container,
        :host-context(body.has-rani) .response-header,
        :host-context(body.has-rani) .response-icon,
        :host-context(body.has-rani) .copy-button,
        :host-context(body.has-rani) .close-button,
        :host-context(body.has-rani) .line-copy-button,
        :host-context(body.has-rani) .text-input-container,
        :host-context(body.has-rani) .response-container pre,
        :host-context(body.has-rani) .response-container p code,
        :host-context(body.has-rani) .response-container pre code {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
        }

        :host-context(body.has-rani) .ask-container::before {
            display: none !important;
        }

        :host-context(body.has-rani) .copy-button:hover,
        :host-context(body.has-rani) .close-button:hover,
        :host-context(body.has-rani) .line-copy-button,
        :host-context(body.has-rani) .line-copy-button:hover,
        :host-context(body.has-rani) .response-line:hover {
            background: transparent !important;
        }

        :host-context(body.has-rani) .response-container::-webkit-scrollbar-track,
        :host-context(body.has-rani) .response-container::-webkit-scrollbar-thumb {
            background: transparent !important;
        }

        .submit-btn, .clear-btn {
            display: flex;
            align-items: center;
            background: transparent;
            color: white;
            border: none;
            border-radius: 6px;
            margin-left: 8px;
            font-size: 13px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            overflow: hidden;
            cursor: pointer;
            transition: background 0.15s;
            height: 32px;
            padding: 0 10px;
            box-shadow: none;
        }
        .submit-btn:hover, .clear-btn:hover {
            background: rgba(255,255,255,0.1);
        }
        .btn-label {
            margin-right: 8px;
            display: flex;
            align-items: center;
            height: 100%;
        }
        .btn-icon {
            background: rgba(255,255,255,0.1);
            border-radius: 13%;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
        }
        .btn-icon img, .btn-icon svg {
            width: 13px;
            height: 13px;
            display: block;
        }
        .header-clear-btn {
            background: transparent;
            border: none;
            display: flex;
            align-items: center;
            gap: 2px;
            cursor: pointer;
            padding: 0 2px;
        }
        .header-clear-btn .icon-box {
            color: white;
            font-size: 12px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 13%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .header-clear-btn:hover .icon-box {
            background-color: rgba(255,255,255,0.18);
        }

        .mic-button {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            margin-right: 8px;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .mic-button:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.5);
        }

        .mic-button.listening {
            background: rgba(220, 38, 38, 0.2);
            border-color: rgba(239, 68, 68, 0.6);
            animation: pulse 2s infinite;
        }

        .mic-button.listening:hover {
            background: rgba(220, 38, 38, 0.3);
        }

        @keyframes pulse {
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

        .mic-button svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
            position: relative;
            z-index: 2;
        }

        .mic-button.listening svg {
            color: rgb(239, 68, 68);
        }

        /* Voice activity indicator */
        .voice-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.3);
            transform: translate(-50%, -50%) scale(0);
            transition: transform 0.1s ease-out;
            z-index: 1;
        }

        .mic-button.listening .voice-indicator.active {
            transform: translate(-50%, -50%) scale(1);
            animation: voiceActivity 0.3s ease-out;
        }

        @keyframes voiceActivity {
            0% {
                transform: translate(-50%, -50%) scale(0.8);
                background: rgba(239, 68, 68, 0.5);
            }
            50% {
                transform: translate(-50%, -50%) scale(1.1);
                background: rgba(239, 68, 68, 0.7);
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                background: rgba(239, 68, 68, 0.3);
            }
        }

        /* Conversation History Styles */
        .conversation-container {
            flex: 1 1 0; /* Grow to fill space, shrink to 0 if needed */
            overflow-y: auto;
            overflow-x: hidden;
            padding: 16px;
            background: transparent;
            min-height: 0; /* Allow flexbox to shrink this */
            /* Removed max-height to let flex handle sizing */
            position: relative;
        }

        .retrieval-context {
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            backdrop-filter: blur(18px);
        }

        .retrieval-context__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 0.5rem;
        }

        .retrieval-context__list {
            display: grid;
            gap: 0.5rem;
        }

        .retrieval-context__item {
            padding: 0.5rem 0.6rem;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .retrieval-context__title {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.82rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.85);
            margin-bottom: 0.35rem;
        }

        .retrieval-context__score {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
        }

        .retrieval-context__body {
            font-size: 0.82rem;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.78);
            display: -webkit-box;
            -webkit-line-clamp: 5;
            -webkit-box-orient: vertical;
            overflow: hidden;
            white-space: pre-wrap;
        }

        .conversation-container::-webkit-scrollbar {
            width: 6px;
        }

        .conversation-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .conversation-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .conversation-message {
            margin-bottom: 20px;
            width: 100%;
        }

        .conversation-message.user {
            color: rgba(255, 255, 255, 0.8);
            font-style: italic;
            margin-bottom: 12px;
            line-height: 1.4;
            text-align: right;
        }

        .conversation-message.assistant {
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.5;
        }

        .conversation-message.current-response {
            /* Current response gets special styling to indicate it's live */
            border-left: 2px solid rgba(0, 122, 255, 0.5);
            padding-left: 12px;
            margin-left: -14px;
        }

        .conversation-message-content {
            font-size: 14px;
        }

        .conversation-message.user .conversation-message-content {
            font-size: 14px;
        }

        .conversation-message.assistant .conversation-message-content {
            /* Use the same styling as the main response content */
        }

        /* Focus Lock: Hide all messages except those marked as focus-visible */
        :host(.focus-lock) .conversation-container .conversation-message {
            display: none !important;
        }

        :host(.focus-lock) .conversation-container .conversation-message.focus-visible {
            display: block !important;
        }

        /* Current response is always visible during streaming */
        :host(.focus-lock) .conversation-container .conversation-message.current-response {
            display: block !important;
        }

        /* KaTeX LaTeX Rendering Styles */
        .katex {
            font-size: 1em !important;
            color: rgba(255, 255, 255, 0.95) !important;
        }

        .katex-display {
            margin: 1em 0 !important;
            text-align: center !important;
        }

        .katex .base {
            color: rgba(255, 255, 255, 0.95) !important;
        }

        .katex .mord, .katex .mrel, .katex .mbin, .katex .mop {
            color: rgba(255, 255, 255, 0.95) !important;
        }

        /* Ensure KaTeX elements work well with the dark theme */
        .katex .mfrac > span > span {
            border-color: rgba(255, 255, 255, 0.3) !important;
        }

        .katex .sqrt > .sqrt-line {
            border-color: rgba(255, 255, 255, 0.7) !important;
        }
    `;

    constructor() {
        super();
        this.currentResponse = '';
        this.currentQuestion = '';
        this.isLoading = false;
        this.copyState = 'idle';
        this.showTextInput = true;
        this.headerText = 'AI Response';
        this.headerAnimating = false;
        this.isStreaming = false;
        this.isListening = false;
        this.sttTranscription = '';
        this.voiceActivity = false;
        this.conversationalResponse = '';
        this.conversationHistory = [];
        this.conversationHistoryLoaded = false; // Flag to prevent duplicate loading
        this.embedded = false; // Default to standalone mode
        this.retrievalResults = [];
        this._prevConversationScrollTop = null;
        this._wasNearBottomBeforeRetrieval = true;

        // TTS chunking state
        this.isChunkedTTSActive = false;

        // Focus lock for latest exchange mode
        this.focusLock = false; // when true, only latest exchange is visible
        this.lastUserMessage = null; // reference to last user message element
        this.lastAssistantMessage = null; // reference to last assistant message element

        this.marked = null;
        this.hljs = null;
        this.DOMPurify = null;
        this.katex = null;
        this.isLibrariesLoaded = false;

        // TTS (Text-to-Speech) for conversational responses
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;

        // SMD.js streaming markdown parser
        this.smdParser = null;
        this.smdContainer = null;
        this.lastProcessedLength = 0;

        this.handleSendText = this.handleSendText.bind(this);
        this.handleTextKeydown = this.handleTextKeydown.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
        this.clearResponseContent = this.clearResponseContent.bind(this);
        this.handleEscKey = this.handleEscKey.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleCloseAskWindow = this.handleCloseAskWindow.bind(this);
        this.handleCloseIfNoContent = this.handleCloseIfNoContent.bind(this);
        this.handleMicClick = this.handleMicClick.bind(this);

        this.loadLibraries();

        // --- Resize helpers ---
        this.isThrottled = false;
    }

    connectedCallback() {
        super.connectedCallback();

        console.log(`🔍 [Debug] connectedCallback - loaded flag: ${this.conversationHistoryLoaded}, history length: ${this.conversationHistory.length}`);
        console.log('📱 AskView connectedCallback - IPC 이벤트 리스너 설정');
        
        // Load conversation history when component mounts (especially in embedded mode)
        if (this.embedded && !this.conversationHistoryLoaded) {
            console.log('[AskView] Embedded mode detected - loading conversation history');
            this.loadConversationHistory();
        }
        
        document.addEventListener('keydown', this.handleEscKey);

        // Skip ResizeObserver in embedded mode (sidebar manages layout)
        if (!this.embedded) {
            this.resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const needed = entry.contentRect.height;
                    const current = window.innerHeight;

                    if (needed > current - 4) {
                        this.requestWindowResize(Math.ceil(needed));
                    }
                }
            });

            const container = this.shadowRoot?.querySelector('.ask-container');
            if (container) this.resizeObserver.observe(container);
        }

        this.handleQuestionFromAssistant = (event, question) => {
            console.log('AskView: Received question from ListenView:', question);
            this.handleSendText(null, question);
        };

        if (window.api) {
            window.api.askView.onShowTextInput(() => {
                console.log('📎 [Ask Button] Show text input signal received');
                console.log('📎 [Ask Button] Current state - showTextInput:', this.showTextInput, 'conversationHistory.length:', this.conversationHistory.length);
                if (!this.showTextInput) {
                    console.log('📎 [Ask Button] Setting showTextInput to true and focusing input');
                    this.showTextInput = true;
                    this.updateComplete.then(() => this.focusTextInput());
                  } else {
                    console.log('📎 [Ask Button] Text input already visible, just focusing');
                    this.focusTextInput();
                  }
            });

            window.api.askView.onScrollResponseUp(() => this.handleScroll('up'));
            window.api.askView.onScrollResponseDown(() => this.handleScroll('down'));
            window.api.askView.onAskStateUpdate((event, newState) => {
                const previousResponse = this.currentResponse;
                const wasStreaming = this.isStreaming;
                const wasLoading = this.isLoading;
                const wasListening = this.isListening;
                const hadTextInput = this.showTextInput;
                
                // Track what actually changed to avoid unnecessary re-renders
                const stateChanged = {
                    loading: this.isLoading !== newState.isLoading,
                    streaming: this.isStreaming !== newState.isStreaming,
                    listening: this.isListening !== (newState.isListening || false),
                    textInput: this.showTextInput !== newState.showTextInput,
                    question: this.currentQuestion !== newState.currentQuestion,
                    response: this.currentResponse !== newState.currentResponse
                };
                
                // Only update properties that actually changed
                if (stateChanged.response) this.currentResponse = newState.currentResponse;
                if (stateChanged.question) this.currentQuestion = newState.currentQuestion;
                if (stateChanged.loading) this.isLoading = newState.isLoading;
                if (stateChanged.streaming) this.isStreaming = newState.isStreaming;
                if (stateChanged.listening) this.isListening = newState.isListening || false;
                if (stateChanged.textInput) this.showTextInput = newState.showTextInput;
                
                // Always update these non-reactive properties
                this.sttTranscription = newState.sttTranscription || '';
                this.conversationalResponse = newState.conversationalResponse || '';
                this.retrievalResults = Array.isArray(newState.retrievalResults) ? newState.retrievalResults : [];
                
                // Debug streaming state changes
                if (this.focusLock && (stateChanged.streaming || stateChanged.loading)) {
                    console.log('🔍 [Debug] Streaming state check:', {
                        wasStreaming,
                        'newState.isStreaming': newState.isStreaming,
                        'newState.isLoading': newState.isLoading,
                        'newState.currentResponse': !!newState.currentResponse,
                        'original condition met': wasStreaming && !newState.isStreaming && !newState.isLoading && 
                            newState.currentResponse && newState.currentResponse !== previousResponse,
                        'simplified condition met': wasStreaming && !newState.isStreaming && !newState.isLoading && 
                            newState.currentResponse
                    });
                }

                // When streaming completes, move the response to conversation history
                // Simplified condition: just check if streaming stopped and we have a response
                if (wasStreaming && !newState.isStreaming && !newState.isLoading && newState.currentResponse) {
                    console.log('🏁 [Stream Complete] Moving assistant response to conversation history');
                    
                    // Only add to history if it's not already there (avoid duplicates)
                    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
                    const isDuplicate = lastMessage && lastMessage.role === 'assistant' && 
                                      lastMessage.content.trim() === newState.currentResponse.trim();
                    
                    if (!isDuplicate) {
                        // Save the original markdown content, not the rendered HTML
                        this.addToConversationHistory('assistant', newState.currentResponse);
                        console.log('📝 [Stream Complete] Added unique assistant response to history');
                    } else {
                        console.log('⚠️ [Stream Complete] Skipped duplicate assistant response');
                    }
                    
                    // Clear current response so it doesn't duplicate in the UI
                    // The conversation history now contains this response
                    this.currentResponse = '';
                    console.log('🧹 [Stream Complete] Cleared current response');
                    
                    // Reset streaming parser state
                    this.resetStreamingParser();
                    
                    // Deactivate focus lock when streaming completes
                    if (this.focusLock) {
                        console.log('🔓 [Focus Lock] Beginning deactivation process...');
                        
                        this.focusLock = false;
                        this.classList.remove('focus-lock');
                        
                        // Remove per-message "focus-visible" classes safely
                        if (this.lastUserMessage && this.lastUserMessage.classList) {
                            this.lastUserMessage.classList.remove('focus-visible');
                            console.log('🧹 [Focus Lock] Removed focus-visible from last user message');
                            this.lastUserMessage = null;
                        }
                        if (this.lastAssistantMessage && this.lastAssistantMessage.classList) {
                            this.lastAssistantMessage.classList.remove('focus-visible');
                            console.log('🧹 [Focus Lock] Removed focus-visible from last assistant message');
                            this.lastAssistantMessage = null;
                        }
                        
                        // Extra cleanup: remove any remaining focus-visible classes
                        const conversationContainer = this.shadowRoot?.querySelector('.conversation-container');
                        if (conversationContainer) {
                            const remainingVisible = conversationContainer.querySelectorAll('.conversation-message.focus-visible');
                            remainingVisible.forEach(msg => {
                                msg.classList.remove('focus-visible');
                                console.log('🧹 [Focus Lock] Cleaned up remaining focus-visible class');
                            });
                        }
                        
                        console.log('✅ [Focus Lock] Deactivated - all messages now visible, user can scroll freely');
                        
                        // Force a re-render to ensure CSS changes take effect
                        this.requestUpdate();
                        
                        // After DOM updates, scroll to bottom to show the latest exchange
                        this.updateComplete.then(() => {
                            // Small delay to ensure all CSS transitions are complete
                            setTimeout(() => {
                                this.scrollToBottom();
                                console.log('📍 [Focus Lock] Scrolled to show latest exchange');
                            }, 100);
                        });
                        
                        // Don't auto-scroll after unlock - let user scroll freely
                    } else {
                        // Auto-scroll to bottom to show the latest content
                        this.scrollToBottom();
                    }
                }
              
                // Handle text input focus when showTextInput changes
                if (stateChanged.textInput && newState.showTextInput) {
                    if (!hadTextInput) {
                        this.updateComplete.then(() => this.focusTextInput());
                    } else {
                        this.focusTextInput();
                    }
                }
              });

            // STT event listeners
            window.api.askView.onSttUpdate((event, data) => {
                this.sttTranscription = data.text || '';
                this.isListening = data.isListening;
                // Trigger voice activity indicator when text is being transcribed
                this.voiceActivity = data.text && data.text.length > 0 && !data.isFinal;
                this.requestUpdate();
            });

            window.api.askView.onSttComplete((event, data) => {
                this.sttTranscription = '';
                // Only update UI state from the backend data, don't override voice session state
                this.isListening = data.isListening; // Use the listening state from the backend
                this.voiceActivity = false;
                
                // Only stop audio capture if we're actually stopping the voice session
                // In conversation mode, the backend keeps isListening=true, so don't stop capture
                if (!data.isListening && window.askAudioCapture) {
                    console.log('[AskView] Stopping audio capture - voice session ended');
                    window.askAudioCapture.stopCapture();
                } else if (data.isListening) {
                    console.log('[AskView] Keeping audio capture active - conversation mode continues');
                }
                this.requestUpdate();
            });

            window.api.askView.onSttStatus((event, data) => {
                console.log('[AskView] STT status:', data.status);
            });

            window.api.askView.onSttError((event, data) => {
                console.error('[AskView] STT error:', data.error);
                this.isListening = data.isListening || false; // Use backend state
                this.sttTranscription = '';
                this.voiceActivity = false;
                
                // Only stop audio capture if the backend indicates we should stop listening
                if (!this.isListening && window.askAudioCapture) {
                    console.log('[AskView] Stopping audio capture due to STT error');
                    window.askAudioCapture.stopCapture();
                }
                this.requestUpdate();
            });

            // Conversational response for TTS
            window.api.askView.onConversationalResponse((event, data) => {
                console.log('[AskView] Received conversational response for TTS');
                this.speakConversationalResponse(data.text);
            });

            // Streaming conversational chunks for TTS
            console.log('[AskView] Setting up conversational chunk listener. API available:', !!window.api.askView.onConversationalChunk);
            if (window.api.askView.onConversationalChunk) {
                window.api.askView.onConversationalChunk((event, data) => {
                    console.log(`[AskView] Received conversational chunk for TTS: "${data.text}"`);
                    this.handleConversationalChunk(data);
                });
                console.log('[AskView] Conversational chunk listener registered successfully');
            } else {
                console.error('[AskView] onConversationalChunk not available in API');
            }

            console.log('AskView: IPC 이벤트 리스너 등록 완료');
        }

        // Initialize VAD system with error handling
        this.initializeVADSafely();
    }

    /**
     * Safely initialize VAD system with fallback handling
     */
    async initializeVADSafely() {
        try {
            // Wait a bit for the VAD module to load
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Try both possible VAD instance names
            const vadInstance = window.askAudioCaptureVAD || window.askAudioCapture;
            
            if (vadInstance) {
                console.log('[AskView] Setting up VAD callbacks on instance:', vadInstance.constructor?.name || 'unknown');
                
                // Set up VAD callbacks
                vadInstance.onSpeechStart = () => {
                    this.handleVADStateChange('speechStarted');
                };
                
                vadInstance.onSpeechEnd = () => {
                    this.handleVADStateChange('speechEnded');
                };
                
                vadInstance.onVoiceActivity = (isActive) => {
                    this.updateVoiceActivity(isActive);
                };
                
                vadInstance.onInterruption = () => {
                    this.handleVADStateChange('interrupted');
                };
                
                // Add callback for when transcription is completed
                vadInstance.onTranscriptionComplete = (transcriptText) => {
                    this.handleTranscriptionComplete(transcriptText);
                };
                
                console.log('[AskView] VAD callbacks configured successfully');
                console.log('[AskView] VAD state:', vadInstance.getState ? vadInstance.getState() : 'getState not available');
                
            } else {
                console.warn('[AskView] VAD system not available, using fallback');
            }
        } catch (error) {
            console.error('[AskView] Error initializing VAD:', error);
        }
    }

    /**
     * Handle VAD state changes from the Voice Activity Detection system
     */
    handleVADStateChange(event, data = {}) {
        console.log(`[AskView] VAD state change: ${event}`, data);
        
        switch (event) {
            case 'conversationStarted':
                this.isListening = true;
                this.voiceActivity = false;
                console.log('[AskView] VAD conversation mode started');
                break;
                
            case 'conversationEnded':
                this.isListening = false;
                this.voiceActivity = false;
                console.log('[AskView] VAD conversation mode ended');
                break;
                
            case 'speechStarted':
                this.voiceActivity = true;
                console.log('[AskView] VAD detected speech start');
                break;
                
            case 'speechEnded':
                this.voiceActivity = false;
                console.log('[AskView] VAD detected speech end');
                break;
                
            case 'processingStarted':
                this.isLoading = true;
                console.log('[AskView] VAD processing speech');
                break;
                
            case 'processingEnded':
                this.isLoading = false;
                console.log('[AskView] VAD finished processing');
                break;
                
            case 'interrupted':
                console.log('[AskView] VAD detected interruption');
                break;
                
            default:
                console.log(`[AskView] Unknown VAD event: ${event}`);
        }
        
        // Update UI
        this.requestUpdate();
    }

    /**
     * Handle completed transcription from VAD system
     * This triggers the normal text submission workflow
     */
    async handleTranscriptionComplete(transcriptText) {
        console.log(`[AskView] Transcription completed: "${transcriptText}"`);
        
        if (transcriptText && transcriptText.trim()) {
            console.log('[AskView] Submitting transcribed text through normal workflow');
            
            // Use the existing handleSendText method to process the transcribed text
            // This ensures it goes through the normal UI flow and appears in chat history
            await this.handleSendText(null, transcriptText.trim());
        } else {
            console.log('[AskView] Transcription was empty, not submitting');
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.resizeObserver?.disconnect();

        console.log('📱 AskView disconnectedCallback - IPC 이벤트 리스너 제거');

        document.removeEventListener('keydown', this.handleEscKey);

        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }

        if (this.headerAnimationTimeout) {
            clearTimeout(this.headerAnimationTimeout);
        }

        if (this.streamingTimeout) {
            clearTimeout(this.streamingTimeout);
        }

        Object.values(this.lineCopyTimeouts).forEach(timeout => clearTimeout(timeout));

        // Stop any playing speech
        this.stopSpeaking();

        // Cleanup VAD safely
        if (window.askAudioCaptureVAD) {
            try {
                window.askAudioCaptureVAD.cleanup();
            } catch (error) {
                console.error('[AskView] Error cleaning up VAD:', error);
            }
        }

        if (window.api) {
            window.api.askView.removeOnAskStateUpdate(this.handleAskStateUpdate);
            window.api.askView.removeOnShowTextInput(this.handleShowTextInput);
            window.api.askView.removeOnScrollResponseUp(this.handleScroll);
            window.api.askView.removeOnScrollResponseDown(this.handleScroll);
            window.api.askView.removeOnConversationalResponse();
            window.api.askView.removeOnConversationalChunk();
            console.log('✅ AskView: IPC 이벤트 리스너 제거 필요');
        }

        // Clean up focus lock state and CSS class
        this.focusLock = false;
        this.lastUserMessage = null;
        this.lastAssistantMessage = null;
        this.classList.remove('focus-lock');
    }


    async loadLibraries() {
        try {
            if (!window.marked) {
                await this.loadScript('../assets/marked-4.3.0.min.js');
            }

            if (!window.hljs) {
                await this.loadScript('../assets/highlight-11.9.0.min.js');
            }

            if (!window.DOMPurify) {
                await this.loadScript('../assets/dompurify-3.0.7.min.js');
            }

            // Load KaTeX for LaTeX rendering
            if (!window.katex) {
                console.log('[AskView] Loading KaTeX library from local assets...');
                await this.loadScript('../assets/katex.min.js');
                await this.loadCSS('../assets/katex.min.css');
                console.log('[AskView] KaTeX library loaded, window.katex available:', !!window.katex);
            }

            this.marked = window.marked;
            this.hljs = window.hljs;
            this.DOMPurify = window.DOMPurify;
            this.katex = window.katex;

            console.log('[AskView] Library assignment complete:', {
                marked: !!this.marked,
                hljs: !!this.hljs,
                DOMPurify: !!this.DOMPurify,
                katex: !!this.katex
            });

            if (this.marked && this.hljs) {
                this.marked.setOptions({
                    highlight: (code, lang) => {
                        if (lang && this.hljs.getLanguage(lang)) {
                            try {
                                return this.hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('Highlight error:', err);
                            }
                        }
                        try {
                            return this.hljs.highlightAuto(code).value;
                        } catch (err) {
                            console.warn('Auto highlight error:', err);
                        }
                        return code;
                    },
                    breaks: true,
                    gfm: true,
                    pedantic: false,
                    smartypants: false,
                    xhtml: false,
                });

                this.isLibrariesLoaded = true;
                // Defer renderContent() until after any current render cycle completes
                this.updateComplete.then(() => {
                    this.renderContent();
                });
                console.log('All libraries loaded successfully in AskView including KaTeX');
                
                // Test KaTeX functionality
                if (this.katex) {
                    try {
                        const testRender = this.katex.renderToString('E = mc^2', { throwOnError: false });
                        console.log('[AskView] KaTeX test successful:', testRender.length > 0 ? 'PASS' : 'FAIL');
                    } catch (error) {
                        console.error('[AskView] KaTeX test failed:', error);
                    }
                } else {
                    console.error('[AskView] KaTeX not available after library loading');
                }
            }

            if (this.DOMPurify) {
                this.isDOMPurifyLoaded = true;
                console.log('DOMPurify loaded successfully in AskView');
            }
        } catch (error) {
            console.error('Failed to load libraries in AskView:', error);
        }
    }

    handleCloseAskWindow() {
        // Clear conversation history when closing
        this.conversationHistory = [];
        this.clearResponseContent();
        window.api.askView.closeAskWindow();
    }

    handleCloseIfNoContent() {
        if (!this.currentResponse && !this.isLoading && !this.isStreaming) {
            this.handleCloseAskWindow();
        }
    }

    handleEscKey(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.handleCloseIfNoContent();
        }
    }

    clearResponseContent() {
        this.currentResponse = '';
        this.currentQuestion = '';
        this.isLoading = false;
        this.isStreaming = false;
        this.isListening = false;
        this.sttTranscription = '';
        this.voiceActivity = false;
        this.conversationalResponse = '';
        this.conversationHistory = [];
        this.headerText = 'AI Response';
        this.showTextInput = true;
        this.lastProcessedLength = 0;
        this.smdParser = null;
        this.smdContainer = null;
        
        // Stop any playing speech
        this.stopSpeaking();
    }

    handleInputFocus() {
        this.isInputFocused = true;
    }

    focusTextInput() {
        requestAnimationFrame(() => {
            const textInput = this.shadowRoot?.getElementById('textInput');
            if (textInput) {
                textInput.focus();
            }
        });
    }


    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                console.log('[AskView] Script already loaded:', src);
                resolve();
                return;
            }

            console.log('[AskView] Loading script:', src);
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log('[AskView] Script loaded successfully:', src);
                resolve();
            };
            script.onerror = (error) => {
                console.error('[AskView] Failed to load script:', src, error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    loadCSS(href) {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector(`link[href="${href}"]`);
            if (existingLink) {
                console.log('[AskView] CSS already loaded:', href);
                resolve();
                return;
            }

            console.log('[AskView] Loading CSS:', href);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                console.log('[AskView] CSS loaded successfully:', href);
                resolve();
            };
            link.onerror = (error) => {
                console.error('[AskView] Failed to load CSS:', href, error);
                reject(new Error(`Failed to load CSS: ${href}`));
            };
            document.head.appendChild(link);
        });
    }

    parseMarkdown(text) {
        if (!text) return '';

        if (!this.isLibrariesLoaded || !this.marked) {
            return text;
        }

        try {
            // First render LaTeX, then process markdown
            const latexRendered = this.renderLaTeX(text);
            return this.marked(latexRendered);
        } catch (error) {
            console.error('Markdown parsing error in AskView:', error);
            return text;
        }
    }

    renderLaTeX(text) {
        if (!this.katex) {
            console.warn('[AskView] KaTeX not loaded, skipping LaTeX rendering. Available window.katex:', !!window.katex);
            return text;
        }

        try {
            console.log('[AskView] Rendering LaTeX for text:', text.substring(0, 100) + '...');
            
            let hasRendered = false;
            
            // Handle display math \[...\]
            text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
                try {
                    console.log('[AskView] Rendering display math \\[\\]:', latex.trim());
                    const rendered = this.katex.renderToString(latex.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        trust: false,
                        strict: false
                    });
                    console.log('[AskView] Display math \\[\\] rendered successfully');
                    hasRendered = true;
                    return rendered;
                } catch (error) {
                    console.warn('[AskView] LaTeX display math \\[\\] render error:', error);
                    return match; // Return original if rendering fails
                }
            });

            // Handle inline math \(...\)
            text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
                try {
                    console.log('[AskView] Rendering inline math \\(\\):', latex.trim());
                    const rendered = this.katex.renderToString(latex.trim(), {
                        displayMode: false,
                        throwOnError: false,
                        trust: false,
                        strict: false
                    });
                    console.log('[AskView] Inline math \\(\\) rendered successfully');
                    hasRendered = true;
                    return rendered;
                } catch (error) {
                    console.warn('[AskView] LaTeX inline math \\(\\) render error:', error);
                    return match; // Return original if rendering fails
                }
            });
            
            // Handle display math ($$...$$)
            text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
                try {
                    console.log('[AskView] Rendering display math $$:', latex.trim());
                    const rendered = this.katex.renderToString(latex.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        trust: false,
                        strict: false
                    });
                    console.log('[AskView] Display math $$ rendered successfully');
                    hasRendered = true;
                    return rendered;
                } catch (error) {
                    console.warn('[AskView] LaTeX display math $$ render error:', error);
                    return match; // Return original if rendering fails
                }
            });

            // Handle inline math ($...$) - be careful not to match single $ used for currency
            text = text.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (match, latex) => {
                // Skip if it looks like currency (starts with digit or common currency words)
                if (/^\s*\d/.test(latex) || /^\s*(USD|EUR|GBP|price|cost|dollar)/i.test(latex)) {
                    return match;
                }
                
                try {
                    console.log('[AskView] Rendering inline math $:', latex.trim());
                    const rendered = this.katex.renderToString(latex.trim(), {
                        displayMode: false,
                        throwOnError: false,
                        trust: false,
                        strict: false
                    });
                    console.log('[AskView] Inline math $ rendered successfully');
                    hasRendered = true;
                    return rendered;
                } catch (error) {
                    console.warn('[AskView] LaTeX inline math $ render error:', error);
                    return match; // Return original if rendering fails
                }
            });

            if (hasRendered) {
                console.log('[AskView] LaTeX rendering completed with changes');
            } else {
                console.log('[AskView] LaTeX rendering completed but no expressions were rendered');
            }

            return text;
        } catch (error) {
            console.error('[AskView] LaTeX rendering error:', error);
            return text;
        }
    }

    parseMarkdownWithPreRenderedLatex(text) {
        if (!this.marked) {
            return text;
        }

        try {
            // Use marked to parse markdown, but preserve KaTeX HTML
            const parsedHtml = this.marked.parse(text);
            
            // Sanitize with extended allowlist for KaTeX
            if (this.DOMPurify) {
                return this.DOMPurify.sanitize(parsedHtml, {
                    ALLOWED_TAGS: [
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'b', 'em', 'i',
                        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead',
                        'tbody', 'tr', 'th', 'td', 'hr', 'sup', 'sub', 'del', 'ins', 'span', 'div',
                        // KaTeX math elements
                        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 
                        'msqrt', 'mroot', 'mtext', 'mspace', 'mpadded', 'mphantom', 'mfenced', 
                        'menclose', 'mstyle', 'munder', 'mover', 'munderover', 'mmultiscripts', 
                        'mtable', 'mtr', 'mtd', 'mlabeledtr', 'maligngroup', 'malignmark', 'maction'
                    ],
                    ALLOWED_ATTR: [
                        'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
                        // KaTeX attributes
                        'mathvariant', 'mathsize', 'mathcolor', 'mathbackground', 'dir', 
                        'fontfamily', 'fontsize', 'fontweight', 'fontstyle', 'displaystyle', 
                        'scriptlevel', 'rowspan', 'columnspan', 'rowalign', 'columnalign', 
                        'groupalign', 'alignmentscope', 'columnwidth', 'width', 'rowspacing', 
                        'columnspacing', 'rowlines', 'columnlines', 'frame', 'framespacing', 
                        'equalrows', 'equalcolumns', 'side', 'minlabelspacing', 'accent', 
                        'accentunder', 'align', 'numalign', 'denomalign', 'bevelled', 
                        'linethickness', 'notation', 'selection', 'open', 'close', 'separators', 
                        'subscriptshift', 'superscriptshift', 'lspace', 'rspace', 'stretchy', 
                        'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits', 
                        'separator', 'fence', 'form', 'infix', 'prefix', 'postfix'
                    ],
                });
            }
            
            return parsedHtml;
        } catch (error) {
            console.error('[AskView] Error parsing markdown with LaTeX:', error);
            return text;
        }
    }

    applyLatexToContainer(container) {
        if (!this.katex || !container) return;
        
        try {
            // Find all text nodes that might contain LaTeX
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.nodeValue && (node.nodeValue.includes('$') || node.nodeValue.includes('\\'))) {
                    textNodes.push(node);
                }
            }
            
            // Process each text node that might contain LaTeX
            textNodes.forEach(textNode => {
                const originalText = textNode.nodeValue;
                const processedText = this.renderLaTeX(originalText);
                
                if (processedText !== originalText) {
                    // Create a temporary container to parse the HTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = processedText;
                    
                    // Replace the text node with the rendered content
                    const parent = textNode.parentNode;
                    while (tempDiv.firstChild) {
                        parent.insertBefore(tempDiv.firstChild, textNode);
                    }
                    parent.removeChild(textNode);
                }
            });
            
            console.log('[AskView] Applied LaTeX rendering to container');
        } catch (error) {
            console.error('[AskView] Error applying LaTeX to container:', error);
        }
    }

    fixIncompleteCodeBlocks(text) {
        if (!text) return text;

        const codeBlockMarkers = text.match(/```/g) || [];
        const markerCount = codeBlockMarkers.length;

        if (markerCount % 2 === 1) {
            return text + '\n```';
        }

        return text;
    }

    handleScroll(direction) {
        const scrollableElement = this.shadowRoot.querySelector('#responseContainer');
        if (scrollableElement) {
            const scrollAmount = 100; // 한 번에 스크롤할 양 (px)
            if (direction === 'up') {
                scrollableElement.scrollTop -= scrollAmount;
            } else {
                scrollableElement.scrollTop += scrollAmount;
            }
        }
    }


    renderContent() {
        // Defer ALL DOM access until after render cycle completes to prevent LitElement crashes
        this.updateComplete.then(() => {
            const responseContainer = this.shadowRoot?.getElementById('currentResponseContent');
            if (!responseContainer) {
                console.warn('[renderContent] Response container not found - likely no active response');
                return;
            }
            
            if (!responseContainer.isConnected) {
                console.warn('[renderContent] Response container not connected to DOM - deferring');
                setTimeout(() => this.renderContent(), 50);
                return;
            }

            // Store reference to assistant message container for focus lock
            if (this.focusLock && !this.lastAssistantMessage) {
                const container = this.shadowRoot?.getElementById('currentResponseContent');
                if (container && container.isConnected) {
                    this.lastAssistantMessage = container.closest('.conversation-message');
                    if (this.lastAssistantMessage) {
                        console.log('📍 [Focus Lock] Assistant message container found and stored');
                    }
                }
            }
        
            // Check loading state
            if (this.isLoading) {
                // Loading animation is handled in the template
                this.resetStreamingParser();
                return;
            }
        
            // If there is no response, clear content
            if (!this.currentResponse) {
                responseContainer.innerHTML = '';
                this.resetStreamingParser();
                return;
            }
            
            // Set streaming markdown parser for current response
            this.renderStreamingMarkdown(responseContainer);

            // After updating content, recalculate window height
            this.adjustWindowHeightThrottled();
        }).catch(error => {
            console.error('[renderContent] Error in DOM manipulation:', error);
        });
    }

    resetStreamingParser() {
        this.smdParser = null;
        this.smdContainer = null;
        this.lastProcessedLength = 0;
    }

    renderStreamingMarkdown(responseContainer) {
        try {
            // Check if container exists and is connected to DOM
            if (!responseContainer || !responseContainer.isConnected) {
                console.error('Container not found or not connected for renderStreamingMarkdown operation.');
                return;
            }

            // Get the current response text
            let textToRender = this.currentResponse || '';
            
            // IMPORTANT: We need to process LaTeX BEFORE the SMD parser
            // The SMD parser might escape or modify LaTeX expressions
            if (this.katex && textToRender) {
                console.log('[AskView] Processing LaTeX during streaming, text length:', textToRender.length);
                console.log('[AskView] Current text sample:', textToRender.substring(0, 200) + '...');
                
                // Check for any LaTeX expressions (complete or partial)
                const hasDisplayMath = textToRender.includes('$$');
                const hasInlineMath = /\$[^$\n]+?\$/.test(textToRender);
                const hasLatexDisplayBrackets = textToRender.includes('\\[');
                const hasLatexInlineBrackets = textToRender.includes('\\(');
                const hasSqrt = textToRender.includes('\\sqrt');
                const hasFrac = textToRender.includes('\\frac');
                const hasOtherLatex = /\\[a-zA-Z]+/.test(textToRender);
                
                console.log('[AskView] LaTeX indicators - Display:', hasDisplayMath, 'Inline:', hasInlineMath, 'Display\\[\\]:', hasLatexDisplayBrackets, 'Inline\\(\\):', hasLatexInlineBrackets, 'Sqrt:', hasSqrt, 'Frac:', hasFrac, 'Other:', hasOtherLatex);
                
                // If we detect any LaTeX content, try to render it
                if (hasDisplayMath || hasInlineMath || hasLatexDisplayBrackets || hasLatexInlineBrackets || hasSqrt || hasFrac || hasOtherLatex) {
                    console.log('[AskView] LaTeX content detected, attempting render...');
                    const originalText = textToRender;
                    textToRender = this.renderLaTeX(textToRender);
                    
                    if (textToRender !== originalText) {
                        console.log('[AskView] LaTeX expressions found and processed during streaming');
                        console.log('[AskView] Rendered text sample:', textToRender.substring(0, 200) + '...');
                    } else {
                        console.log('[AskView] No LaTeX changes made to text');
                    }
                } else {
                    console.log('[AskView] No LaTeX content detected');
                }
            }

            // For conversation history rendering (when we have a complete response),
            // render all at once instead of using streaming parser
            if (textToRender.length > 0 && !this.isStreaming) {
                console.log('[AskView] Rendering complete content (conversation history mode)');
                
                // Use marked.js for complete rendering when not streaming
                if (this.marked) {
                    const htmlContent = this.marked.parse(textToRender);
                    if (this.DOMPurify) {
                        responseContainer.innerHTML = this.DOMPurify.sanitize(htmlContent, {
                            ALLOWED_TAGS: [
                                'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'b', 'em', 'i',
                                'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead',
                                'tbody', 'tr', 'th', 'td', 'hr', 'sup', 'sub', 'del', 'ins', 'span', 'div',
                                // KaTeX math elements
                                'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 
                                'msqrt', 'mroot', 'mtext', 'mspace', 'mpadded', 'mphantom', 'mfenced', 
                                'menclose', 'mstyle', 'munder', 'mover', 'munderover', 'mmultiscripts', 
                                'mtable', 'mtr', 'mtd', 'mlabeledtr', 'maligngroup', 'malignmark', 'maction'
                            ],
                            ALLOWED_ATTR: [
                                'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
                                // KaTeX attributes
                                'mathvariant', 'mathsize', 'mathcolor', 'mathbackground', 'dir', 
                                'fontfamily', 'fontsize', 'fontweight', 'fontstyle', 'displaystyle', 
                                'scriptlevel', 'rowspan', 'columnspan', 'rowalign', 'columnalign', 
                                'groupalign', 'alignmentscope', 'columnwidth', 'width', 'rowspacing', 
                                'columnspacing', 'rowlines', 'columnlines', 'frame', 'framespacing', 
                                'equalrows', 'equalcolumns', 'side', 'minlabelspacing', 'accent', 
                                'accentunder', 'align', 'numalign', 'denomalign', 'bevelled', 
                                'linethickness', 'notation', 'selection', 'open', 'close', 'separators', 
                                'subscriptshift', 'superscriptshift', 'lspace', 'rspace', 'stretchy', 
                                'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits', 
                                'separator', 'fence', 'form', 'infix', 'prefix', 'postfix'
                            ],
                        });
                    } else {
                        responseContainer.innerHTML = htmlContent;
                    }
                } else {
                    // Fallback if marked is not available
                    responseContainer.innerHTML = textToRender.replace(/\n/g, '<br>');
                }
                
                // Apply code highlighting
                if (this.hljs && responseContainer.isConnected) {
                    responseContainer.querySelectorAll('pre code').forEach(block => {
                        if (!block.hasAttribute('data-highlighted')) {
                            try {
                                this.hljs.highlightElement(block);
                                block.setAttribute('data-highlighted', 'true');
                            } catch (e) {
                                console.warn('Code highlighting failed for block:', e);
                            }
                        }
                    });
                }
                
                return;
            }

            // Instead of using SMD streaming parser, let's use a simpler approach
            // that preserves LaTeX rendering for streaming content
            if (this.katex && textToRender.includes('<span class="katex">')) {
                // If we have rendered LaTeX, use innerHTML directly
                responseContainer.innerHTML = this.parseMarkdownWithPreRenderedLatex(textToRender);
                console.log('[AskView] Used direct HTML rendering to preserve LaTeX');
            } else {
                // Use SMD parser for regular markdown streaming
                // 파서가 없거나 컨테이너가 변경되었으면 새로 생성
                if (!this.smdParser || this.smdContainer !== responseContainer) {
                    this.smdContainer = responseContainer;
                    this.smdContainer.innerHTML = '';
                    
                    // smd.js의 default_renderer 사용
                    const renderer = default_renderer(this.smdContainer);
                    this.smdParser = parser(renderer);
                    this.lastProcessedLength = 0;
                }

                // 새로운 텍스트만 처리 (스트리밍 최적화)
                // Use the LaTeX-processed text for streaming
                const currentText = textToRender;
                const newText = currentText.slice(this.lastProcessedLength);
                
                if (newText.length > 0) {
                    // 새로운 텍스트 청크를 파서에 전달
                    parser_write(this.smdParser, newText);
                    this.lastProcessedLength = currentText.length;
                }

                // 스트리밍이 완료되면 파서 종료
                if (!this.isStreaming && !this.isLoading) {
                    parser_end(this.smdParser);
                    
                    // Final LaTeX pass for any remaining expressions
                    if (this.katex) {
                        console.log('[AskView] Applying final LaTeX pass after streaming complete');
                        this.applyLatexToContainer(responseContainer);
                    }
                }
            }

            // 코드 하이라이팅 적용 (안전한 DOM 접근)
            if (this.hljs && responseContainer.isConnected) {
                responseContainer.querySelectorAll('pre code').forEach(block => {
                    if (!block.hasAttribute('data-highlighted')) {
                        try {
                            this.hljs.highlightElement(block);
                            block.setAttribute('data-highlighted', 'true');
                        } catch (e) {
                            console.warn('Code highlighting failed for block:', e);
                        }
                    }
                });
            }

            // 스크롤을 맨 아래로 (conversation container) - 안전한 DOM 접근
            const conversationContainer = this.shadowRoot?.querySelector('.conversation-container');
            if (conversationContainer && conversationContainer.isConnected) {
                conversationContainer.scrollTop = conversationContainer.scrollHeight;
            }
            
        } catch (error) {
            console.error('Error rendering streaming markdown:', error);
            // 에러 발생 시 기본 텍스트 렌더링으로 폴백
            this.renderFallbackContent(responseContainer);
        }
    }

    renderFallbackContent(responseContainer) {
        const textToRender = this.currentResponse || '';
        
        if (this.isLibrariesLoaded && this.marked && this.DOMPurify) {
            try {
                // Process LaTeX first, then markdown
                const latexRendered = this.renderLaTeX(textToRender);
                const parsedHtml = this.marked.parse(latexRendered);

                // DOMPurify로 정제 with extended allowlist for KaTeX elements
                const cleanHtml = this.DOMPurify.sanitize(parsedHtml, {
                    ALLOWED_TAGS: [
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'b', 'em', 'i',
                        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead',
                        'tbody', 'tr', 'th', 'td', 'hr', 'sup', 'sub', 'del', 'ins', 'span', 'div',
                        // KaTeX math elements
                        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 
                        'msqrt', 'mroot', 'mtext', 'mspace', 'mpadded', 'mphantom', 'mfenced', 
                        'menclose', 'mstyle', 'munder', 'mover', 'munderover', 'mmultiscripts', 
                        'mtable', 'mtr', 'mtd', 'mlabeledtr', 'maligngroup', 'malignmark', 'maction'
                    ],
                    ALLOWED_ATTR: [
                        'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
                        // KaTeX attributes
                        'mathvariant', 'mathsize', 'mathcolor', 'mathbackground', 'dir', 
                        'fontfamily', 'fontsize', 'fontweight', 'fontstyle', 'displaystyle', 
                        'scriptlevel', 'rowspan', 'columnspan', 'rowalign', 'columnalign', 
                        'groupalign', 'alignmentscope', 'columnwidth', 'width', 'rowspacing', 
                        'columnspacing', 'rowlines', 'columnlines', 'frame', 'framespacing', 
                        'equalrows', 'equalcolumns', 'side', 'minlabelspacing', 'accent', 
                        'accentunder', 'align', 'numalign', 'denomalign', 'bevelled', 
                        'linethickness', 'notation', 'selection', 'open', 'close', 'separators', 
                        'subscriptshift', 'superscriptshift', 'lspace', 'rspace', 'stretchy', 
                        'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits', 
                        'separator', 'fence', 'form', 'infix', 'prefix', 'postfix'
                    ],
                });

                responseContainer.innerHTML = cleanHtml;

                // 코드 하이라이팅 적용
                if (this.hljs) {
                    responseContainer.querySelectorAll('pre code').forEach(block => {
                        this.hljs.highlightElement(block);
                    });
                }
            } catch (error) {
                console.error('Error in fallback rendering:', error);
                responseContainer.textContent = textToRender;
            }
        } else {
            // 라이브러리가 로드되지 않았을 때 기본 렌딩
            const basicHtml = textToRender
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');

            responseContainer.innerHTML = `<p>${basicHtml}</p>`;
        }
    }


    requestWindowResize(targetHeight) {
        // Skip in embedded mode
        if (this.embedded) {
            return;
        }
        
        if (window.api) {
            window.api.askView.adjustWindowHeight(targetHeight);
        }
    }

    animateHeaderText(text) {
        this.headerAnimating = true;
        this.requestUpdate();

        setTimeout(() => {
            this.headerText = text;
            this.headerAnimating = false;
            this.requestUpdate();
        }, 150);
    }

    startHeaderAnimation() {
        this.animateHeaderText('analyzing screen...');

        if (this.headerAnimationTimeout) {
            clearTimeout(this.headerAnimationTimeout);
        }

        this.headerAnimationTimeout = setTimeout(() => {
            this.animateHeaderText('thinking...');
        }, 1500);
    }

    renderMarkdown(content) {
        if (!content) return '';

        if (this.isLibrariesLoaded && this.marked) {
            return this.parseMarkdown(content);
        }

        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    fixIncompleteMarkdown(text) {
        if (!text) return text;

        // 불완전한 볼드체 처리
        const boldCount = (text.match(/\*\*/g) || []).length;
        if (boldCount % 2 === 1) {
            text += '**';
        }

        // 불완전한 이탤릭체 처리
        const italicCount = (text.match(/(?<!\*)\*(?!\*)/g) || []).length;
        if (italicCount % 2 === 1) {
            text += '*';
        }

        // 불완전한 인라인 코드 처리
        const inlineCodeCount = (text.match(/`/g) || []).length;
        if (inlineCodeCount % 2 === 1) {
            text += '`';
        }

        // 불완전한 링크 처리
        const openBrackets = (text.match(/\[/g) || []).length;
        const closeBrackets = (text.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
            text += ']';
        }

        const openParens = (text.match(/\]\(/g) || []).length;
        const closeParens = (text.match(/\)\s*$/g) || []).length;
        if (openParens > closeParens && text.endsWith('(')) {
            text += ')';
        }

        return text;
    }


    async handleCopy() {
        if (this.copyState === 'copied') return;

        let responseToCopy = this.currentResponse;

        if (this.isDOMPurifyLoaded && this.DOMPurify) {
            const testHtml = this.renderMarkdown(responseToCopy);
            const sanitized = this.DOMPurify.sanitize(testHtml);

            if (this.DOMPurify.removed && this.DOMPurify.removed.length > 0) {
                console.warn('Unsafe content detected, copy blocked');
                return;
            }
        }

        const textToCopy = `Question: ${this.currentQuestion}\n\nAnswer: ${responseToCopy}`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            console.log('Content copied to clipboard');

            this.copyState = 'copied';
            this.requestUpdate();

            if (this.copyTimeout) {
                clearTimeout(this.copyTimeout);
            }

            this.copyTimeout = setTimeout(() => {
                this.copyState = 'idle';
                this.requestUpdate();
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    async handleLineCopy(lineIndex) {
        const originalLines = this.currentResponse.split('\n');
        const lineToCopy = originalLines[lineIndex];

        if (!lineToCopy) return;

        try {
            await navigator.clipboard.writeText(lineToCopy);
            console.log('Line copied to clipboard');

            // '복사됨' 상태로 UI 즉시 업데이트
            this.lineCopyState = { ...this.lineCopyState, [lineIndex]: true };
            this.requestUpdate(); // LitElement에 UI 업데이트 요청

            // 기존 타임아웃이 있다면 초기화
            if (this.lineCopyTimeouts && this.lineCopyTimeouts[lineIndex]) {
                clearTimeout(this.lineCopyTimeouts[lineIndex]);
            }

            // ✨ 수정된 타임아웃: 1.5초 후 '복사됨' 상태 해제
            this.lineCopyTimeouts[lineIndex] = setTimeout(() => {
                const updatedState = { ...this.lineCopyState };
                delete updatedState[lineIndex];
                this.lineCopyState = updatedState;
                this.requestUpdate(); // UI 업데이트 요청
            }, 1500);
        } catch (err) {
            console.error('Failed to copy line:', err);
        }
    }

    async handleSendText(e, overridingText = '') {
        const textInput = this.shadowRoot?.getElementById('textInput');
        const text = (overridingText || textInput?.value || '').trim();
        // if (!text) return;

        textInput.value = '';

        // Add user message to conversation history
        if (text) {
            this.addToConversationHistory('user', text);
            
            // Activate focus lock - hide all messages except the latest exchange
            this.focusLock = true;
            this.classList.add('focus-lock');
            console.log('🔄 [Focus Lock] Activated - hiding all previous exchanges');
            
            // Wait for DOM update to ensure the new user message is rendered
            await this.updateComplete;
            
            // Clear any existing focus-visible classes from previous messages
            const conversationContainer = this.shadowRoot?.querySelector('.conversation-container');
            if (conversationContainer) {
                // Remove focus-visible from all previous messages
                const previousVisibleMessages = conversationContainer.querySelectorAll('.conversation-message.focus-visible');
                previousVisibleMessages.forEach(msg => {
                    msg.classList.remove('focus-visible');
                    console.log('🧹 [Focus Lock] Cleared focus-visible from previous message');
                });
                
                // Find and mark only the latest user message as visible
                // Use defensive DOM access to prevent crashes during rendering
                this.updateComplete.then(() => {
                    const conversationContainer = this.shadowRoot?.querySelector('.conversation-container');
                    if (conversationContainer) {
                        const userMessages = conversationContainer.querySelectorAll('.conversation-message.user');
                        this.lastUserMessage = userMessages[userMessages.length - 1];
                        
                        if (this.lastUserMessage && this.lastUserMessage.classList) {
                            this.lastUserMessage.classList.add('focus-visible');
                            console.log('📍 [Focus Lock] Latest user message marked as visible');
                        }
                    }
                });
            }
        }

        // Reset chunked TTS state when sending a new message
        // This ensures the first chunk of the new response will interrupt properly
        this.isChunkedTTSActive = false;
        this.chunkIndex = 0;
        this.chunkQueue = [];
        this.processingChunks = false;
        
        if (window.api) {
            window.api.askView.sendMessage(text).catch(error => {
                console.error('Error sending text:', error);
            });
        }
    }

    async handleMicClick() {
        try {
            console.log('[AskView] handleMicClick - isListening:', this.isListening);
            console.log('[AskView] window.askAudioCapture available:', !!window.askAudioCapture);
            
            if (this.isListening) {
                // Stop VAD conversation mode
                if (window.askAudioCapture) {
                    console.log('[AskView] Stopping VAD conversation mode');
                    await window.askAudioCapture.stopCapture();
                } else {
                    console.error('[AskView] No askAudioCapture available for stopping');
                }
            } else {
                // Start VAD conversation mode (VAD will manage STT internally)
                if (window.askAudioCapture) {
                    console.log('[AskView] Starting VAD conversation mode');
                    const captureStarted = await window.askAudioCapture.startCapture();
                    if (!captureStarted) {
                        console.error('[AskView] Failed to start audio capture');
                    }
                } else {
                    console.error('[AskView] VAD audio capture not available');
                }
            }
        } catch (error) {
            console.error('[AskView] Error handling mic click:', error);
        }
    }

    /**
     * Load conversation history from database
     */
    async loadConversationHistory() {
        try {
            console.log(`🔍 [Debug] loadConversationHistory called - loaded flag: ${this.conversationHistoryLoaded}, local history length: ${this.conversationHistory.length}`);
            
            // If we've already loaded conversation history in this session, don't reload
            // This prevents duplication when the component is reconnected
            if (this.conversationHistoryLoaded) {
                console.log(`[AskView] Conversation history already loaded in this session - skipping database load`);
                return;
            }

            if (window.api) {
                console.log(`🔍 [Debug] Loading conversation history from database...`);
                const result = await window.api.askView.loadConversationHistory();
                if (result.success) {
                    this.conversationHistory = result.conversationHistory || [];
                    this.conversationHistoryLoaded = true; // Mark as loaded
                    console.log(`[AskView] Loaded ${this.conversationHistory.length} conversation messages from database`);
                    this.requestUpdate();
                } else {
                    console.error('[AskView] Failed to load conversation history:', result.error);
                }
            }
        } catch (error) {
            console.error('[AskView] Error loading conversation history:', error);
        }
    }

    /**
     * Add a new message to conversation history
     */
    addToConversationHistory(role, content, timestamp = Date.now()) {
        console.log(`📝 [History] Adding ${role} message to conversation history (current length: ${this.conversationHistory.length}, focus lock: ${this.focusLock})`);
        console.log(`📝 [History] Content preview: "${content.substring(0, 50)}..."`);
        
        if (this.conversationHistory.some(msg => msg.role === role && msg.content.trim() === content.trim())) {
            console.warn(`[History] Duplicate message detected, skipping: "${content}"`);
            return; // Avoid adding duplicate messages
        }
        this.conversationHistory.push({
            id: `temp-${Date.now()}`,
            role,
            content,
            timestamp
        });
        console.log(`📝 [History] New conversation history length: ${this.conversationHistory.length}`);
        this.requestUpdate();
        
        // Only auto-scroll if focus lock is not active
        if (!this.focusLock) {
            this.scrollToBottom();
        }
    }

    /**
     * Render markdown content for conversation history
     */
    renderMarkdownContent(content) {
        if (!content) return '';
        
        try {
            // Check if content is already rendered HTML (contains KaTeX spans)
            if (content.includes('<span class="katex">') || content.includes('<math') || content.includes('<div') || content.includes('<p')) {
                console.log('[AskView] Content appears to be pre-rendered HTML, returning as-is');
                return content;
            }
            
            // Create a temporary container for rendering
            const tempContainer = document.createElement('div');
            
            // Process LaTeX first if available
            let processedContent = content;
            if (this.katex) {
                processedContent = this.renderLaTeX(content);
            }
            
            // Use the same renderer as the streaming markdown
            const renderer = default_renderer(tempContainer);
            const mdParser = parser(renderer);
            
            // Render the complete markdown content
            parser_write(mdParser, processedContent);
            parser_end(mdParser);
            
            // Apply code highlighting if available
            if (this.hljs) {
                tempContainer.querySelectorAll('pre code').forEach(block => {
                    try {
                        this.hljs.highlightElement(block);
                    } catch (e) {
                        console.warn('Code highlighting failed for block:', e);
                    }
                });
            }
            
            // Return the rendered HTML as a lit-html template
            return html`${tempContainer.innerHTML}`;
        } catch (error) {
            console.error('Error rendering markdown content:', error);
            return content; // Fallback to plain text
        }
    }

    /**
     * Render markdown content directly into a DOM element
     */
    renderMarkdownIntoElement(element, content) {
        if (!content || !element) return;
        
        try {
            console.log('[AskView] Rendering markdown into element, content preview:', content.substring(0, 100) + '...');
            
            // Clear the element first
            element.innerHTML = '';
            
            // Use the same rendering approach as streaming
            // This ensures LaTeX is processed correctly
            this.currentResponse = content; // Temporarily set for rendering
            this.renderStreamingMarkdown(element);
            this.currentResponse = ''; // Clear after rendering
            
            console.log('[AskView] Markdown rendering completed for conversation history using streaming approach');
        } catch (error) {
            console.error('[AskView] Error rendering markdown into element:', error);
            
            // Fallback to the old approach if streaming approach fails
            try {
                // Process LaTeX first if available
                let processedContent = content;
                if (this.katex) {
                    console.log('[AskView] Fallback: Processing LaTeX for conversation history...');
                    processedContent = this.renderLaTeX(content);
                }
                
                // Use the same renderer as the streaming markdown
                const renderer = default_renderer(element);
                const mdParser = parser(renderer);
                
                // Render the complete markdown content
                parser_write(mdParser, processedContent);
                parser_end(mdParser);
                
                // Apply code highlighting if available
                if (this.hljs) {
                    element.querySelectorAll('pre code').forEach(block => {
                        try {
                            this.hljs.highlightElement(block);
                        } catch (e) {
                            console.warn('Code highlighting failed for block:', e);
                        }
                    });
                }
            } catch (fallbackError) {
                console.error('[AskView] Fallback rendering also failed:', fallbackError);
                element.textContent = content; // Last resort fallback to plain text
            }
        }
    }

    /**
     * Scroll conversation container to bottom
     */
    scrollToBottom() {
        this.updateComplete.then(() => {
            const conversationContainer = this.shadowRoot.querySelector('.conversation-container');
            if (conversationContainer) {
                conversationContainer.scrollTop = conversationContainer.scrollHeight;
            }
        });
    }

    /**
     * Update voice activity indicator based on microphone input
     */
    updateVoiceActivity(isActive) {
        if (this.voiceActivity !== isActive) {
            this.voiceActivity = isActive;
            this.requestUpdate();
        }
    }

    /**
     * Speak the conversational response using OpenAI TTS
     */
    async speakConversationalResponse(text) {
        try {
            // If chunked TTS is active, skip the fallback conversational response
            if (this.isChunkedTTSActive) {
                console.log('[AskView] Skipping fallback conversational response - chunked TTS is active');
                return;
            }

            // Stop any currently playing speech
            this.stopSpeaking();

            if (!text || text.trim().length === 0) {
                console.warn('[AskView] No text to speak');
                return;
            }

            console.log('[AskView] Attempting to use OpenAI TTS for conversational response');
            
            // Try to use TTS service from main process
            const result = await window.api.voice.speakWithOpenAI(text, {
                voice: 'nova', // Change this to match your desired voice
                model: 'tts-1',
                speed: 1.6 // Speed multiplier (0.25 to 4.0, 1.0 = normal)
            });
            
            if (result.success) {
                console.log('[AskView] OpenAI TTS completed successfully');
            } else if (result.fallback) {
                console.log('[AskView] OpenAI TTS not available, falling back to Web Speech API');
                this.speakWithWebSpeechAPI(text);
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('[AskView] Error in OpenAI TTS:', error);
            
            // Fallback to Web Speech API
            console.log('[AskView] Falling back to Web Speech API');
            this.speakWithWebSpeechAPI(text);
        }
    }

    /**
     * Handle streaming conversational chunks for TTS
     * This enables faster voice response by speaking chunks as they arrive
     */
    async handleConversationalChunk(data) {
        const { text, isComplete } = data;
        
        if (!text || text.trim().length === 0) {
            console.log('[AskView] Empty chunk received, skipping');
            return;
        }

        console.log(`[AskView] Processing TTS chunk: "${text}" (complete: ${isComplete})`);
        
        try {
            // For the first chunk, stop any currently playing speech and initialize queue
            // IMPORTANT: Set flag IMMEDIATELY before any async operations to prevent race conditions
            const isFirstChunk = !this.isChunkedTTSActive;
            if (isFirstChunk) {
                console.log('[AskView] First chunk detected - initializing chunked TTS mode');
                this.isChunkedTTSActive = true; // Set IMMEDIATELY
                this.stopSpeaking();
                this.chunkQueue = [];
                this.chunkIndex = 0;
                this.processingChunks = false;
            }

            // Add chunk to queue for sequential processing
            const chunkData = { text, index: this.chunkIndex++, isComplete, isFirstChunk };
            this.chunkQueue.push(chunkData);
            console.log(`[AskView] Queued chunk ${chunkData.index} (isFirst: ${isFirstChunk}): "${text}"`);

            // Start processing queue if not already processing
            if (!this.processingChunks) {
                this.processChunkQueue();
            }
            
            // Reset chunked mode when complete
            if (isComplete) {
                console.log('[AskView] All chunks received, waiting for playback to complete');
            }
            
        } catch (error) {
            console.error('[AskView] Error processing TTS chunk:', error);
            
            // Fallback to Web Speech API
            this.speakWithWebSpeechAPI(text);
            
            if (isComplete) {
                this.isChunkedTTSActive = false;
            }
        }
    }

    async processChunkQueue() {
        if (this.processingChunks) return;
        this.processingChunks = true;

        try {
            // Pre-fetch queue for overlapping network requests
            const fetchQueue = [];
            let lastChunkWasComplete = false;
            
            while (this.chunkQueue.length > 0 || fetchQueue.length > 0) {
                // Pre-fetch next chunk while current is playing (max 2 chunks ahead)
                while (fetchQueue.length < 2 && this.chunkQueue.length > 0) {
                    const chunk = this.chunkQueue.shift();
                    console.log(`[AskView] Pre-fetching chunk ${chunk.index}: "${chunk.text}" (interrupt: ${chunk.isFirstChunk || false})`);
                    
                    // Start fetching but don't wait
                    const fetchPromise = window.api.voice.speakWithOpenAI(chunk.text, {
                        voice: 'nova',
                        model: 'tts-1',
                        speed: 1.1,
                        interrupt: chunk.isFirstChunk === true // Only interrupt for first chunk of new response
                    }).then(result => ({ chunk, result }));
                    
                    fetchQueue.push(fetchPromise);
                    lastChunkWasComplete = chunk.isComplete;
                }
                
                if (fetchQueue.length === 0) break;
                
                // Wait for next chunk to complete (network + playback)
                const { chunk, result } = await fetchQueue.shift();
                
                console.log(`[AskView] Finished speaking chunk ${chunk.index}:`, result);
                
                // Only use Web Speech fallback if explicitly flagged AND not successful
                if (!result.success) {
                    console.error('[AskView] TTS chunk failed:', result.error);
                    // Only fallback if explicitly requested (e.g., TTS service unavailable)
                    if (result.fallback) {
                        console.log('[AskView] Using Web Speech API fallback');
                        this.speakWithWebSpeechAPI(chunk.text);
                    }
                }
                
                // No artificial delay - next chunk is already pre-fetched
            }
            
            // Mark completion
            if (lastChunkWasComplete) {
                console.log('[AskView] Chunked TTS sequence completed');
                this.isChunkedTTSActive = false;
                this.chunkQueue = [];
                this.chunkIndex = 0;
            }
        } finally {
            this.processingChunks = false;
        }
    }

    /**
     * Fallback method using Web Speech API
     */
    speakWithWebSpeechAPI(text) {
        try {
            // Create speech utterance
            this.currentUtterance = new SpeechSynthesisUtterance(text);
            
            // Configure speech settings
            this.currentUtterance.rate = 1.0;
            this.currentUtterance.pitch = 1.0;
            this.currentUtterance.volume = 0.8;

            // Try to use a more natural voice if available
            const voices = this.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.name.includes('Samantha') || // macOS
                voice.name.includes('Zira') ||     // Windows
                voice.name.includes('Google') ||   // Chrome
                voice.lang.startsWith('en')
            );
            
            if (preferredVoice) {
                this.currentUtterance.voice = preferredVoice;
            }

            // Event handlers
            this.currentUtterance.onstart = () => {
                console.log('[AskView] Web Speech API started speaking');
            };

            this.currentUtterance.onend = () => {
                console.log('[AskView] Web Speech API finished speaking');
                this.currentUtterance = null;
            };

            this.currentUtterance.onerror = (event) => {
                console.error('[AskView] Web Speech API error:', event.error);
                this.currentUtterance = null;
            };

            // Speak using Web Speech API
            this.speechSynthesis.speak(this.currentUtterance);
            console.log('[AskView] Web Speech API speaking conversational response');

        } catch (error) {
            console.error('[AskView] Error in Web Speech API fallback:', error);
        }
    }

    /**
     * Stop any currently playing speech
     */
    stopSpeaking() {
        if (this.speechSynthesis && this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    }

    handleTextKeydown(e) {
        // Fix for IME composition issue: Ignore Enter key presses while composing.
        if (e.isComposing) {
            return;
        }

        const isPlainEnter = e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey;
        const isModifierEnter = e.key === 'Enter' && (e.metaKey || e.ctrlKey);

        if (isPlainEnter || isModifierEnter) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    willUpdate(changedProperties) {
        if (changedProperties.has('retrievalResults')) {
            const conversationContainer = this.shadowRoot?.querySelector('.conversation-container');
            if (conversationContainer) {
                this._prevConversationScrollTop = conversationContainer.scrollTop;
                const distanceFromBottom = conversationContainer.scrollHeight - (conversationContainer.scrollTop + conversationContainer.clientHeight);
                this._wasNearBottomBeforeRetrieval = distanceFromBottom <= 40;
            } else {
                this._prevConversationScrollTop = null;
                this._wasNearBottomBeforeRetrieval = true;
            }
        }
    }

    updated(changedProperties) {
        super.updated(changedProperties);
    
        // ✨ Defer renderContent() until after render cycle completes to prevent DOM manipulation conflicts
        if (changedProperties.has('isLoading') || changedProperties.has('currentResponse')) {
            this.updateComplete.then(() => {
                this.renderContent();
            });
        }
    
        if (
            changedProperties.has('showTextInput') ||
            changedProperties.has('isLoading') ||
            changedProperties.has('currentResponse') ||
            changedProperties.has('retrievalResults')
        ) {
            this.adjustWindowHeightThrottled();
        }

        if (changedProperties.has('showTextInput') && this.showTextInput) {
            this.focusTextInput();
        }

        if (changedProperties.has('retrievalResults')) {
            this.updateComplete.then(() => {
                const conversationContainer = this.shadowRoot?.querySelector('.conversation-container');
                if (!conversationContainer) {
                    return;
                }

                if (this._wasNearBottomBeforeRetrieval) {
                    conversationContainer.scrollTop = conversationContainer.scrollHeight;
                } else if (typeof this._prevConversationScrollTop === 'number') {
                    conversationContainer.scrollTop = this._prevConversationScrollTop;
                }

                this._prevConversationScrollTop = null;
                this._wasNearBottomBeforeRetrieval = true;
            });
        }

        // Render markdown content for assistant messages in conversation history
        this.conversationHistory.forEach((message, index) => {
            if (message.role === 'assistant') {
                const element = this.shadowRoot.querySelector(`#history-message-${index}`);
                if (element && !element.dataset.rendered) {
                    this.renderMarkdownIntoElement(element, message.content);
                    element.dataset.rendered = 'true';
                }
            }
        });
    }

    firstUpdated() {
        setTimeout(() => this.adjustWindowHeight(), 200);
    }


    getTruncatedQuestion(question, maxLength = 30) {
        if (!question) return '';
        if (question.length <= maxLength) return question;
        return question.substring(0, maxLength) + '...';
    }



    render() {
        const hasResponse = this.isLoading || this.currentResponse || this.isStreaming;
        const headerText = this.isLoading ? 'Thinking...' : 'AI Response';
        const hasConversation = this.conversationHistory.length > 0 || hasResponse || (this.retrievalResults && this.retrievalResults.length > 0);

        // Only show current response if it's not already in conversation history
        const shouldShowCurrentResponse = hasResponse && (
            !this.currentResponse || 
            !this.conversationHistory.some(msg => msg.role === 'assistant' && msg.content.trim() === this.currentResponse.trim())
        );

        return html`
            <div class="ask-container">
                <!-- Response Header -->
                <div class="response-header ${!hasConversation ? 'hidden' : ''}">
                    <div class="header-left">
                        <div class="response-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                                <path d="M8 12l2 2 4-4" />
                            </svg>
                        </div>
                        <span class="response-label">${headerText}</span>
                    </div>
                    <div class="header-right">
                        <span class="question-text">${this.getTruncatedQuestion(this.currentQuestion)}</span>
                        <div class="header-controls">
                            <button class="copy-button ${this.copyState === 'copied' ? 'copied' : ''}" @click=${this.handleCopy}>
                                <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                                <svg
                                    class="check-icon"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            </button>
                            <button class="close-button" @click=${this.handleCloseAskWindow}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Unified Conversation Container -->
                <div class="conversation-container ${!hasConversation ? 'hidden' : ''}" id="conversationContainer">
                    ${this.renderRetrievalContext()}
                    <!-- Conversation History -->
                    ${(() => {
                        return this.conversationHistory.map((message, index) => html`
                            <div class="conversation-message ${message.role}">
                                <div class="conversation-message-content" id="history-message-${index}" data-message-index="${index}" data-role="${message.role}">
                                    ${message.role === 'assistant' ? '' : message.content}
                                </div>
                            </div>
                        `);
                    })()}
                    
                    <!-- Current Response (if active and not duplicated) -->
                    ${shouldShowCurrentResponse ? html`
                        <div class="conversation-message assistant current-response">
                            <div class="conversation-message-content" id="currentResponseContent">
                                ${this.isLoading ? html`
                                    <div class="loading-dots">
                                        <div class="loading-dot"></div>
                                        <div class="loading-dot"></div>
                                        <div class="loading-dot"></div>
                                    </div>
                                ` : ''}
                                <!-- Content is dynamically generated in updateResponseContent() -->
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Text Input Container -->
                <div class="text-input-container ${!hasConversation ? 'no-response' : ''} ${!this.showTextInput ? 'hidden' : ''}">
                    <div style="display: flex; align-items: center; width: 100%;">
                        <!-- Microphone Button -->
                        <button
                            class="mic-button ${this.isListening ? 'listening' : ''}"
                            @click=${this.handleMicClick}
                            title="${this.isListening ? 'Stop voice input' : 'Start voice input'}"
                        >
                            <!-- Voice activity indicator -->
                            <div class="voice-indicator ${this.voiceActivity ? 'active' : ''}"></div>
                            
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                ${this.isListening ? html`
                                    <!-- Stop/Square icon when listening -->
                                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                                ` : html`
                                    <!-- Microphone icon when not listening -->
                                    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                `}
                            </svg>
                        </button>

                        <input
                            type="text"
                            id="textInput"
                            placeholder="${this.isListening ? 'Listening...' : ' Ask me anything!'}"
                            @keydown=${this.handleTextKeydown}
                            @focus=${this.handleInputFocus}
                            ?disabled=${this.isListening}
                            style="flex: 1;"
                        />
                        <button
                            class="submit-btn"
                            @click=${this.handleSendText}
                            ?disabled=${this.isListening}
                        >
                            <span class="btn-label">Submit</span>
                            <span class="btn-icon">
                                ↵
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderRetrievalContext() {
        if (!this.retrievalResults || this.retrievalResults.length === 0) {
            return null;
        }

        const total = this.retrievalResults.length;
        const items = this.retrievalResults.slice(0, 1);
        const usingCount = Math.min(5, total);

        return html`
            <div class="retrieval-context">
                <div class="retrieval-context__header">
                    <span>Document Context</span>
                    <span>Using ${usingCount}${total > 1 ? ', showing best match' : ''}</span>
                </div>
                <div class="retrieval-context__list">
                    ${items.map((chunk, index) => {
                        const metadata = chunk.metadata || {};
                        const title = metadata.title || metadata.filename || `Source ${index + 1}`;
                        const score = typeof chunk.score === 'number' ? chunk.score : null;
                        const body = (chunk.content || '').trim();
                        const displayBody = body.length > 400 ? `${body.slice(0, 400)}…` : body;

                        return html`
                            <div class="retrieval-context__item">
                                <div class="retrieval-context__title">
                                    <span>${index + 1}. ${title}</span>
                                    ${score !== null ? html`<span class="retrieval-context__score">${score.toFixed(2)}</span>` : ''}
                                </div>
                                <div class="retrieval-context__body">${displayBody}</div>
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }

    // Dynamically resize the BrowserWindow to fit current content
    adjustWindowHeight() {
        // Skip window resizing in embedded mode (sidebar manages its own height)
        if (this.embedded) {
            return;
        }
        
        if (!window.api) return;

        this.updateComplete.then(() => {
            const headerEl = this.shadowRoot.querySelector('.response-header');
            const conversationEl = this.shadowRoot.querySelector('.conversation-container');
            const inputEl = this.shadowRoot.querySelector('.text-input-container');

            if (!headerEl || !conversationEl) return;

            const headerHeight = headerEl.classList.contains('hidden') ? 0 : headerEl.offsetHeight;
            const inputHeight = (inputEl && !inputEl.classList.contains('hidden')) ? inputEl.offsetHeight : 0;
            
            // Ensure conversation content doesn't exceed reasonable bounds
            const maxConversationHeight = 580; // Conservative max to always leave room for input
            const conversationHeight = Math.min(conversationEl.scrollHeight, maxConversationHeight);
            
            const targetHeight = Math.min(700, headerHeight + conversationHeight + inputHeight);

            window.api.askView.adjustWindowHeight("ask", targetHeight);

        }).catch(err => console.error('AskView adjustWindowHeight error:', err));
    }

    // Throttled wrapper to avoid excessive IPC spam (executes at most once per animation frame)
    adjustWindowHeightThrottled() {
        if (this.isThrottled) return;

        this.isThrottled = true;
        requestAnimationFrame(() => {
            this.adjustWindowHeight();
            this.isThrottled = false;
        });
    }
}

customElements.define('ask-view', AskView);
