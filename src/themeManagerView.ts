import { ItemView, WorkspaceLeaf, Notice, setIcon } from 'obsidian';
import type { ThemeManager } from './themeManager';
import type { SettingsManager } from './settings/settings';
import { ThemeSource, CSSTheme, RemoteThemeIndex } from './types/css-theme';
import { ConfirmModal } from './settings/ConfirmModal';
import { ThemePreviewView, VIEW_TYPE_THEME_PREVIEW } from './themePreviewView';
import { ThemeCSSView, VIEW_TYPE_THEME_CSS } from './themeCSSView';
import type MPPublisherPlugin from './main';

export const VIEW_TYPE_THEME_MANAGER = 'mp-theme-manager';

/**
 * 主题管理界面
 * 通过命令打开，管理内置、云端、本地三层主题
 */
export class ThemeManagerView extends ItemView {
    private themeManager: ThemeManager;
    private settingsManager: SettingsManager;
    private plugin: MPPublisherPlugin;

    constructor(leaf: WorkspaceLeaf, themeManager: ThemeManager, settingsManager: SettingsManager, plugin: MPPublisherPlugin) {
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
        this.renderContent();
        await Promise.resolve();
    }

    private renderContent(): void {
        this.contentEl.empty();

        // 使用说明（可折叠）
        this.renderGuide();

        // 自定义主题 → 社区投稿 → 内置
        this.renderLocalSection();
        this.renderCommunitySection();
        this.renderBuiltinSection();
    }

    private renderGuide(): void {
        const details = this.contentEl.createEl('details', { cls: 'mp-tm-guide' });
        details.createEl('summary', { text: '使用说明' });
        const content = details.createEl('div', { cls: 'mp-tm-guide-content' });
        content.createEl('p', { text: '点击主题卡片切换当前使用的主题。' });
        const list = content.createEl('ul');
        list.createEl('li', { text: '☑ 勾选框 — 控制该主题是否出现在预览界面的快速切换下拉列表中' });
        list.createEl('li', { text: '👁 预览 — 在侧边栏中预览该主题的效果' });
        list.createEl('li', { text: '</> 代码 — 查看或编辑主题的 CSS 源码' });
    }

    // ==================== 内置主题 ====================

    private renderBuiltinSection(): void {
        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        const sectionHeader = section.createEl('div', { cls: 'mp-tm-section-header' });
        sectionHeader.createEl('h3', { text: '内置主题' });

        const builtinThemes = this.themeManager.getThemesBySource(ThemeSource.BUILTIN);
        const grid = section.createEl('div', { cls: 'mp-tm-theme-grid' });

        for (const theme of builtinThemes) {
            this.renderThemeCard(grid, theme, false);
        }
    }

    // ==================== 社区投稿主题 ====================

    private renderCommunitySection(): void {
        const communityThemes = this.themeManager.getThemesBySource(ThemeSource.COMMUNITY);
        if (communityThemes.length === 0) return;

        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        const sectionHeader = section.createEl('div', { cls: 'mp-tm-section-header' });
        sectionHeader.createEl('h3', { text: '社区投稿' });

        const grid = section.createEl('div', { cls: 'mp-tm-theme-grid' });

        for (const theme of communityThemes) {
            this.renderThemeCard(grid, theme, false);
        }
    }

    // ==================== 云端主题 ====================

    private async renderRemoteSection(): Promise<void> {
        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        const sectionHeader = section.createEl('div', { cls: 'mp-tm-section-header' });
        sectionHeader.createEl('h3', { text: '云端主题' });

        const refreshButton = sectionHeader.createEl('button', {
            cls: 'mp-tm-icon-btn',
            attr: { 'aria-label': '刷新列表' },
        });
        setIcon(refreshButton, 'refresh-cw');

        const downloadedThemes = this.themeManager.getThemesBySource(ThemeSource.REMOTE);
        if (downloadedThemes.length > 0) {
            const grid = section.createEl('div', { cls: 'mp-tm-theme-grid' });
            for (const theme of downloadedThemes) {
                this.renderThemeCard(grid, theme, true);
            }
        }

        const availableGrid = section.createEl('div', { cls: 'mp-tm-theme-grid' });

        const loadRemoteIndex = async () => {
            availableGrid.empty();
            availableGrid.createEl('div', { text: '正在加载…', cls: 'mp-tm-loading' });

            try {
                const remoteIndex = await this.themeManager.fetchRemoteThemeIndex();
                availableGrid.empty();

                if (remoteIndex.length === 0) {
                    availableGrid.createEl('div', {
                        text: '暂无可用的云端主题',
                        cls: 'mp-tm-empty',
                    });
                    return;
                }

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
            } catch {
                availableGrid.empty();
                availableGrid.createEl('div', {
                    text: '加载失败，请检查网络连接',
                    cls: 'mp-tm-error',
                });
            }
        };

        refreshButton.addEventListener('click', () => void loadRemoteIndex());
        await loadRemoteIndex();
    }

