import { ItemView, WorkspaceLeaf, Setting, Notice, TextAreaComponent, setIcon } from 'obsidian';
import type { ThemeManager } from './themeManager';
import type { SettingsManager } from './settings/settings';
import { ThemeSource, CSSTheme, RemoteThemeIndex } from './types/css-theme';
import { ConfirmModal } from './settings/ConfirmModal';

export const VIEW_TYPE_THEME_MANAGER = 'mp-theme-manager';

/**
 * 主题管理界面
 * 通过命令打开，管理内置、云端、本地三层主题
 */
export class ThemeManagerView extends ItemView {
    private themeManager: ThemeManager;
    private settingsManager: SettingsManager;
    private plugin: any;

    constructor(leaf: WorkspaceLeaf, themeManager: ThemeManager, settingsManager: SettingsManager, plugin: any) {
        super(leaf);
        this.themeManager = themeManager;
        this.settingsManager = settingsManager;
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_THEME_MANAGER;
    }

    getDisplayText(): string {
        return '主题管理';
    }

    getIcon(): string {
        return 'palette';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.classList.add('mp-theme-manager');

        this.contentEl = container.createEl('div', { cls: 'mp-theme-manager-content' });
        await this.renderContent();
    }

    private async renderContent(): Promise<void> {
        this.contentEl.empty();

        // 标题
        const header = this.contentEl.createEl('div', { cls: 'mp-tm-header' });
        header.createEl('h2', { text: '主题管理' });
        header.createEl('p', { text: '管理内置主题、云端主题和本地自定义 CSS 主题', cls: 'mp-tm-desc' });

        // 本地自定义主题区域（放在最前面）
        this.renderLocalSection();

        // 内置主题区域
        this.renderBuiltinSection();

        // 字体管理区域
        this.renderFontSection();
    }

    // ==================== 通用主题网格渲染 ====================

    /**
     * 在指定容器中渲染主题卡片网格
     */
    private renderThemeGrid(
        container: HTMLElement,
        themes: CSSTheme[],
        canDelete: boolean,
        emptyMessage?: string,
    ): void {
        const grid = container.createEl('div', { cls: 'mp-tm-theme-grid' });
        if (themes.length === 0 && emptyMessage) {
            grid.createEl('div', { text: emptyMessage, cls: 'mp-tm-empty' });
        } else {
            for (const theme of themes) {
                this.renderThemeCard(grid, theme, canDelete);
            }
        }
    }

    // ==================== 内置主题 ====================

    private renderBuiltinSection(): void {
        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        section.createEl('h3', { text: '📦 内置主题' });
        this.renderThemeGrid(section, this.themeManager.getThemesBySource(ThemeSource.BUILTIN), false);
    }

    // ==================== 云端主题 ====================

    private async renderRemoteSection(): Promise<void> {
        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        const sectionHeader = section.createEl('div', { cls: 'mp-tm-section-header' });
        sectionHeader.createEl('h3', { text: '☁️ 云端主题' });

        const refreshButton = sectionHeader.createEl('button', {
            text: '刷新列表',
            cls: 'mp-tm-refresh-btn',
        });

        // 已下载的云端主题
        const downloadedThemes = this.themeManager.getThemesBySource(ThemeSource.REMOTE);
        if (downloadedThemes.length > 0) {
            const downloadedSection = section.createEl('div', { cls: 'mp-tm-subsection' });
            downloadedSection.createEl('h4', { text: '已下载' });
            this.renderThemeGrid(downloadedSection, downloadedThemes, true);
        }

        // 可下载的云端主题
        const availableSection = section.createEl('div', { cls: 'mp-tm-subsection' });
        availableSection.createEl('h4', { text: '可下载' });
        const availableGrid = availableSection.createEl('div', { cls: 'mp-tm-theme-grid' });
        const loadingEl = availableGrid.createEl('div', { text: '加载中...', cls: 'mp-tm-loading' });

        // 加载云端主题索引
        const loadRemoteIndex = async () => {
            availableGrid.empty();
            const loadingIndicator = availableGrid.createEl('div', { text: '正在加载云端主题列表...', cls: 'mp-tm-loading' });

            try {
                const remoteIndex = await this.themeManager.fetchRemoteThemeIndex();
                availableGrid.empty();

                if (remoteIndex.length === 0) {
                    availableGrid.createEl('div', {
                        text: '暂无可用的云端主题，或无法连接到主题仓库',
                        cls: 'mp-tm-empty',
                    });
                    return;
                }

                // 过滤掉已下载的
                const downloadedIds = new Set(downloadedThemes.map(theme => theme.id.replace('remote-', '')));
                const availableThemes = remoteIndex.filter(item => !downloadedIds.has(item.id));

                if (availableThemes.length === 0) {
                    availableGrid.createEl('div', {
                        text: '所有云端主题已下载',
                        cls: 'mp-tm-empty',
                    });
                    return;
                }

                for (const themeInfo of availableThemes) {
                    this.renderRemoteThemeCard(availableGrid, themeInfo);
                }
            } catch (error) {
                availableGrid.empty();
                availableGrid.createEl('div', {
                    text: '加载云端主题失败，请检查网络连接',
                    cls: 'mp-tm-error',
                });
            }
        };

        refreshButton.addEventListener('click', loadRemoteIndex);
        await loadRemoteIndex();
    }

