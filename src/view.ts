import { ItemView, WorkspaceLeaf, MarkdownRenderer, TFile, setIcon, MarkdownView } from 'obsidian';
import { MPConverter } from './converter';
import { CopyManager } from './copyManager';
import { DonateManager } from './donateManager';
import type { SettingsManager } from './settings/settings';
import type { ThemeManager } from './themeManager';

export const VIEW_TYPE_MP = 'mp-preview';

export class MPView extends ItemView {
    private previewEl: HTMLElement;
    private currentFile: TFile | null = null;
    private updateTimer: NodeJS.Timeout | null = null;
    private refreshButton: HTMLButtonElement;
    private copyButton: HTMLButtonElement;
    private themeManager: ThemeManager;
    private settingsManager: SettingsManager;
    private customThemeSelect: HTMLElement;
    private customFontSelect: HTMLElement;
    private fontSizeSelect: HTMLInputElement;
    private plugin: any;

    /** 获取预览区域的 DOM 元素（供发布流程复用） */
    getPreviewElement(): HTMLElement {
        return this.previewEl;
    }

    constructor(
        leaf: WorkspaceLeaf,
        themeManager: ThemeManager,
        settingsManager: SettingsManager,
        plugin: any,
    ) {
        super(leaf);
        this.themeManager = themeManager;
        this.settingsManager = settingsManager;
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_MP;
    }

    getDisplayText() {
        return '公众号预览';
    }

    getIcon() {
        return 'eye';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.classList.remove('view-content');
        container.classList.add('mp-view-content');

        // 顶部工具栏
        const toolbar = container.createEl('div', { cls: 'mp-toolbar' });
        const controlsGroup = toolbar.createEl('div', { cls: 'mp-controls-group' });

        // 刷新按钮
        this.refreshButton = controlsGroup.createEl('button', {
            cls: 'mp-refresh-button',
            attr: { 'aria-label': '刷新预览' },
        });
        setIcon(this.refreshButton, 'refresh-cw');
        this.refreshButton.addEventListener('click', () => this.forceRefreshPreview());

        // 主题选择器
        const themeOptions = this.getThemeOptions();
        this.customThemeSelect = this.createCustomSelect(
            controlsGroup,
            'mp-template-select',
            themeOptions,
        );
        this.customThemeSelect.id = 'template-select';

        // 主题选择器事件
        this.customThemeSelect.querySelector('.custom-select')?.addEventListener('change', async (e: any) => {
            const value = e.detail.value;
            this.themeManager.setActiveTheme(value);
            await this.settingsManager.updateSettings({ activeThemeId: value });
            this.applyCurrentTheme();
        });

        // 字体选择器
        this.customFontSelect = this.createCustomSelect(
            controlsGroup,
            'mp-font-select',
            this.getFontOptions(),
        );
        this.customFontSelect.id = 'font-select';

        // 字体选择器事件
        this.customFontSelect.querySelector('.custom-select')?.addEventListener('change', async (e: any) => {
            const value = e.detail.value;
            this.themeManager.setFont(value);
            await this.settingsManager.updateSettings({ fontFamily: value });
            this.applyCurrentTheme();
        });

        // 字号调整
        const fontSizeGroup = controlsGroup.createEl('div', { cls: 'mp-font-size-group' });
        const decreaseButton = fontSizeGroup.createEl('button', {
            cls: 'mp-font-size-btn',
            text: '-',
        });
        this.fontSizeSelect = fontSizeGroup.createEl('input', {
            cls: 'mp-font-size-input',
            type: 'text',
            value: '16',
            attr: {
                style: 'border: none; outline: none; background: transparent;',
            },
        });
        const increaseButton = fontSizeGroup.createEl('button', {
            cls: 'mp-font-size-btn',
            text: '+',
        });

        // 从设置中恢复上次的选择
        const settings = this.settingsManager.getSettings();

        // 恢复主题选择
        if (settings.activeThemeId) {
            this.restoreSelectValue(this.customThemeSelect, settings.activeThemeId, themeOptions);
        }

        // 恢复字体选择
        if (settings.fontFamily) {
            this.restoreSelectValue(this.customFontSelect, settings.fontFamily, this.getFontOptions());
        }

        // 恢复字号
        if (settings.fontSize) {
            this.fontSizeSelect.value = settings.fontSize.toString();
        }

        // 字号调整事件
        const updateFontSize = async () => {
            const size = parseInt(this.fontSizeSelect.value);
            if (isNaN(size) || size < 12 || size > 30) return;
            this.themeManager.setFontSize(size);
            await this.settingsManager.updateSettings({ fontSize: size });
            this.applyCurrentTheme();
        };

        decreaseButton.addEventListener('click', () => {
            const currentSize = parseInt(this.fontSizeSelect.value);
            if (currentSize > 12) {
                this.fontSizeSelect.value = (currentSize - 1).toString();
                updateFontSize();
            }
        });

        increaseButton.addEventListener('click', () => {
            const currentSize = parseInt(this.fontSizeSelect.value);
            if (currentSize < 30) {
                this.fontSizeSelect.value = (currentSize + 1).toString();
                updateFontSize();
            }
        });

        this.fontSizeSelect.addEventListener('change', updateFontSize);

        // 预览区域
        this.previewEl = container.createEl('div', { cls: 'mp-preview-area' });

        // 底部工具栏
        const bottomBar = container.createEl('div', { cls: 'mp-bottom-bar' });
        const bottomControlsGroup = bottomBar.createEl('div', { cls: 'mp-controls-group' });

        // 帮助按钮
        const helpButton = bottomControlsGroup.createEl('button', {
            cls: 'mp-help-button',
            attr: { 'aria-label': '使用指南' },
        });
        setIcon(helpButton, 'help');
        bottomControlsGroup.createEl('div', {
            cls: 'mp-help-tooltip',
            text: `使用指南：
                1. 选择喜欢的主题模板
                2. 调整字体和字号
                3. 实时预览效果
                4. 修改主题 CSS 后点击🔄刷新按钮更新预览
                5. 点击【复制按钮】即可粘贴到公众号
                6. 如果你喜欢这个插件，欢迎关注打赏`,
        });

        // 复制按钮
        this.copyButton = bottomControlsGroup.createEl('button', {
            text: '复制到公众号',
            cls: 'mp-copy-button',
        });

        // 发布按钮
        const publishButton = bottomControlsGroup.createEl('button', {
            text: '发布',
            cls: 'mp-publish-button',
        });

        // 复制按钮点击事件
        this.copyButton.addEventListener('click', async () => {
            if (this.previewEl) {
                this.copyButton.disabled = true;
                this.copyButton.setText('复制中...');

                try {
                    await CopyManager.copyToClipboard(this.previewEl);
                    this.copyButton.setText('复制成功');

                    setTimeout(() => {
                        this.copyButton.disabled = false;
                        this.copyButton.setText('复制为公众号格式');
                    }, 2000);
                } catch (error) {
                    this.copyButton.setText('复制失败');
                    setTimeout(() => {
                        this.copyButton.disabled = false;
                        this.copyButton.setText('复制为公众号格式');
                    }, 2000);
                }
            }
        });

        // 发布按钮点击事件
        publishButton.addEventListener('click', async () => {
            if (!this.currentFile) return;

            const leaves = this.app.workspace.getLeavesOfType('markdown');
            let markdownView: MarkdownView | null = null;

            for (const leaf of leaves) {
                const view = leaf.view;
                if (view instanceof MarkdownView && view.file === this.currentFile) {
                    markdownView = view;
                    break;
                }
            }

            if (!markdownView) {
                await this.app.workspace.openLinkText(this.currentFile.path, '', false);
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView && activeView.file === this.currentFile) {
                    markdownView = activeView;
                }
            }

            if (markdownView && this.plugin && typeof this.plugin.showPublishModal === 'function') {
                this.plugin.showPublishModal.call(this.plugin, markdownView);
            }
        });