    private renderRemoteThemeCard(container: HTMLElement, themeInfo: RemoteThemeIndex): void {
        const card = container.createEl('div', { cls: 'mp-tm-theme-card' });

        const cardBody = card.createEl('div', { cls: 'mp-tm-card-body' });
        const nameRow = cardBody.createEl('div', { cls: 'mp-tm-card-name-row' });
        nameRow.createEl('span', { text: themeInfo.name, cls: 'mp-tm-card-name' });
        if (themeInfo.author) {
            nameRow.createEl('span', { text: themeInfo.author, cls: 'mp-tm-card-author' });
        }

        if (themeInfo.description) {
            cardBody.createEl('p', { text: themeInfo.description, cls: 'mp-tm-card-desc' });
        }

        const downloadButton = card.createEl('button', { text: '下载', cls: 'mp-tm-primary-btn' });
        downloadButton.addEventListener('click', () => {
            void (async () => {
                downloadButton.disabled = true;
                downloadButton.textContent = '下载中…';

                const theme = await this.themeManager.downloadRemoteTheme(themeInfo);
                if (theme) {
                    new Notice(`已下载「${themeInfo.name}」`);
                    this.renderContent();
                } else {
                    downloadButton.disabled = false;
                    downloadButton.textContent = '下载';
                }
            })();
        });
    }

    // ==================== 本地自定义主题 ====================

