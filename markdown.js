(function (global) {
    'use strict';

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(str) {
        return escapeHtml(str);
    }

    function isSafeHttpUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Renders a safe subset of Discord markdown to HTML.
     * Escapes all raw HTML first, then formats code blocks, inline code,
     * masked links, bold, italic, underline, strikethrough, spoilers, quotes, and headings.
     */
    function renderDiscordMarkdown(rawText, options = {}) {
        if (!rawText) return '';
        const { allowLinks = false, allowHeadings = true } = options;

        const placeholders = [];
        const stash = (html) => {
            const idx = placeholders.length;
            placeholders.push(html);
            return `\u0000MD${idx}\u0000`;
        };

        let text = rawText.replace(/\r\n?/g, '\n');

        // Extract fenced code blocks first so inner markdown is not parsed
        text = text.replace(/```(?:[a-zA-Z0-9_-]+\n)?([\s\S]*?)```/g, (_, code) => {
            const trimmed = code.replace(/^\n|\n$/g, '');
            return stash(`<code class="md-codeblock">${escapeHtml(trimmed)}</code>`);
        });

        // Extract inline code
        text = text.replace(/`([^`\n]+)`/g, (_, code) => {
            return stash(`<code class="md-inline-code">${escapeHtml(code)}</code>`);
        });

        // Escape remaining HTML before inline/block formatting
        text = escapeHtml(text);

        // Masked links [label](https://...) (Discord embeds & messages support masked links)
        if (allowLinks) {
            text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
                // Unescape &amp; inside URL check
                const rawUrl = url.replace(/&amp;/g, '&');
                if (!isSafeHttpUrl(rawUrl)) return match;
                return stash(`<a class="md-link" href="${escapeAttr(rawUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`);
            });
        }

        // Auto-link bare http/https URLs
        text = text.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (match, prefix, url) => {
            const rawUrl = url.replace(/&amp;/g, '&');
            if (!isSafeHttpUrl(rawUrl)) return match;
            return prefix + stash(`<a class="md-link" href="${escapeAttr(rawUrl)}" target="_blank" rel="noopener noreferrer">${url}</a>`);
        });

        // Process line-level headings and blockquotes
        const lines = text.split('\n').map(line => {
            if (allowHeadings) {
                if (/^###\s+(.+)$/.test(line)) {
                    return line.replace(/^###\s+(.+)$/, '<span class="md-h3">$1</span>');
                }
                if (/^##\s+(.+)$/.test(line)) {
                    return line.replace(/^##\s+(.+)$/, '<span class="md-h2">$1</span>');
                }
                if (/^#\s+(.+)$/.test(line)) {
                    return line.replace(/^#\s+(.+)$/, '<span class="md-h1">$1</span>');
                }
            }
            if (/^&gt;\s?(.*)$/.test(line)) {
                return line.replace(/^&gt;\s?(.*)$/, '<span class="md-quote">$1</span>');
            }
            return line;
        });
        text = lines.join('\n');

        // Inline styles (order matters: *** before ** before *)
        text = text.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        text = text.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
        text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
        text = text.replace(/(^|[^a-zA-Z0-9_])_([^_\n]+)_([^a-zA-Z0-9_]|$)/g, '$1<em>$2</em>$3');
        text = text.replace(/~~([\s\S]+?)~~/g, '<del>$1</del>');
        text = text.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="md-spoiler" role="button" tabindex="0" title="Click to reveal spoiler">$1</span>');

        // Restore stashed HTML tokens
        text = text.replace(/\u0000MD(\d+)\u0000/g, (_, i) => placeholders[Number(i)]);

        // Collapse trailing newline after block-level markdown elements so pre-wrap doesn't double-space
        text = text.replace(/(<code class="md-codeblock">[\s\S]*?<\/code>)\n/g, '$1');
        text = text.replace(/(<span class="md-(?:h[123]|quote)">[\s\S]*?<\/span>)\n/g, '$1');

        return text;
    }

    global.HookCordMarkdown = {
        escapeHtml,
        escapeAttr,
        isSafeHttpUrl,
        renderDiscordMarkdown
    };
})(window);
