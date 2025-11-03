import { parser, parser_end, parser_write, default_renderer } from '../../assets/smd.js';

const DEFAULT_ASSET_PATHS = [
    '../assets/',
    '../../assets/',
    '../../../assets/',
    './assets/',
    'assets/',
    '/assets/',
];

const detectedAssetBase = (() => {
    try {
        const existingMarked = document?.querySelector?.('script[src*="marked-4.3.0.min.js"]');
        if (existingMarked) {
            const src = existingMarked.getAttribute('src');
            if (src) {
                const url = new URL(src, window.location.href);
                url.pathname = url.pathname.replace(/[^/]*$/, '');
                return url.href;
            }
        }
    } catch (_) {
        /* no-op */
    }
    return null;
})();

const ASSET_BASES = (() => {
    const bases = [];
    const append = url => {
        if (!url) return;
        if (!url.endsWith('/')) {
            url += '/';
        }
        if (!bases.includes(url)) {
            bases.push(url);
        }
    };

    if (detectedAssetBase) {
        append(detectedAssetBase);
    }

    DEFAULT_ASSET_PATHS.forEach(path => {
        try {
            const url = new URL(path, window.location.href).href;
            append(url);
        } catch (_) {
            /* no-op */
        }
    });

    return bases;
})();

const state = {
    loadPromise: null,
    katexPromise: null,
    marked: null,
    hljs: null,
    DOMPurify: null,
    katex: null,
    domPurifyConfig: buildDomPurifyConfig(),
};

if (typeof window !== 'undefined') {
    window.__raniMarkdownDebug = () => ({
        bases: [...ASSET_BASES],
        state: {
            markedLoaded: !!state.marked,
            hljsLoaded: !!state.hljs,
            domPurifyLoaded: !!state.DOMPurify,
            katexLoaded: !!state.katex,
            hasLoadPromise: !!state.loadPromise,
            hasKatexPromise: !!state.katexPromise,
        },
    });
}

function buildDomPurifyConfig() {
    return {
        ALLOWED_TAGS: false,
        ADD_TAGS: [
            'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac',
            'msqrt', 'mroot', 'mtext', 'mspace', 'mpadded', 'mphantom', 'mfenced',
            'menclose', 'mstyle', 'munder', 'mover', 'munderover', 'mmultiscripts',
            'mtable', 'mtr', 'mtd', 'mlabeledtr', 'maligngroup', 'malignmark', 'maction',
            'annotation', 'annotation-xml'
        ],
        ALLOWED_ATTR: false,
        ADD_ATTR: [
            'style', 'mathvariant', 'mathsize', 'mathcolor', 'mathbackground', 'dir',
            'fontfamily', 'fontsize', 'fontweight', 'fontstyle', 'displaystyle',
            'scriptlevel', 'rowspan', 'columnspan', 'rowalign', 'columnalign',
            'groupalign', 'alignmentscope', 'columnwidth', 'width', 'rowspacing',
            'columnspacing', 'rowlines', 'columnlines', 'frame', 'framespacing',
            'equalrows', 'equalcolumns', 'side', 'minlabelspacing', 'accent',
            'accentunder', 'align', 'numalign', 'denomalign', 'bevelled',
            'linethickness', 'notation', 'selection', 'open', 'close', 'separators',
            'subscriptshift', 'superscriptshift', 'lspace', 'rspace', 'stretchy',
            'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits',
            'separator', 'fence', 'form', 'infix', 'prefix', 'postfix', 'encoding',
            'aria-hidden'
        ],
        ALLOW_DATA_ATTR: true,
        ALLOW_ARIA_ATTR: true,
        KEEP_CONTENT: true,
    };
}

const scriptPromises = new Map();
const cssPromises = new Map();

function isScriptLoaded(existing, globalCheck) {
    if (!existing) {
        return false;
    }
    if (existing.dataset?.loaded === 'true' || existing.getAttribute?.('data-loaded') === 'true') {
        return true;
    }
    if (typeof existing.readyState === 'string') {
        const state = existing.readyState.toLowerCase();
        if (state === 'loaded' || state === 'complete') {
            return true;
        }
    }
    if (typeof globalCheck === 'function') {
        try {
            if (globalCheck()) {
                return true;
            }
        } catch (_) {
            /* no-op */
        }
    }
    return false;
}