    private renderLocalSection(): void {
        const section = this.contentEl.createEl('div', { cls: 'mp-tm-section' });
        const sectionHeader = section.createEl('div', { cls: 'mp-tm-section-header' });
        sectionHeader.createEl('h3', { text: '自定义主题' });

        const headerActions = sectionHeader.createEl('div', { cls: 'mp-tm-header-actions' });

        // 投稿 - 刷新 - 新建（从左到右）
        const submitButton = headerActions.createEl('button', {
            cls: 'mp-tm-icon-btn',
            attr: { 'aria-label': '投稿主题' },
        });
        setIcon(submitButton, 'upload');

        const reloadButton = headerActions.createEl('button', {
            cls: 'mp-tm-icon-btn',
            attr: { 'aria-label': '重新加载' },
        });
        setIcon(reloadButton, 'refresh-cw');

        const addButton = headerActions.createEl('button', {
            cls: 'mp-tm-icon-btn',
            attr: { 'aria-label': '新建主题' },
        });
        setIcon(addButton, 'plus');

        const localThemes = this.themeManager.getThemesBySource(ThemeSource.LOCAL);
        const grid = section.createEl('div', { cls: 'mp-tm-theme-grid' });

        if (localThemes.length === 0) {
            const emptyState = grid.createEl('div', { cls: 'mp-tm-empty' });
            const emptyIcon = emptyState.createEl('span', { cls: 'mp-tm-empty-icon' });
            setIcon(emptyIcon, 'palette');
            emptyState.createEl('span', { text: '还没有自定义主题' });
            emptyState.createEl('span', {
                text: '点击 + 新建，或将 .css 文件放入 custom/ 文件夹',
                cls: 'mp-tm-empty-hint',
            });
        } else {
            for (const theme of localThemes) {
                this.renderThemeCard(grid, theme, true);
            }
        }

        const editorSection = section.createEl('div', { cls: 'mp-tm-editor-section mp-tm-hidden' });

        submitButton.addEventListener('click', () => {
            const title = encodeURIComponent('主题投稿：');
            const body = encodeURIComponent(
`## 主题信息

- **主题名称**：
- **作者**：
- **简短描述**：

## 样式截图

> 请提供至少一张使用该主题后的公众号预览截图

## CSS 内容

<details>
<summary>点击展开 CSS 代码</summary>

\`\`\`css
/* 在此粘贴你的主题 CSS */
\`\`\`

</details>

## 自查清单

- [ ] 所有选择器以 \`.mp-content-section\` 开头
- [ ] 没有使用 CSS 变量、@media、@font-face、伪元素、!important
- [ ] 已阅读 [CSS 主题开发指南](https://github.com/joeytoday/obsidian-mp-publisher/blob/main/CSS_THEME_GUIDE.md)
`);
            const issueUrl = `https://github.com/joeytoday/obsidian-mp-publisher/issues/new?labels=theme&title=${title}&body=${body}`;
            window.open(issueUrl);
        });

        addButton.addEventListener('click', () => {
            editorSection.classList.toggle('mp-tm-hidden');
            if (!editorSection.classList.contains('mp-tm-hidden')) {
                this.renderCSSEditor(editorSection);
                editorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        reloadButton.addEventListener('click', () => {
            void (async () => {
                await this.themeManager.reloadLocalThemes();
                new Notice('已重新加载');
                this.renderContent();
            })();
        });
    }

    private renderCSSEditor(container: HTMLElement, existingTheme?: CSSTheme): void {
        container.empty();

        container.createEl('h4', { text: existingTheme ? '编辑主题' : '新建主题' });

        const nameGroup = container.createEl('div', { cls: 'mp-tm-form-group' });
        nameGroup.createEl('label', { text: '名称' });
        const nameInput = nameGroup.createEl('input', {
            type: 'text',
            cls: 'mp-tm-input',
            placeholder: '如 my-theme（字母、数字、连字符）',
            value: existingTheme?.name || '',
        });

        const cssGroup = container.createEl('div', { cls: 'mp-tm-form-group' });
        cssGroup.createEl('label', { text: 'CSS' });
        cssGroup.createEl('p', {
            text: '以 .mp-content-section 作为根选择器',
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
}`,
        });
        cssTextarea.value = existingTheme?.css || '';
        cssTextarea.rows = 16;

        const buttonGroup = container.createEl('div', { cls: 'mp-tm-button-group' });

        const saveButton = buttonGroup.createEl('button', {
            text: existingTheme ? '保存' : '创建',
            cls: 'mp-tm-primary-btn',
        });

        const cancelButton = buttonGroup.createEl('button', {
            text: '取消',
            cls: 'mp-tm-ghost-btn',
        });

        saveButton.addEventListener('click', () => {
            void (async () => {
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

                if (!/^[a-zA-Z0-9\-_\u4e00-\u9fff]+$/.test(themeName)) {
                    new Notice('名称只能包含字母、数字、连字符、下划线和中文');
                    return;
                }

                try {
                    if (existingTheme) {
                        if (themeName !== existingTheme.name) {
                            const success = await this.themeManager.renameLocalTheme(existingTheme.id, themeName);
                            if (!success) {
                                new Notice('重命名失败，名称可能已存在');
                                return;
                            }
                            const newThemeId = `local-${themeName}`;
                            await this.themeManager.updateLocalTheme(newThemeId, cssContent);
                        } else {
                            await this.themeManager.updateLocalTheme(existingTheme.id, cssContent);
                        }
                        new Notice(`已更新「${themeName}」`);
                    } else {
                        await this.themeManager.saveLocalTheme(themeName, cssContent);
                        new Notice(`已创建「${themeName}」`);
                    }
                    this.renderContent();
                } catch (error) {
                    new Notice('保存失败: ' + (error as Error).message);
                }
            })();
        });

        cancelButton.addEventListener('click', () => {
            container.classList.add('mp-tm-hidden');
        });
    }

    // ==================== 通用主题卡片 ====================

    private renderThemeCard(container: HTMLElement, theme: CSSTheme, canDelete: boolean): void {
        const activeTheme = this.themeManager.getActiveTheme();
        const isActive = activeTheme?.id === theme.id;

        const card = container.createEl('div', {
            cls: `mp-tm-theme-card ${isActive ? 'mp-tm-card-active' : ''}`,
        });

        // 点击整行切换主题
        card.addEventListener('click', () => {
            void (async () => {
                if (isActive) return;
                this.themeManager.setActiveTheme(theme.id);
                await this.settingsManager.updateSettings({ activeThemeId: theme.id });
                new Notice(`已切换到「${theme.name}」`);
                this.renderContent();
            })();
        });

        // 卡片主体
        const cardBody = card.createEl('div', { cls: 'mp-tm-card-body' });
        const nameRow = cardBody.createEl('div', { cls: 'mp-tm-card-name-row' });

        if (isActive) {
            const checkIcon = nameRow.createEl('span', { cls: 'mp-tm-check-icon' });
            setIcon(checkIcon, 'check');
        }

        nameRow.createEl('span', { text: theme.name, cls: 'mp-tm-card-name' });

        if (theme.author) {
            if (theme.authorUrl) {
                const authorLink = nameRow.createEl('a', {
                    text: theme.author,
                    cls: 'mp-tm-card-author',
                    href: theme.authorUrl,
                });
                authorLink.addEventListener('click', (event) => {
                    event.stopPropagation();
                    window.open(theme.authorUrl, '_blank');
                    event.preventDefault();
                });
            } else {
                nameRow.createEl('span', { text: theme.author, cls: 'mp-tm-card-author' });
            }
        }

        if (theme.description) {
            cardBody.createEl('p', { text: theme.description, cls: 'mp-tm-card-desc' });
        }

        // 次要操作（hover 时显示）
        const actions = card.createEl('div', { cls: 'mp-tm-card-actions' });

        // 快速切换复选框（预览按钮左边）
        const isQuickSwitchVisible = this.themeManager.isThemeQuickSwitchVisible(theme.id);
        const checkbox = actions.createEl('input', {
            type: 'checkbox',
            cls: 'mp-tm-quick-checkbox',
            attr: { 'aria-label': '加入快速切换' },
        }) as HTMLInputElement;
        checkbox.checked = isQuickSwitchVisible;
        checkbox.addEventListener('click', (event) => event.stopPropagation());
        checkbox.addEventListener('change', () => {
            void this.themeManager.setThemeQuickSwitchVisible(theme.id, checkbox.checked);
        });

        const previewButton = actions.createEl('button', {
            cls: 'mp-tm-icon-btn',
            attr: { 'aria-label': '预览效果' },
        });
        setIcon(previewButton, 'eye');
        previewButton.addEventListener('click', (event) => {
            event.stopPropagation();
            void this.openThemePreview(theme);
        });

        const codeButton = actions.createEl('button', {
            cls: 'mp-tm-icon-btn',
            attr: { 'aria-label': '查看 CSS' },
        });
        setIcon(codeButton, 'code');
        codeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            void this.openThemeCSS(theme);
        });

        if (canDelete) {
            const deleteButton = actions.createEl('button', {
                cls: 'mp-tm-icon-btn mp-tm-icon-danger',
                attr: { 'aria-label': '删除' },
            });
            setIcon(deleteButton, 'trash-2');
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                new ConfirmModal(
                    this.app,
                    '删除主题',
                    `删除「${theme.name}」？此操作不可恢复。`,
                    async () => {
                        if (theme.source === ThemeSource.REMOTE) {
                            await this.themeManager.deleteRemoteTheme(theme.id);
                        } else if (theme.source === ThemeSource.LOCAL) {
                            await this.themeManager.deleteLocalTheme(theme.id);
                        }
                        new Notice(`已删除「${theme.name}」`);
                        this.renderContent();
                    },
                ).open();
            });
        }
    }

    /** 在右侧窗口中打开主题预览（复用已有窗口） */
    private async openThemePreview(theme: CSSTheme): Promise<void> {
        const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_THEME_PREVIEW);
        let leaf: WorkspaceLeaf;

        if (existingLeaves.length > 0) {
            leaf = existingLeaves[0];
            void this.app.workspace.revealLeaf(leaf);
        } else {
            leaf = this.app.workspace.getLeaf('split', 'vertical');
            await leaf.setViewState({
                type: VIEW_TYPE_THEME_PREVIEW,
                active: true,
            });
        }

        const view = leaf.view as ThemePreviewView;
        if (view && view.setTheme) {
            view.setTheme(theme.id, theme.name);
            await view.refresh();
        }
    }

    /** 在新窗口中打开 CSS 代码查看（复用已有窗口） */
    private async openThemeCSS(theme: CSSTheme): Promise<void> {
        const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_THEME_CSS);
        let leaf: WorkspaceLeaf;

        if (existingLeaves.length > 0) {
            leaf = existingLeaves[0];
            void this.app.workspace.revealLeaf(leaf);
        } else {
            leaf = this.app.workspace.getLeaf('split', 'vertical');
            await leaf.setViewState({
                type: VIEW_TYPE_THEME_CSS,
                active: true,
            });
        }

        const view = leaf.view as ThemeCSSView;
        if (view && view.setTheme) {
            view.setTheme(theme.id, theme.name);
            await view.refresh();
        }
    }

    async onClose(): Promise<void> {
        this.contentEl?.empty();
        await Promise.resolve();
    }
}