    /** 渲染云端主题卡片（未下载） */
    private renderRemoteThemeCard(container: HTMLElement, themeInfo: RemoteThemeIndex): void {
        const card = container.createEl('div', { cls: 'mp-tm-theme-card mp-tm-remote-card' });

        const cardHeader = card.createEl('div', { cls: 'mp-tm-card-header' });
        cardHeader.createEl('span', { text: themeInfo.name, cls: 'mp-tm-card-name' });
        if (themeInfo.author) {
            cardHeader.createEl('span', { text: `by ${themeInfo.author}`, cls: 'mp-tm-card-author' });
        }

        card.createEl('p', { text: themeInfo.description, cls: 'mp-tm-card-desc' });

        const actions = card.createEl('div', { cls: 'mp-tm-card-actions' });
        const downloadButton = actions.createEl('button', { text: '下载', cls: 'mp-tm-download-btn' });

        downloadButton.addEventListener('click', async () => {
            downloadButton.disabled = true;
            downloadButton.textContent = '下载中...';

            const theme = await this.themeManager.downloadRemoteTheme(themeInfo);
            if (theme) {
                new Notice(`主题「${themeInfo.name}」下载成功`);
                await this.renderContent();
            } else {
                downloadButton.disabled = false;
                downloadButton.textContent = '下载';
            }
        });
    }

    // ==================== 本地自定义主题 ====================

    private renderLocalSection(): void {
        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        const sectionHeader = section.createEl('div', { cls: 'mp-tm-section-header' });
        sectionHeader.createEl('h3', { text: '📁 本地自定义主题' });

        const addButton = sectionHeader.createEl('button', {
            text: '+ 新建主题',
            cls: 'mp-tm-add-btn',
        });

        const reloadButton = sectionHeader.createEl('button', {
            text: '重新加载',
            cls: 'mp-tm-refresh-btn',
        });

        // 已有的本地主题
        const localThemes = this.themeManager.getThemesBySource(ThemeSource.LOCAL);
        this.renderThemeGrid(
            section,
            localThemes,
            true,
            '暂无本地自定义主题。点击「新建主题」创建，或将 .css 文件放入插件目录的 custom/ 文件夹中。',
        );

        // CSS 编辑区域（新建主题时显示）
        const editorSection = section.createEl('div', { cls: 'mp-tm-editor-section mp-tm-hidden' });

        addButton.addEventListener('click', () => {
            editorSection.classList.toggle('mp-tm-hidden');
            if (!editorSection.classList.contains('mp-tm-hidden')) {
                this.renderCSSEditor(editorSection);
            }
        });

        reloadButton.addEventListener('click', async () => {
            await this.themeManager.reloadLocalThemes();
            new Notice('本地主题已重新加载');
            await this.renderContent();
        });
    }