function loadScriptSequential(file, globalCheck) {
    if (scriptPromises.has(file)) {
        return scriptPromises.get(file);
    }

    const promise = (async () => {
        try {
            const existing = Array.from(document.querySelectorAll('script[src]')).find(script => {
                const src = script.getAttribute('src');
                return src && src.includes(file);
            });

            if (isScriptLoaded(existing, globalCheck)) {
                return;
            }

            if (existing) {
                await new Promise((resolve, reject) => {
                    existing.addEventListener('load', () => {
                        existing.dataset.loaded = 'true';
                        resolve();
                    }, { once: true });
                    existing.addEventListener('error', reject, { once: true });
                });
                return;
            }
        } catch (_) {
            /* allow fallback */
        }

        let lastError = null;
        for (const base of ASSET_BASES) {
            try {
                const url = new URL(file, base).href;
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.dataset.loaded = 'false';
                    script.addEventListener('load', () => {
                        script.dataset.loaded = 'true';
                        resolve();
                    }, { once: true });
                    script.addEventListener('error', () => {
                        script.remove();
                        reject(new Error(`Failed to load ${url}`));
                    }, { once: true });
                    document.head.appendChild(script);
                });
                if (typeof globalCheck === 'function' && !globalCheck()) {
                    continue;
                }
                return;
            } catch (error) {
                lastError = error;
            }
        }

        if (lastError) {
            throw lastError;
        }
    })();

    scriptPromises.set(file, promise);
    return promise;
}

function loadCSSSequential(file) {
    if (cssPromises.has(file)) {
        return cssPromises.get(file);
    }

    const promise = (async () => {
        try {
            const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(link => {
                const href = link.getAttribute('href');
                return href && href.includes(file);
            });
            if (existing) {
                return;
            }
        } catch (_) {
            /* continue */
        }

        let lastError = null;
        for (const base of ASSET_BASES) {
            try {
                const url = new URL(file, base).href;
                await new Promise((resolve, reject) => {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = url;
                    link.addEventListener('load', resolve, { once: true });
                    link.addEventListener('error', () => {
                        link.remove();
                        reject(new Error(`Failed to load ${url}`));
                    }, { once: true });
                    document.head.appendChild(link);
                });
                return;
            } catch (error) {
                lastError = error;
            }
        }

        if (lastError) {
            throw lastError;
        }
    })();

    cssPromises.set(file, promise);
    return promise;
}

async function ensureCoreLibraries() {
    if (state.loadPromise) {
        return state.loadPromise;
    }

    state.loadPromise = (async () => {
        if (!window.marked) {
            await loadScriptSequential('marked-4.3.0.min.js', () => !!window.marked);
        }
        if (!window.hljs) {
            await loadScriptSequential('highlight-11.9.0.min.js', () => !!window.hljs);
        }
        if (!window.DOMPurify) {
            await loadScriptSequential('dompurify-3.0.7.min.js', () => !!window.DOMPurify);
        }

        state.marked = window.marked || null;
        state.hljs = window.hljs || null;
        state.DOMPurify = window.DOMPurify || null;

        if (state.marked && state.hljs) {
            state.marked.setOptions({
                highlight: (code, lang) => {
                    if (lang && state.hljs.getLanguage(lang)) {
                        try {
                            return state.hljs.highlight(code, { language: lang }).value;
                        } catch (_) {
                            /* no-op */
                        }
                    }
                    try {
                        return state.hljs.highlightAuto(code).value;
                    } catch (_) {
                        return code;
                    }
                },
                breaks: true,
                gfm: true,
                pedantic: false,
                smartypants: false,
                xhtml: false,
            });
        }

        return state;
    })().catch(error => {
        state.loadPromise = null;
        throw error;
    });

    return state.loadPromise;
}

async function ensureKatex() {
    if (state.katex || window.katex) {
        state.katex = state.katex || window.katex || null;
        if (state.katex) {
            return state.katex;
        }
    }
    if (state.katexPromise) {
        return state.katexPromise;
    }

    state.katexPromise = (async () => {
        await loadScriptSequential('katex.min.js', () => !!window.katex);
        await loadCSSSequential('katex.min.css');
        state.katex = window.katex || null;
        return state.katex;
    })().catch(error => {
        state.katexPromise = null;
        throw error;
    });

    return state.katexPromise;
}