        // 监听文档变化
        this.registerEvent(
            this.app.workspace.on('file-open', this.onFileOpen.bind(this)),
        );

        // 监听文档内容变化
        this.registerEvent(
            this.app.vault.on('modify', this.onFileModify.bind(this)),
        );

        // 监听主题/设置变更（从主题管理界面切换主题时同步）
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.syncThemeFromSettings();
            }),
        );

        // 定期检查主题是否变更（兜底机制，确保主题管理界面的切换能同步）
        const themeCheckIntervalId = window.setInterval(() => {
            this.syncThemeFromSettings();
        }, 2000);
        this.register(() => window.clearInterval(themeCheckIntervalId));

        // 检查当前打开的文件
        const currentFile = this.app.workspace.getActiveFile();
        await this.onFileOpen(currentFile);
    }

    /** 将当前主题的 CSS 应用到预览区域 */
    private applyCurrentTheme(): void {
        const section = this.previewEl.querySelector('.mp-content-section') as HTMLElement;
        if (section) {
            this.themeManager.applyTheme(section);
        }
    }

    /** 上次同步的主题 ID，用于检测变更 */
    private lastSyncedThemeId: string = '';
    /** 上次同步时的主题列表快照（用于检测新增/删除主题） */
    private lastThemeOptionsSnapshot: string = '';
    /** 上次同步时的活动主题 CSS 哈希（用于检测 CSS 内容变更） */
    private lastThemeCSSSnapshot: string = '';

    /** 从设置中同步主题状态到预览视图 */
    private syncThemeFromSettings(): void {
        const settings = this.settingsManager.getSettings();
        const currentActiveId = settings.activeThemeId || 'default';

        // 检测主题列表是否变化（新增/删除了主题）
        const themeOptions = this.getThemeOptions();
        const themeOptionsSnapshot = themeOptions.map(o => o.value).join(',');
        const themeListChanged = themeOptionsSnapshot !== this.lastThemeOptionsSnapshot;

        if (themeListChanged) {
            this.lastThemeOptionsSnapshot = themeOptionsSnapshot;
            // 重建主题选择器选项
            this.rebuildSelectOptions(this.customThemeSelect, themeOptions, currentActiveId);
        }

        // 检测活动主题 CSS 内容是否变化
        const activeTheme = this.themeManager.getTheme(currentActiveId);
        const currentCSSSnapshot = activeTheme ? activeTheme.css.substring(0, 200) + activeTheme.css.length : '';
        const cssChanged = currentCSSSnapshot !== this.lastThemeCSSSnapshot;

        // 检测主题 ID 是否变化
        const themeIdChanged = currentActiveId !== this.lastSyncedThemeId;

        if (!themeIdChanged && !cssChanged && !themeListChanged) return;

        this.lastSyncedThemeId = currentActiveId;
        this.lastThemeCSSSnapshot = currentCSSSnapshot;

        // 同步 themeManager 的激活主题
        this.themeManager.setActiveTheme(currentActiveId);

        // 同步主题选择器的显示
        this.restoreSelectValue(this.customThemeSelect, currentActiveId, themeOptions);

        // 重新应用主题到预览区域
        this.applyCurrentTheme();
    }

    /** 重建下拉选择器的选项列表 */
    private rebuildSelectOptions(
        selectContainer: HTMLElement,
        options: { value: string; label: string }[],
        activeValue: string,
    ): void {
        const dropdown = selectContainer.querySelector('.select-dropdown');
        const selectedText = selectContainer.querySelector('.selected-text');
        const customSelect = selectContainer.querySelector('.custom-select');
        if (!dropdown || !selectedText || !customSelect) return;

        dropdown.empty();

        for (const option of options) {
            const item = dropdown.createEl('div', {
                cls: `select-item ${option.value === activeValue ? 'selected' : ''}`,
                text: option.label,
            });
            item.dataset.value = option.value;

            item.addEventListener('click', () => {
                dropdown.querySelectorAll('.select-item').forEach(el =>
                    el.classList.remove('selected'));
                item.classList.add('selected');
                selectedText.textContent = option.label;
                customSelect.setAttribute('data-value', option.value);
                (dropdown as HTMLElement).classList.remove('show');
                customSelect.dispatchEvent(new CustomEvent('change', {
                    detail: { value: option.value },
                }));
            });
        }

        // 更新显示文本
        const activeOption = options.find(o => o.value === activeValue);
        if (activeOption) {
            selectedText.textContent = activeOption.label;
            customSelect.setAttribute('data-value', activeOption.value);
        }
    }

    /** 恢复下拉选择器的值 */
    private restoreSelectValue(
        selectContainer: HTMLElement,
        value: string,
        options: { value: string; label: string }[],
    ): void {
        const selectedText = selectContainer.querySelector('.selected-text');
        const dropdown = selectContainer.querySelector('.select-dropdown');
        if (selectedText && dropdown) {
            const option = options.find(o => o.value === value);
            if (option) {
                selectedText.textContent = option.label;
                selectContainer.querySelector('.custom-select')?.setAttribute('data-value', option.value);
                dropdown.querySelectorAll('.select-item').forEach(el => {
                    if (el.getAttribute('data-value') === option.value) {
                        el.classList.add('selected');
                    } else {
                        el.classList.remove('selected');
                    }
                });
            }
        }
    }

    private updateControlsState(enabled: boolean) {
        this.refreshButton.disabled = !enabled;

        const themeSelect = this.customThemeSelect.querySelector('.custom-select');
        const fontSelect = this.customFontSelect.querySelector('.custom-select');

        [themeSelect, fontSelect].forEach(select => {
            if (select) {
                select.classList.toggle('disabled', !enabled);
                select.setAttribute('style', `pointer-events: ${enabled ? 'auto' : 'none'}`);
            }
        });

        this.fontSizeSelect.disabled = !enabled;
        this.copyButton.disabled = !enabled;

        const fontSizeButtons = this.containerEl.querySelectorAll('.mp-font-size-btn');
        fontSizeButtons.forEach(button => {
            (button as HTMLButtonElement).disabled = !enabled;
        });
    }

    async onFileOpen(file: TFile | null) {
        this.currentFile = file;
        if (!file || file.extension !== 'md') {
            this.previewEl.empty();
            this.previewEl.createEl('div', {
                text: '只能预览 markdown 文本文档',
                cls: 'mp-empty-message',
            });
            this.updateControlsState(false);
            return;
        }

        this.updateControlsState(true);
        await this.updatePreview();
    }

    /** 强制刷新预览：重新加载本地主题、同步主题选择器、重新渲染预览 */
    private async forceRefreshPreview(): Promise<void> {
        this.refreshButton.disabled = true;
        setIcon(this.refreshButton, 'loader');

        try {
            // 重新加载本地主题（捕获 CSS 文件变更）
            await this.themeManager.reloadLocalThemes();

            // 重置同步快照，强制下次同步生效
            this.lastSyncedThemeId = '';
            this.lastThemeOptionsSnapshot = '';
            this.lastThemeCSSSnapshot = '';

            // 立即同步主题状态和选择器
            this.syncThemeFromSettings();

            // 重新渲染预览
            await this.updatePreview();
        } finally {
            this.refreshButton.disabled = false;
            setIcon(this.refreshButton, 'refresh-cw');
        }
    }

    async onFileModify(file: TFile) {
        if (file === this.currentFile) {
            if (this.updateTimer) {
                clearTimeout(this.updateTimer);
            }

            this.updateTimer = setTimeout(() => {
                this.updatePreview();
            }, 500);
        }
    }

    async updatePreview() {
        if (!this.currentFile) return;

        // 保存当前滚动位置和内容高度
        const scrollPosition = this.previewEl.scrollTop;
        const prevHeight = this.previewEl.scrollHeight;
        const isAtBottom = (this.previewEl.scrollHeight - this.previewEl.scrollTop) <= (this.previewEl.clientHeight + 100);

        this.previewEl.empty();
        const content = await this.app.vault.cachedRead(this.currentFile);

        await MarkdownRenderer.render(
            this.app,
            content,
            this.previewEl,
            this.currentFile.path,
            this,
        );

        MPConverter.formatContent(this.previewEl);

        // 使用新的 CSS 主题系统：注入 <style> 标签
        const section = this.previewEl.querySelector('.mp-content-section') as HTMLElement;
        if (section) {
            this.themeManager.applyTheme(section);
        }

        // 根据滚动位置决定是否自动滚动
        if (isAtBottom) {
            requestAnimationFrame(() => {
                this.previewEl.scrollTop = this.previewEl.scrollHeight;
            });
        } else {
            const heightDiff = this.previewEl.scrollHeight - prevHeight;
            this.previewEl.scrollTop = scrollPosition + heightDiff;
        }
    }

    /** 创建自定义下拉选择器 */
    private createCustomSelect(
        parent: HTMLElement,
        className: string,
        options: { value: string; label: string }[],
    ) {
        const container = parent.createEl('div', { cls: 'custom-select-container' });
        const select = container.createEl('div', { cls: 'custom-select' });
        const selectedText = select.createEl('span', { cls: 'selected-text' });
        select.createEl('span', { cls: 'select-arrow', text: '▾' });

        const dropdown = container.createEl('div', { cls: 'select-dropdown' });

        options.forEach(option => {
            const item = dropdown.createEl('div', {
                cls: 'select-item',
                text: option.label,
            });

            item.dataset.value = option.value;
            item.addEventListener('click', () => {
                dropdown.querySelectorAll('.select-item').forEach(el =>
                    el.classList.remove('selected'));
                item.classList.add('selected');
                selectedText.textContent = option.label;
                select.dataset.value = option.value;
                dropdown.classList.remove('show');
                select.dispatchEvent(new CustomEvent('change', {
                    detail: { value: option.value },
                }));
            });
        });

        // 设置默认值
        if (options.length > 0) {
            selectedText.textContent = options[0].label;
            select.dataset.value = options[0].value;
            dropdown.querySelector('.select-item')?.classList.add('selected');
        }

        select.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });

        return container;
    }

    /** 获取主题选项（本地自定义主题排在内置主题之前） */
    private getThemeOptions(): { value: string; label: string }[] {
        const allThemes = this.themeManager.getVisibleThemes();
        if (allThemes.length === 0) {
            return [{ value: 'default', label: '默认主题' }];
        }

        // 本地主题排在前面，内置主题排在后面
        const localThemes = allThemes.filter(t => t.source === 'local');
        const builtinThemes = allThemes.filter(t => t.source === 'builtin');
        const otherThemes = allThemes.filter(t => t.source !== 'local' && t.source !== 'builtin');
        const sortedThemes = [...localThemes, ...builtinThemes, ...otherThemes];

        return sortedThemes.map(theme => ({ value: theme.id, label: theme.name }));
    }

    /** 获取字体选项 */
    private getFontOptions(): { value: string; label: string }[] {
        return this.settingsManager.getFontOptions();
    }
}