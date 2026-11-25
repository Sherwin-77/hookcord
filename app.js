(function () {
    'use strict';

    const { escapeHtml, escapeAttr, isSafeHttpUrl, renderDiscordMarkdown } = window.HookCordMarkdown;

    // ===== Constants =====
    const STORAGE_KEY_URL = 'hookcord_webhook_url';
    const MAX_CONTENT_CHARS = 2000;
    const MAX_EMBED_DESC_CHARS = 4096;
    const MAX_EMBED_TOTAL_CHARS = 6000;
    const MAX_EMBED_FIELDS = 25;
    const MAX_FILE_BYTES = 25 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const WEBHOOK_URL_REGEX = /^https:\/\/(?:(?:ptb|canary)\.)?(?:discord|discordapp)\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+(?:\?[^\s]*)?$/;

    // ===== DOM References =====
    const $ = id => document.getElementById(id);

    const webhookUrl = $('webhook-url');
    const btnToggleUrl = $('btn-toggle-url');
    const iconEye = $('icon-eye');
    const iconEyeOff = $('icon-eye-off');
    const urlValidation = $('url-validation');
    const toggleRemember = $('toggle-remember');
    const overrideUsername = $('override-username');
    const overrideAvatar = $('override-avatar');
    const msgContent = $('msg-content');
    const contentCounter = $('content-counter');

    const btnToggleEmbed = $('btn-toggle-embed');
    const embedSection = $('embed-section');
    const embedChevron = $('embed-chevron');
    const embedTotalCounter = $('embed-total-counter');
    const embedTitle = $('embed-title');
    const embedUrl = $('embed-url');
    const embedDesc = $('embed-desc');
    const descCounter = $('desc-counter');
    const embedColorPicker = $('embed-color-picker');
    const embedColorHex = $('embed-color-hex');
    const embedAuthorName = $('embed-author-name');
    const embedAuthorUrl = $('embed-author-url');
    const embedAuthorIcon = $('embed-author-icon');
    const embedThumbnail = $('embed-thumbnail');
    const embedImageUrl = $('embed-image-url');
    const embedImageOverrideHint = $('embed-image-override-hint');
    const embedFooterText = $('embed-footer-text');
    const embedFooterIcon = $('embed-footer-icon');
    const toggleTimestamp = $('toggle-timestamp');
    const fieldsContainer = $('fields-container');
    const btnAddField = $('btn-add-field');

    const dropzone = $('dropzone');
    const dropzoneContent = $('dropzone-content');
    const dropzonePreview = $('dropzone-preview');
    const fileThumb = $('file-thumb');
    const fileName = $('file-name');
    const fileSize = $('file-size');
    const fileInput = $('file-input');
    const btnRemoveFile = $('btn-remove-file');
    const embedAttachOption = $('embed-attach-option');
    const toggleAttachInEmbed = $('toggle-attach-in-embed');

    const btnSend = $('btn-send');
    const sendLabel = $('send-label');
    const sendValidationMsg = $('send-validation-msg');
    const btnJson = $('btn-json');
    const jsonViewer = $('json-viewer');
    const jsonOutput = $('json-output');
    const btnCopyJson = $('btn-copy-json');
    const btnReset = $('btn-reset');
    const toast = $('toast');

    // Preview elements
    const discordPreview = $('discord-preview');
    const previewAvatar = $('preview-avatar');
    const previewUsername = $('preview-username');
    const previewTimestamp = $('preview-timestamp');
    const previewContent = $('preview-content');
    const previewEmbedWrap = $('preview-embed-wrap');
    const previewEmbedBar = $('preview-embed-bar');
    const previewEmbedAuthor = $('preview-embed-author');
    const previewAuthorIcon = $('preview-author-icon');
    const previewAuthorName = $('preview-author-name');
    const previewEmbedTitle = $('preview-embed-title');
    const previewEmbedDesc = $('preview-embed-desc');
    const previewEmbedFields = $('preview-embed-fields');
    const previewEmbedThumb = $('preview-embed-thumb');
    const previewEmbedImage = $('preview-embed-image');
    const previewEmbedFooter = $('preview-embed-footer');
    const previewFooterIcon = $('preview-footer-icon');
    const previewFooterText = $('preview-footer-text');
    const previewFooterSep = $('preview-footer-sep');
    const previewFooterTimestamp = $('preview-footer-timestamp');
    const previewAttachment = $('preview-attachment');
    const previewAttachmentImg = $('preview-attachment-img');
    const previewEmpty = $('preview-empty');

    const optionalUrlInputs = [
        { el: overrideAvatar, label: 'Avatar URL' },
        { el: embedUrl, label: 'Embed Title URL' },
        { el: embedAuthorUrl, label: 'Embed Author URL' },
        { el: embedAuthorIcon, label: 'Embed Author Icon URL' },
        { el: embedThumbnail, label: 'Embed Thumbnail URL' },
        { el: embedImageUrl, label: 'Embed Image URL' },
        { el: embedFooterIcon, label: 'Embed Footer Icon URL' }
    ];

    // ===== State =====
    let attachedFile = null;
    let fileObjectUrl = null;
    let attachInEmbed = true;
    let embedFields = [];
    let fieldIdCounter = 0;
    let isSending = false;
    let lastAvatarUrl = '';

    // ===== Init =====
    function init() {
        previewTimestamp.textContent = formatDiscordTime(new Date());

        const remembered = localStorage.getItem(STORAGE_KEY_URL);
        if (remembered) {
            webhookUrl.value = remembered;
            setToggleState(toggleRemember, true);
        }

        bindEvents();
        updateCounters();
        updatePreview();
        updateSendState();
    }

    // ===== Event Binding =====
    function bindEvents() {
        // URL toggle visibility
        btnToggleUrl.addEventListener('click', () => {
            const isPassword = webhookUrl.type === 'password';
            webhookUrl.type = isPassword ? 'text' : 'password';
            iconEye.classList.toggle('hidden', !isPassword);
            iconEyeOff.classList.toggle('hidden', isPassword);
        });

        // Webhook URL input + Remember sync
        webhookUrl.addEventListener('input', () => {
            if (isToggleActive(toggleRemember)) {
                const trimmed = webhookUrl.value.trim();
                if (trimmed) {
                    localStorage.setItem(STORAGE_KEY_URL, trimmed);
                } else {
                    localStorage.removeItem(STORAGE_KEY_URL);
                }
            }
            updateSendState();
        });

        // Remember toggle
        bindToggleKeySupport(toggleRemember, toggleRememberUrl);
        toggleRemember.addEventListener('click', toggleRememberUrl);

        // Message content
        msgContent.addEventListener('input', () => {
            updateContentCounter();
            updatePreview();
            updateSendState();
        });

        // Embed collapsible toggle
        btnToggleEmbed.addEventListener('click', () => {
            const isCollapsed = embedSection.classList.contains('collapsed');
            embedSection.classList.toggle('collapsed', !isCollapsed);
            btnToggleEmbed.setAttribute('aria-expanded', String(isCollapsed));
            embedChevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        // Embed inputs -> preview & validation
        [
            embedTitle, embedUrl, embedDesc, embedAuthorName, embedAuthorUrl,
            embedAuthorIcon, embedThumbnail, embedImageUrl, embedFooterText, embedFooterIcon
        ].forEach(el => {
            el.addEventListener('input', () => {
                updateEmbedTotalCounter();
                updatePreview();
                updateSendState();
            });
        });

        embedDesc.addEventListener('input', updateDescCounter);

        // Color sync
        embedColorPicker.addEventListener('input', () => {
            embedColorHex.value = embedColorPicker.value;
            embedColorHex.classList.remove('input-invalid');
            updatePreview();
            updateSendState();
        });

        embedColorHex.addEventListener('input', () => {
            const normalized = normalizeHexColor(embedColorHex.value);
            if (normalized) {
                embedColorPicker.value = normalized;
                embedColorHex.classList.remove('input-invalid');
            } else if (embedColorHex.value.trim()) {
                embedColorHex.classList.add('input-invalid');
            } else {
                embedColorHex.classList.remove('input-invalid');
            }
            updatePreview();
            updateSendState();
        });

        embedColorHex.addEventListener('blur', () => {
            const normalized = normalizeHexColor(embedColorHex.value);
            if (normalized) {
                embedColorHex.value = normalized;
                embedColorHex.classList.remove('input-invalid');
            }
        });

        // Timestamp toggle
        bindToggleKeySupport(toggleTimestamp, () => toggleTimestamp.click());
        toggleTimestamp.addEventListener('click', () => {
            const isActive = toggleTimestamp.classList.toggle('active');
            toggleTimestamp.setAttribute('aria-checked', String(isActive));
            updatePreview();
            updateSendState();
        });

        // Add field
        btnAddField.addEventListener('click', addField);

        // File dropzone
        dropzone.addEventListener('click', e => {
            if (e.target.closest('#btn-remove-file')) return;
            fileInput.click();
        });
        dropzone.addEventListener('keydown', e => {
            if (e.target !== dropzone) return;
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                fileInput.click();
            }
        });
        dropzone.addEventListener('dragover', e => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', e => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) handleFile(fileInput.files[0]);
        });
        btnRemoveFile.addEventListener('click', e => {
            e.stopPropagation();
            removeFile();
        });

        // Paste image from clipboard anywhere on page
        document.addEventListener('paste', e => {
            const files = e.clipboardData && e.clipboardData.files;
            if (files && files.length && ALLOWED_IMAGE_TYPES.includes(files[0].type)) {
                e.preventDefault();
                handleFile(files[0]);
            }
        });

        // Attach-in-embed toggle
        bindToggleKeySupport(toggleAttachInEmbed, () => toggleAttachInEmbed.click());
        toggleAttachInEmbed.addEventListener('click', () => {
            attachInEmbed = !attachInEmbed;
            setToggleState(toggleAttachInEmbed, attachInEmbed);
            syncImageOverrideState();
            updatePreview();
            updateSendState();
        });

        // Identity overrides
        overrideUsername.addEventListener('input', () => {
            updatePreview();
            updateSendState();
        });
        overrideAvatar.addEventListener('input', () => {
            updatePreview();
            updateSendState();
        });

        // Send
        btnSend.addEventListener('click', sendWebhook);

        // JSON toggle
        btnJson.addEventListener('click', () => {
            const willShow = jsonViewer.classList.contains('hidden');
            jsonViewer.classList.toggle('hidden', !willShow);
            btnJson.setAttribute('aria-expanded', String(willShow));
            if (willShow) {
                updateJsonView();
            }
        });

        // Copy JSON
        btnCopyJson.addEventListener('click', copyJsonToClipboard);

        // Reset
        btnReset.addEventListener('click', resetAll);

        // Preview image graceful error fallbacks
        [previewAuthorIcon, previewEmbedThumb, previewEmbedImage, previewFooterIcon].forEach(img => {
            img.addEventListener('error', () => {
                img.classList.add('hidden');
            });
        });

        // Spoiler click/keyboard reveal in preview
        discordPreview.addEventListener('click', e => {
            const spoiler = e.target.closest('.md-spoiler');
            if (spoiler) spoiler.classList.toggle('revealed');
        });
        discordPreview.addEventListener('keydown', e => {
            const spoiler = e.target.closest('.md-spoiler');
            if (spoiler && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                spoiler.classList.toggle('revealed');
            }
        });
    }

    function bindToggleKeySupport(el, handler) {
        el.addEventListener('keydown', e => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handler();
            }
        });
    }

    function isToggleActive(el) {
        return el.classList.contains('active');
    }

    function setToggleState(el, active) {
        el.classList.toggle('active', active);
        el.setAttribute('aria-checked', String(active));
    }

    // ===== Validation =====
    function validateWebhookUrl() {
        const val = webhookUrl.value.trim();
        if (!val) {
            urlValidation.textContent = '';
            urlValidation.className = 'text-xs text-text-muted';
            webhookUrl.classList.remove('input-invalid');
            return false;
        }
        const valid = WEBHOOK_URL_REGEX.test(val);
        if (valid) {
            urlValidation.textContent = '✓ Valid webhook URL';
            urlValidation.className = 'text-xs text-accent';
            webhookUrl.classList.remove('input-invalid');
        } else {
            urlValidation.textContent = '✗ Invalid Discord webhook URL format';
            urlValidation.className = 'text-xs text-danger';
            webhookUrl.classList.add('input-invalid');
        }
        return valid;
    }

    function validateOptionalUrls() {
        let firstError = null;
        optionalUrlInputs.forEach(({ el, label }) => {
            const val = el.value.trim();
            if (!val) {
                el.classList.remove('input-invalid');
                return;
            }
            const ok = isSafeHttpUrl(val);
            el.classList.toggle('input-invalid', !ok);
            if (!ok && !firstError) {
                firstError = `${label} must be a valid http:// or https:// URL`;
            }
        });
        return firstError;
    }

    function normalizeHexColor(value) {
        const raw = value.trim();
        if (!raw) return null;
        const withHash = raw.startsWith('#') ? raw : `#${raw}`;
        if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
            return withHash.toLowerCase();
        }
        if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
            const [, r, g, b] = withHash;
            return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
        }
        return null;
    }

    // ===== Remember URL =====
    function toggleRememberUrl() {
        const isActive = !isToggleActive(toggleRemember);
        setToggleState(toggleRemember, isActive);
        const trimmed = webhookUrl.value.trim();
        if (isActive) {
            if (trimmed) {
                localStorage.setItem(STORAGE_KEY_URL, trimmed);
                showToast('Webhook URL saved in browser', 'info');
            } else {
                showToast('Remember enabled — URL will be saved when entered', 'info');
            }
        } else {
            localStorage.removeItem(STORAGE_KEY_URL);
            showToast('Webhook URL cleared from browser', 'info');
        }
    }

    // ===== Character Counters =====
    function updateCounters() {
        updateContentCounter();
        updateDescCounter();
        updateEmbedTotalCounter();
    }

    function updateContentCounter() {
        const len = msgContent.value.length;
        contentCounter.textContent = `${len} / ${MAX_CONTENT_CHARS}`;
        contentCounter.className = 'char-counter' + (len > MAX_CONTENT_CHARS ? ' over' : len > 1900 ? ' warn' : '');
    }

    function updateDescCounter() {
        const len = embedDesc.value.length;
        descCounter.textContent = `${len} / ${MAX_EMBED_DESC_CHARS}`;
        descCounter.className = 'char-counter' + (len > MAX_EMBED_DESC_CHARS ? ' over' : len > 3900 ? ' warn' : '');
    }

    function getEmbedTotalChars() {
        let total = 0;
        total += embedTitle.value.trim().length;
        total += embedDesc.value.trim().length;
        total += embedAuthorName.value.trim().length;
        total += embedFooterText.value.trim().length;
        embedFields.forEach(f => {
            const hasField = f.name.trim() || f.value.trim();
            if (hasField) {
                total += (f.name.trim() || '\u200b').length;
                total += (f.value.trim() || '\u200b').length;
            }
        });
        return total;
    }

    function updateEmbedTotalCounter() {
        const total = getEmbedTotalChars();
        embedTotalCounter.textContent = `${total} / ${MAX_EMBED_TOTAL_CHARS} chars`;
        embedTotalCounter.className = 'char-counter' + (total > MAX_EMBED_TOTAL_CHARS ? ' over' : total > 5500 ? ' warn' : '');
    }

    // ===== Fields Builder =====
    function addField() {
        if (embedFields.length >= MAX_EMBED_FIELDS) {
            showToast(`Maximum ${MAX_EMBED_FIELDS} fields allowed`, 'error');
            return;
        }
        const id = ++fieldIdCounter;
        embedFields.push({ id, name: '', value: '', inline: true });
        renderFields();
        updateEmbedTotalCounter();
        updatePreview();
        updateSendState();
    }

    function removeField(id) {
        embedFields = embedFields.filter(f => f.id !== id);
        renderFields();
        updateEmbedTotalCounter();
        updatePreview();
        updateSendState();
    }

    function renderFields() {
        fieldsContainer.innerHTML = '';
        embedFields.forEach((field, idx) => {
            const row = document.createElement('div');
            row.className = 'field-row';
            row.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-text-secondary">Field ${idx + 1}</span>
                    <div class="flex items-center gap-1">
                        ${idx > 0 ? `<button type="button" class="btn btn-ghost btn-sm field-move-up" data-id="${field.id}" title="Move up" aria-label="Move field ${idx + 1} up"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg></button>` : ''}
                        ${idx < embedFields.length - 1 ? `<button type="button" class="btn btn-ghost btn-sm field-move-down" data-id="${field.id}" title="Move down" aria-label="Move field ${idx + 1} down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg></button>` : ''}
                        <button type="button" class="btn btn-danger btn-sm field-remove" data-id="${field.id}" title="Remove field" aria-label="Remove field ${idx + 1}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <input type="text" class="hook-input sm:col-span-2 field-name" data-id="${field.id}" placeholder="Name" maxlength="256" value="${escapeAttr(field.name)}">
                    <input type="text" class="hook-input sm:col-span-2 field-value" data-id="${field.id}" placeholder="Value" maxlength="1024" value="${escapeAttr(field.value)}">
                    <div class="flex items-center gap-2">
                        <div class="toggle-track ${field.inline ? 'active' : ''} field-inline-toggle" data-id="${field.id}" role="switch" aria-checked="${field.inline}" aria-label="Inline field ${idx + 1}" tabindex="0"></div>
                        <span class="text-xs text-text-muted">Inline</span>
                    </div>
                </div>
            `;
            fieldsContainer.appendChild(row);
        });

        fieldsContainer.querySelectorAll('.field-name').forEach(input => {
            input.addEventListener('input', e => {
                const f = embedFields.find(item => item.id === +e.target.dataset.id);
                if (f) {
                    f.name = e.target.value;
                    updateEmbedTotalCounter();
                    updatePreview();
                    updateSendState();
                }
            });
        });

        fieldsContainer.querySelectorAll('.field-value').forEach(input => {
            input.addEventListener('input', e => {
                const f = embedFields.find(item => item.id === +e.target.dataset.id);
                if (f) {
                    f.value = e.target.value;
                    updateEmbedTotalCounter();
                    updatePreview();
                    updateSendState();
                }
            });
        });

        fieldsContainer.querySelectorAll('.field-inline-toggle').forEach(toggle => {
            toggle.addEventListener('click', e => {
                const id = +e.currentTarget.dataset.id;
                const f = embedFields.find(item => item.id === id);
                if (f) {
                    f.inline = !f.inline;
                    setToggleState(e.currentTarget, f.inline);
                    updatePreview();
                }
            });
            bindToggleKeySupport(toggle, () => toggle.click());
        });

        fieldsContainer.querySelectorAll('.field-remove').forEach(btn => {
            btn.addEventListener('click', e => removeField(+e.currentTarget.dataset.id));
        });

        fieldsContainer.querySelectorAll('.field-move-up').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = +e.currentTarget.dataset.id;
                const idx = embedFields.findIndex(item => item.id === id);
                if (idx > 0) {
                    [embedFields[idx - 1], embedFields[idx]] = [embedFields[idx], embedFields[idx - 1]];
                    renderFields();
                    updatePreview();
                }
            });
        });

        fieldsContainer.querySelectorAll('.field-move-down').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = +e.currentTarget.dataset.id;
                const idx = embedFields.findIndex(item => item.id === id);
                if (idx < embedFields.length - 1) {
                    [embedFields[idx], embedFields[idx + 1]] = [embedFields[idx + 1], embedFields[idx]];
                    renderFields();
                    updatePreview();
                }
            });
        });
    }

    // ===== File Handling =====
    function getSafeAttachmentName(file) {
        if (!file) return '';
        const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        return sanitized || 'attachment.png';
    }

    function syncImageOverrideState() {
        const overriding = Boolean(attachedFile && attachInEmbed);
        embedImageUrl.disabled = overriding;
        embedImageOverrideHint.classList.toggle('hidden', !overriding);
    }

    function handleFile(file) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            showToast('Only PNG, JPG, GIF, WEBP allowed', 'error');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            showToast('File too large (max 25MB)', 'error');
            return;
        }

        attachedFile = file;
        if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
        fileObjectUrl = URL.createObjectURL(file);

        // Default to embedding image unless user already entered a custom embed image URL
        attachInEmbed = !embedImageUrl.value.trim();
        setToggleState(toggleAttachInEmbed, attachInEmbed);

        fileThumb.src = fileObjectUrl;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        dropzoneContent.classList.add('hidden');
        dropzonePreview.classList.remove('hidden');
        embedAttachOption.classList.remove('hidden');
        syncImageOverrideState();

        updatePreview();
        updateSendState();
    }

    function removeFile() {
        attachedFile = null;
        if (fileObjectUrl) {
            URL.revokeObjectURL(fileObjectUrl);
            fileObjectUrl = null;
        }
        fileInput.value = '';
        dropzoneContent.classList.remove('hidden');
        dropzonePreview.classList.add('hidden');
        embedAttachOption.classList.add('hidden');
        syncImageOverrideState();

        updatePreview();
        updateSendState();
    }

    // ===== Build Payload =====
    function buildPayload() {
        const payload = {};

        const content = msgContent.value.trim();
        if (content) payload.content = content;

        if (overrideUsername.value.trim()) payload.username = overrideUsername.value.trim();
        if (overrideAvatar.value.trim()) payload.avatar_url = overrideAvatar.value.trim();

        const embed = buildEmbed();
        if (embed) {
            payload.embeds = [embed];
        }

        return payload;
    }

    function buildEmbed() {
        const title = embedTitle.value.trim();
        const url = embedUrl.value.trim();
        const desc = embedDesc.value.trim();
        const authorName = embedAuthorName.value.trim();
        const footerText = embedFooterText.value.trim();
        const thumbUrl = embedThumbnail.value.trim();
        const imageUrl = embedImageUrl.value.trim();
        const hasTimestamp = isToggleActive(toggleTimestamp);
        const validFields = embedFields.filter(f => f.name.trim() || f.value.trim());

        const hasEmbedImageFromFile = Boolean(attachedFile && attachInEmbed);
        const hasOtherEmbedContent = Boolean(
            title || desc || authorName || footerText || thumbUrl || imageUrl || validFields.length || hasTimestamp
        );

        // Only create an embed if there is embed content (or file is explicitly set to embed)
        // Note: if user ONLY attaches a file and hasn't typed any embed fields, send as standalone attachment
        if (!hasOtherEmbedContent) {
            return null;
        }

        const embed = {};

        if (title) {
            embed.title = title;
            if (url) embed.url = url;
        }
        if (desc) embed.description = desc;

        const colorHex = normalizeHexColor(embedColorHex.value);
        if (colorHex) {
            embed.color = parseInt(colorHex.slice(1), 16);
        }

        if (authorName) {
            embed.author = { name: authorName };
            if (embedAuthorUrl.value.trim()) embed.author.url = embedAuthorUrl.value.trim();
            if (embedAuthorIcon.value.trim()) embed.author.icon_url = embedAuthorIcon.value.trim();
        }

        if (footerText) {
            embed.footer = { text: footerText };
            if (embedFooterIcon.value.trim()) embed.footer.icon_url = embedFooterIcon.value.trim();
        }

        if (hasTimestamp) {
            embed.timestamp = new Date().toISOString();
        }

        if (thumbUrl) {
            embed.thumbnail = { url: thumbUrl };
        }

        if (hasEmbedImageFromFile) {
            embed.image = { url: `attachment://${getSafeAttachmentName(attachedFile)}` };
        } else if (imageUrl) {
            embed.image = { url: imageUrl };
        }

        if (validFields.length) {
            embed.fields = validFields.map(f => ({
                name: f.name.trim() || '\u200b',
                value: f.value.trim() || '\u200b',
                inline: f.inline
            }));
        }

        return embed;
    }

    // ===== Preview Update =====
    function updatePreview() {
        const content = msgContent.value.trim();
        const embed = buildEmbed();
        const showStandaloneAttachment = Boolean(attachedFile && (!embed || !attachInEmbed));
        const hasAnything = Boolean(content || embed || attachedFile);

        previewEmpty.classList.toggle('hidden', hasAnything);

        // Username
        previewUsername.textContent = overrideUsername.value.trim() || 'Webhook Bot';

        // Avatar (avoid recreating <img> if URL didn't change)
        const avatarVal = overrideAvatar.value.trim();
        if (avatarVal !== lastAvatarUrl) {
            lastAvatarUrl = avatarVal;
            if (avatarVal && isSafeHttpUrl(avatarVal)) {
                const img = document.createElement('img');
                img.src = avatarVal;
                img.alt = 'Avatar';
                img.onerror = function () {
                    this.remove();
                    previewAvatar.innerHTML = defaultAvatarSvg();
                };
                previewAvatar.innerHTML = '';
                previewAvatar.appendChild(img);
            } else {
                previewAvatar.innerHTML = defaultAvatarSvg();
            }
        }

        // Content with Discord markdown
        if (content) {
            previewContent.innerHTML = renderDiscordMarkdown(content, { allowLinks: true, allowHeadings: true });
            previewContent.classList.remove('hidden');
        } else {
            previewContent.innerHTML = '';
            previewContent.classList.add('hidden');
        }

        // Embed
        if (embed) {
            previewEmbedWrap.classList.remove('hidden');

            const colorHex = normalizeHexColor(embedColorHex.value);
            previewEmbedBar.style.background = colorHex || '#202225';

            // Author
            if (embed.author) {
                previewEmbedAuthor.classList.remove('hidden');
                if (embed.author.url && isSafeHttpUrl(embed.author.url)) {
                    previewAuthorName.innerHTML = `<a href="${escapeAttr(embed.author.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.author.name)}</a>`;
                } else {
                    previewAuthorName.textContent = embed.author.name;
                }
                if (embed.author.icon_url && isSafeHttpUrl(embed.author.icon_url)) {
                    previewAuthorIcon.src = embed.author.icon_url;
                    previewAuthorIcon.classList.remove('hidden');
                } else {
                    previewAuthorIcon.removeAttribute('src');
                    previewAuthorIcon.classList.add('hidden');
                }
            } else {
                previewEmbedAuthor.classList.add('hidden');
            }

            // Title
            if (embed.title) {
                previewEmbedTitle.classList.remove('hidden');
                if (embed.url && isSafeHttpUrl(embed.url)) {
                    previewEmbedTitle.innerHTML = `<a href="${escapeAttr(embed.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.title)}</a>`;
                } else {
                    previewEmbedTitle.textContent = embed.title;
                }
            } else {
                previewEmbedTitle.classList.add('hidden');
            }

            // Description with Discord markdown
            if (embed.description) {
                previewEmbedDesc.classList.remove('hidden');
                previewEmbedDesc.innerHTML = renderDiscordMarkdown(embed.description, { allowLinks: true, allowHeadings: true });
            } else {
                previewEmbedDesc.innerHTML = '';
                previewEmbedDesc.classList.add('hidden');
            }

            // Fields with Discord markdown
            if (embed.fields && embed.fields.length) {
                previewEmbedFields.classList.remove('hidden');
                previewEmbedFields.innerHTML = embed.fields.map(f => `
                    <div class="discord-embed-field ${f.inline ? '' : 'full'}">
                        <div class="discord-embed-field-name">${escapeHtml(f.name)}</div>
                        <div class="discord-embed-field-value">${renderDiscordMarkdown(f.value, { allowLinks: true, allowHeadings: false })}</div>
                    </div>
                `).join('');
            } else {
                previewEmbedFields.innerHTML = '';
                previewEmbedFields.classList.add('hidden');
            }

            // Thumbnail
            if (embed.thumbnail && isSafeHttpUrl(embed.thumbnail.url)) {
                previewEmbedThumb.src = embed.thumbnail.url;
                previewEmbedThumb.classList.remove('hidden');
            } else {
                previewEmbedThumb.removeAttribute('src');
                previewEmbedThumb.classList.add('hidden');
            }

            // Image
            if (embed.image) {
                if (attachedFile && attachInEmbed && fileObjectUrl) {
                    previewEmbedImage.src = fileObjectUrl;
                    previewEmbedImage.classList.remove('hidden');
                } else if (isSafeHttpUrl(embed.image.url)) {
                    previewEmbedImage.src = embed.image.url;
                    previewEmbedImage.classList.remove('hidden');
                } else {
                    previewEmbedImage.removeAttribute('src');
                    previewEmbedImage.classList.add('hidden');
                }
            } else {
                previewEmbedImage.removeAttribute('src');
                previewEmbedImage.classList.add('hidden');
            }

            // Footer
            if (embed.footer || embed.timestamp) {
                previewEmbedFooter.classList.remove('hidden');
                if (embed.footer) {
                    previewFooterText.textContent = embed.footer.text;
                    if (embed.footer.icon_url && isSafeHttpUrl(embed.footer.icon_url)) {
                        previewFooterIcon.src = embed.footer.icon_url;
                        previewFooterIcon.classList.remove('hidden');
                    } else {
                        previewFooterIcon.removeAttribute('src');
                        previewFooterIcon.classList.add('hidden');
                    }
                } else {
                    previewFooterText.textContent = '';
                    previewFooterIcon.removeAttribute('src');
                    previewFooterIcon.classList.add('hidden');
                }

                if (embed.timestamp) {
                    previewFooterSep.classList.toggle('hidden', !embed.footer);
                    previewFooterTimestamp.textContent = formatDiscordTime(new Date(embed.timestamp));
                } else {
                    previewFooterSep.classList.add('hidden');
                    previewFooterTimestamp.textContent = '';
                }
            } else {
                previewEmbedFooter.classList.add('hidden');
            }
        } else {
            previewEmbedWrap.classList.add('hidden');
        }

        // Standalone file attachment preview
        if (showStandaloneAttachment && fileObjectUrl) {
            previewAttachment.classList.remove('hidden');
            previewAttachmentImg.src = fileObjectUrl;
        } else {
            previewAttachment.classList.add('hidden');
            previewAttachmentImg.removeAttribute('src');
        }

        if (!jsonViewer.classList.contains('hidden')) {
            updateJsonView();
        }
    }

    // ===== Send State =====
    function updateSendState() {
        const urlValid = validateWebhookUrl();
        const optionalUrlError = validateOptionalUrls();
        const contentLen = msgContent.value.length;
        const embedTotal = getEmbedTotalChars();
        const colorInvalid = Boolean(embedColorHex.value.trim() && !normalizeHexColor(embedColorHex.value));

        const content = msgContent.value.trim();
        const embed = buildEmbed();
        const hasPayload = Boolean(content || embed || attachedFile);

        let validationIssue = '';
        if (contentLen > MAX_CONTENT_CHARS) {
            validationIssue = `Message content exceeds ${MAX_CONTENT_CHARS} characters`;
        } else if (embedTotal > MAX_EMBED_TOTAL_CHARS) {
            validationIssue = `Total embed length exceeds ${MAX_EMBED_TOTAL_CHARS} characters`;
        } else if (colorInvalid) {
            validationIssue = 'Embed accent color must be a valid hex value (e.g. #5865F2)';
        } else if (optionalUrlError) {
            validationIssue = optionalUrlError;
        } else if (embedUrl.value.trim() && !embedTitle.value.trim()) {
            validationIssue = 'Embed Title URL requires an Embed Title';
        }

        if (validationIssue) {
            sendValidationMsg.textContent = validationIssue;
            sendValidationMsg.classList.remove('hidden');
        } else {
            sendValidationMsg.textContent = '';
            sendValidationMsg.classList.add('hidden');
        }

        btnSend.disabled = !urlValid || !hasPayload || Boolean(validationIssue) || isSending;
    }

    // ===== Send Webhook =====
    function formatDiscordError(data, status) {
        if (!data || typeof data !== 'object') return `HTTP ${status}`;
        if (data.errors && typeof data.errors === 'object') {
            const details = [];
            const walk = (node, path) => {
                if (!node || typeof node !== 'object') return;
                if (Array.isArray(node._errors) && node._errors.length) {
                    const msg = node._errors.map(e => e.message).filter(Boolean).join(', ');
                    if (msg) details.push(path ? `${path}: ${msg}` : msg);
                }
                Object.keys(node).forEach(key => {
                    if (key === '_errors') return;
                    walk(node[key], path ? `${path}.${key}` : key);
                });
            };
            walk(data.errors, '');
            if (details.length) return details[0];
        }
        return data.message || `HTTP ${status}`;
    }

    async function sendWebhook() {
        if (isSending) return;
        const url = webhookUrl.value.trim();
        if (!url || !WEBHOOK_URL_REGEX.test(url)) return;

        const payload = buildPayload();
        const hasContent = Boolean(payload.content || (payload.embeds && payload.embeds.length) || attachedFile);
        if (!hasContent) {
            showToast('Nothing to send — add content, an embed, or attach a file', 'error');
            return;
        }

        isSending = true;
        btnSend.disabled = true;
        sendLabel.textContent = 'Sending...';
        const sendIcon = btnSend.querySelector('svg');
        if (sendIcon) sendIcon.classList.add('hidden');
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.id = 'send-spinner';
        btnSend.prepend(spinner);

        try {
            let response;
            if (attachedFile) {
                const formData = new FormData();
                formData.append('payload_json', JSON.stringify(payload));
                formData.append('files[0]', attachedFile, getSafeAttachmentName(attachedFile));
                response = await fetch(url, { method: 'POST', body: formData });
            } else {
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (response.status === 200 || response.status === 204) {
                showToast('Webhook sent successfully!', 'success');
            } else if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                const retryAfter = data.retry_after != null ? `${Number(data.retry_after).toFixed(1)}s` : 'a moment';
                showToast(`Rate limited. Retry after ${retryAfter}`, 'error');
            } else {
                const data = await response.json().catch(() => ({}));
                const msg = formatDiscordError(data, response.status);
                showToast(`Error: ${msg}`, 'error');
            }
        } catch (err) {
            if (err instanceof TypeError) {
                showToast('Network error — check the URL, internet connection, or CORS settings', 'error');
            } else {
                showToast(`Failed: ${err.message}`, 'error');
            }
        } finally {
            isSending = false;
            sendLabel.textContent = 'Send Webhook';
            const sp = $('send-spinner');
            if (sp) sp.remove();
            if (sendIcon) sendIcon.classList.remove('hidden');
            updateSendState();
        }
    }

    // ===== JSON View =====
    function updateJsonView() {
        const payload = buildPayload();
        jsonOutput.textContent = JSON.stringify(payload, null, 2);
    }

    function copyJsonToClipboard() {
        const text = jsonOutput.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => showToast('Copied to clipboard', 'info'))
                .catch(() => fallbackCopyText(text));
        } else {
            fallbackCopyText(text);
        }
    }

    function fallbackCopyText(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            const copied = document.execCommand('copy');
            showToast(copied ? 'Copied to clipboard' : 'Failed to copy to clipboard', copied ? 'info' : 'error');
        } catch {
            showToast('Failed to copy to clipboard', 'error');
        } finally {
            ta.remove();
        }
    }

    // ===== Reset =====
    function resetAll() {
        msgContent.value = '';
        embedTitle.value = '';
        embedUrl.value = '';
        embedDesc.value = '';
        embedColorPicker.value = '#5865f2';
        embedColorHex.value = '#5865f2';
        embedColorHex.classList.remove('input-invalid');
        embedAuthorName.value = '';
        embedAuthorUrl.value = '';
        embedAuthorIcon.value = '';
        embedThumbnail.value = '';
        embedImageUrl.value = '';
        embedFooterText.value = '';
        embedFooterIcon.value = '';
        overrideUsername.value = '';
        overrideAvatar.value = '';
        setToggleState(toggleTimestamp, false);
        embedFields = [];
        fieldIdCounter = 0;
        lastAvatarUrl = '';
        renderFields();
        removeFile();
        updateCounters();
        updatePreview();
        updateSendState();
        showToast('All fields reset', 'info');
    }

    // ===== Toast =====
    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = `toast ${type} visible`;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 4000);
    }

    // ===== Helpers =====
    function defaultAvatarSvg() {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDiscordTime(date) {
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

        if (isToday) return `Today at ${time}`;
        if (isYesterday) return `Yesterday at ${time}`;
        return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' }) + ` ${time}`;
    }

    // ===== Start =====
    init();
})();