export async function ensureMarkdown({ katex = true } = {}) {
    await ensureCoreLibraries();
    if (katex) {
        await ensureKatex();
    }
    return getMarkdownState();
}

export function getMarkdownState() {
    return {
        marked: state.marked,
        hljs: state.hljs,
        DOMPurify: state.DOMPurify,
        katex: state.katex,
        domPurifyConfig: state.domPurifyConfig,
    };
}

function renderFormula(source, displayMode, katexInstance) {
    try {
        return katexInstance.renderToString(source.trim(), {
            displayMode,
            throwOnError: false,
            trust: false,
            strict: false,
        });
    } catch (_) {
        return source;
    }
}

export function renderLaTeX(text, katexOverride) {
    if (!text) {
        return '';
    }

    const katexInstance = katexOverride || state.katex;
    if (!katexInstance) {
        return text;
    }

    let output = text;

    output = output.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => renderFormula(latex, true, katexInstance));
    output = output.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => renderFormula(latex, true, katexInstance));

    const inlinePattern = /(?<!\$)\$(?!\$)([\s\S]*?)(?<!\\)\$(?!\$)/g;
    output = output.replace(inlinePattern, (match, latex) => {
        const trimmed = latex.trim();
        if (!trimmed) {
            return match;
        }
        if (/^\s*\d/.test(trimmed) || /^\s*(USD|EUR|GBP|JPY|CAD|AUD|CHF|price|cost|dollar)/i.test(trimmed)) {
            return match;
        }
        return renderFormula(trimmed, false, katexInstance);
    });

    output = output.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => renderFormula(latex, false, katexInstance));

    return output;
}

export async function renderMarkdownToString(text, { sanitize = true, latex = true, returnMeta = false } = {}) {
    if (!text) {
        return '';
    }

    await ensureMarkdown({ katex: latex });
    if (!state.marked) {
        return text;
    }

    let working = text;
    if (latex) {
        working = renderLaTeX(working);
    }

    const html = state.marked.parse(working);

    if (!sanitize || !state.DOMPurify) {
        return returnMeta ? { html, removed: [] } : html;
    }

    state.DOMPurify.removed = [];
    const sanitized = state.DOMPurify.sanitize(html, state.domPurifyConfig);
    const removed = Array.isArray(state.DOMPurify.removed) ? [...state.DOMPurify.removed] : [];

    return returnMeta ? { html: sanitized, removed } : sanitized;
}

export function highlightCodeBlocks(root) {
    if (!root || !state.hljs) {
        return;
    }
    root.querySelectorAll('pre code').forEach(block => {
        if (block.hasAttribute('data-highlighted')) {
            return;
        }
        try {
            state.hljs.highlightElement(block);
            block.setAttribute('data-highlighted', 'true');
        } catch (_) {
            /* no-op */
        }
    });
}

export function createStreamingRenderer(container, { latex = true } = {}) {
    let parserInstance = null;
    let parserContainer = null;
    let lastLength = 0;

    const ensureParser = () => {
        if (!parserInstance || parserContainer !== container) {
            parserContainer = container;
            parserInstance = parser(default_renderer(container));
            lastLength = 0;
        }
    };

    return {
        async update(text, { streaming = true, finalize = false } = {}) {
            await ensureMarkdown({ katex: latex });

            if (!streaming) {
                const html = await renderMarkdownToString(text, { latex });
                container.innerHTML = html;
                highlightCodeBlocks(container);
                return;
            }

            ensureParser();

            const source = latex ? renderLaTeX(text) : text;
            const chunk = source.slice(lastLength);
            if (chunk) {
                parser_write(parserInstance, chunk);
                lastLength = source.length;
            }

            if (finalize) {
                parser_end(parserInstance);
                parserInstance = null;
                parserContainer = null;
                lastLength = 0;
                highlightCodeBlocks(container);
            }
        },
        reset() {
            parserInstance = null;
            parserContainer = null;
            lastLength = 0;
        },
    };
}

export function sanitizeHtml(html, { latex = false } = {}) {
    if (!html) {
        return '';
    }

    if (latex) {
        html = renderLaTeX(html);
    }

    if (!state.DOMPurify) {
        return html;
    }

    state.DOMPurify.removed = [];
    return state.DOMPurify.sanitize(html, state.domPurifyConfig);
}