    /** 渲染 CSS 编辑器（新建/编辑本地主题） */
    private renderCSSEditor(container: HTMLElement, existingTheme?: CSSTheme): void {
        container.empty();

        container.createEl('h4', { text: existingTheme ? '编辑主题' : '新建本地主题' });

        // 主题名称
        const nameGroup = container.createEl('div', { cls: 'mp-tm-form-group' });
        nameGroup.createEl('label', { text: '主题名称' });
        const nameInput = nameGroup.createEl('input', {
            type: 'text',
            cls: 'mp-tm-input',
            placeholder: '输入主题名称（英文，用于文件名）',
            value: existingTheme?.name || '',
        });

        // CSS 内容
        const cssGroup = container.createEl('div', { cls: 'mp-tm-form-group' });
        cssGroup.createEl('label', { text: 'CSS 内容' });
        cssGroup.createEl('p', {
            text: '使用 .mp-content-section 作为根选择器，例如：.mp-content-section h1 { color: red; }',
            cls: 'mp-tm-hint',
        });

        const cssTextarea = cssGroup.createEl('textarea', {
            cls: 'mp-tm-css-editor',
            placeholder: `.mp-content-section {
    font-size: 16px;
    color: #333;
    line-height: 1.8;
}

.mp-content-section h1 {
    color: #1a1a2e;
    font-size: 1.8em;
    border-bottom: 2px solid #1a1a2e;
}

/* 更多样式... */`,
        });
        cssTextarea.value = existingTheme?.css || '';
        cssTextarea.rows = 20;

        // 按钮组
        const buttonGroup = container.createEl('div', { cls: 'mp-tm-button-group' });

        const saveButton = buttonGroup.createEl('button', {
            text: existingTheme ? '保存修改' : '创建主题',
            cls: 'mp-tm-save-btn',
        });

        const cancelButton = buttonGroup.createEl('button', {
            text: '取消',
            cls: 'mp-tm-cancel-btn',
        });

        saveButton.addEventListener('click', async () => {
            const themeName = nameInput.value.trim();
            const cssContent = cssTextarea.value.trim();

            if (!themeName) {
                new Notice('请输入主题名称');
                return;
            }

            if (!cssContent) {
                new Notice('请输入 CSS 内容');
                return;
            }

            // 验证名称格式（仅允许英文、数字、连字符）
            if (!/^[a-zA-Z0-9\-_\u4e00-\u9fff]+$/.test(themeName)) {
                new Notice('主题名称只能包含字母、数字、连字符、下划线和中文');
                return;
            }

            try {
                if (existingTheme) {
                    // 检查名称是否改变
                    if (themeName !== existingTheme.name) {
                        // 名称改变，需要重命名
                        const success = await this.themeManager.renameLocalTheme(existingTheme.id, themeName);
                        if (!success) {
                            new Notice('重命名失败，可能名称已存在');
                            return;
                        }
                        // 重命名后更新 CSS
                        const newThemeId = `local-${themeName}`;
                        await this.themeManager.updateLocalTheme(newThemeId, cssContent);
                        new Notice(`主题「${themeName}」已更新`);
                    } else {
                        // 名称未变，只更新 CSS
                        await this.themeManager.updateLocalTheme(existingTheme.id, cssContent);
                        new Notice(`主题「${themeName}」已更新`);
                    }
                } else {
                    await this.themeManager.saveLocalTheme(themeName, cssContent);
                    new Notice(`主题「${themeName}」已创建`);
                }
                await this.renderContent();
            } catch (error) {
                new Notice('保存主题失败: ' + (error as Error).message);
            }
        });

        cancelButton.addEventListener('click', () => {
            container.classList.add('mp-tm-hidden');
        });
    }

    // ==================== 字体管理 ====================

    private renderFontSection(): void {
        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        section.createEl('h3', { text: '🔤 内置字体' });

        const fontOptions = this.themeManager.getFontOptions();
        const fontList = section.createEl('div', { cls: 'mp-tm-font-list' });

        for (const font of fontOptions) {
            const fontItem = fontList.createEl('div', { cls: 'mp-tm-font-item' });

            const fontInfo = fontItem.createEl('div', { cls: 'mp-tm-font-info' });
            fontInfo.createEl('span', { text: font.label, cls: 'mp-tm-font-name' });
            fontInfo.createEl('span', { text: font.value, cls: 'mp-tm-font-value' });
            fontItem.createEl('span', { text: '内置', cls: 'mp-tm-font-badge' });
        }
    }

    // ==================== 通用主题卡片 ====================

    /** 渲染主题卡片 */
    private renderThemeCard(container: HTMLElement, theme: CSSTheme, canDelete: boolean): void {
        const activeTheme = this.themeManager.getActiveTheme();
        const isActive = activeTheme?.id === theme.id;

        const card = container.createEl('div', {
            cls: `mp-tm-theme-card ${isActive ? 'mp-tm-card-active' : ''}`,
        });

        const cardHeader = card.createEl('div', { cls: 'mp-tm-card-header' });
        cardHeader.createEl('span', { text: theme.name, cls: 'mp-tm-card-name' });

        const sourceLabel = theme.source === ThemeSource.BUILTIN ? '内置'
            : theme.source === ThemeSource.REMOTE ? '云端'
            : '本地';
        cardHeader.createEl('span', { text: sourceLabel, cls: `mp-tm-card-source mp-tm-source-${theme.source}` });

        if (theme.description) {
            card.createEl('p', { text: theme.description, cls: 'mp-tm-card-desc' });
        }

        // CSS 预览（截取前几行）
        const previewLines = theme.css.split('\n').slice(0, 5).join('\n');
        const previewEl = card.createEl('pre', { cls: 'mp-tm-card-preview' });
        previewEl.createEl('code', { text: previewLines + '\n...' });

        // 完整 CSS 查看区域（默认隐藏）
        const fullCssContainer = card.createEl('div', { cls: 'mp-tm-full-css mp-tm-hidden' });
        const fullCssToolbar = fullCssContainer.createEl('div', { cls: 'mp-tm-full-css-toolbar' });
        const copyCssButton = fullCssToolbar.createEl('button', { text: '复制 CSS', cls: 'mp-tm-copy-css-btn' });
        copyCssButton.addEventListener('click', async () => {
            await navigator.clipboard.writeText(theme.css);
            copyCssButton.textContent = '已复制 ✓';
            setTimeout(() => { copyCssButton.textContent = '复制 CSS'; }, 2000);
        });
        const fullCssEl = fullCssContainer.createEl('pre', { cls: 'mp-tm-full-css-content' });
        fullCssEl.createEl('code', { text: theme.css });

        const actions = card.createEl('div', { cls: 'mp-tm-card-actions' });

        if (!isActive) {
            const useButton = actions.createEl('button', { text: '使用', cls: 'mp-tm-use-btn' });
            useButton.addEventListener('click', async () => {
                this.themeManager.setActiveTheme(theme.id);
                await this.settingsManager.updateSettings({ activeThemeId: theme.id });
                new Notice(`已切换到主题「${theme.name}」`);
                await this.renderContent();
            });
        } else {
            actions.createEl('span', { text: '✓ 当前使用', cls: 'mp-tm-active-label' });
        }

        // 查看 CSS 按钮
        const viewCssButton = actions.createEl('button', { text: '查看 CSS', cls: 'mp-tm-view-css-btn' });
        viewCssButton.addEventListener('click', () => {
            const isHidden = fullCssContainer.classList.contains('mp-tm-hidden');
            fullCssContainer.classList.toggle('mp-tm-hidden');
            previewEl.classList.toggle('mp-tm-hidden');
            viewCssButton.textContent = isHidden ? '收起 CSS' : '查看 CSS';
        });

        // 编辑按钮（仅本地主题）
        if (theme.source === ThemeSource.LOCAL) {
            const editButton = actions.createEl('button', { text: '编辑', cls: 'mp-tm-edit-btn' });
            editButton.addEventListener('click', () => {
                const editorSection = this.contentEl.querySelector('.mp-tm-editor-section');
                if (editorSection) {
                    editorSection.classList.remove('mp-tm-hidden');
                    this.renderCSSEditor(editorSection as HTMLElement, theme);
                }
            });
        }

        // 删除按钮
        if (canDelete) {
            const deleteButton = actions.createEl('button', { text: '删除', cls: 'mp-tm-delete-btn' });
            deleteButton.addEventListener('click', () => {
                new ConfirmModal(
                    this.app,
                    '确认删除主题',
                    `确定要删除「${theme.name}」主题吗？此操作不可恢复。`,
                    async () => {
                        if (theme.source === ThemeSource.REMOTE) {
                            await this.themeManager.deleteRemoteTheme(theme.id);
                        } else if (theme.source === ThemeSource.LOCAL) {
                            await this.themeManager.deleteLocalTheme(theme.id);
                        }
                        new Notice(`主题「${theme.name}」已删除`);
                        await this.renderContent();
                    },
                ).open();
            });
        }
    }

    async onClose(): Promise<void> {
        this.contentEl?.empty();
    }
}
