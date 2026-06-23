import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type { ThemeManager } from './themeManager';
import { ThemeSource } from './types/css-theme';

export const VIEW_TYPE_THEME_CSS = 'mp-theme-css';

/**
 * CSS 代码查看视图
 * 默认以只读高亮模式显示 CSS 代码
 * 自定义主题可切换到编辑模式
 */
export class ThemeCSSView extends ItemView {
    private themeManager: ThemeManager;
    private themeId: string;
    private themeName: string;
    private isEditing: boolean = false;
    private editedCSS: string = '';

    constructor(leaf: WorkspaceLeaf, themeManager: ThemeManager) {
        super(leaf);
        this.themeManager = themeManager;
        this.themeId = '';
        this.themeName = '';
    }

    getViewType(): string {
        return VIEW_TYPE_THEME_CSS;
    }

    getDisplayText(): string {
        return this.themeName ? `CSS：${this.themeName}` : '主题 CSS';
    }

    getIcon(): string {
        return 'code';
    }

    setTheme(themeId: string, themeName: string): void {
        this.themeId = themeId;
        this.themeName = themeName;
        this.isEditing = false;
        this.editedCSS = '';
    }

    /** 刷新内容（供外部复用窗口时调用） */
    async refresh(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        if (!container) return;
        container.empty();
        container.classList.add('mp-theme-css-container');
        this.renderCSS(container);

        // Obsidian 内部 API，无公开类型定义
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaf.updateHeader is an internal API with no public type
        (this.leaf as any).updateHeader?.();
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.classList.add('mp-theme-css-container');

        this.renderCSS(container);
        await Promise.resolve();
    }

    private renderCSS(container: HTMLElement): void {
        container.empty();

        const theme = this.themeId ? this.themeManager.getTheme(this.themeId) : null;
        if (!theme) {
            container.createEl('div', {
                text: '未找到主题',
                cls: 'mp-theme-css-empty',
            });
            return;
        }

        const isLocalTheme = theme.source === ThemeSource.LOCAL;

        // 工具栏：标题 | 状态 | 操作按钮
        const toolbar = container.createEl('div', { cls: 'mp-theme-css-toolbar' });

        let nameInput: HTMLInputElement | null = null;
        if (this.isEditing && isLocalTheme) {
            nameInput = toolbar.createEl('input', {
                type: 'text',
                cls: 'mp-theme-css-title-input',
                value: theme.name,
            });
            nameInput.spellcheck = false;
        } else {
            toolbar.createEl('span', {
                text: theme.name,
                cls: 'mp-theme-css-title',
            });
        }

        toolbar.createEl('span', {
            text: this.isEditing ? '编辑中' : '只读',
            cls: `mp-theme-css-badge ${this.isEditing ? 'mp-theme-css-badge-editing' : ''}`,
        });

        const toolbarActions = toolbar.createEl('div', { cls: 'mp-theme-css-actions' });

        // 复制按钮（文字）
        const copyButton = toolbarActions.createEl('button', {
            text: '复制',
            cls: 'mp-theme-css-text-btn',
        });

        copyButton.addEventListener('click', async () => {
            const cssContent = this.isEditing
                ? (container.querySelector('.mp-theme-css-editor') as HTMLTextAreaElement)?.value || theme.css
                : theme.css;
            await navigator.clipboard.writeText(cssContent);
            copyButton.textContent = '已复制';
            window.setTimeout(() => { copyButton.textContent = '复制'; }, 1500);
        });

        // 自定义主题：编辑 / 保存按钮
        if (isLocalTheme) {
            if (this.isEditing) {
                const saveButton = toolbarActions.createEl('button', {
                    text: '保存',
                    cls: 'mp-theme-css-text-btn mp-theme-css-save-btn',
                });

                saveButton.addEventListener('click', async () => {
                    const textarea = container.querySelector('.mp-theme-css-editor') as HTMLTextAreaElement;
                    if (!textarea) return;

                    const newCSS = textarea.value.trim();
                    if (!newCSS) {
                        new Notice('CSS 内容不能为空');
                        return;
                    }

                    const newName = nameInput?.value.trim() || theme.name;
                    if (!/^[a-zA-Z0-9\-_\u4e00-\u9fff]+$/.test(newName)) {
                        new Notice('名称只能包含字母、数字、连字符、下划线和中文');
                        return;
                    }

                    try {
                        let currentThemeId = theme.id;

                        if (newName !== theme.name) {
                            const success = await this.themeManager.renameLocalTheme(theme.id, newName);
                            if (!success) {
                                new Notice('重命名失败，名称可能已存在');
                                return;
                            }
                            currentThemeId = `local-${newName}`;
                            this.themeId = currentThemeId;
                            this.themeName = newName;
                        }

                        await this.themeManager.updateLocalTheme(currentThemeId, newCSS);
                        this.isEditing = false;
                        this.editedCSS = '';
                        new Notice(`已保存「${newName}」`);
                        (this.leaf as any).updateHeader?.();
                        this.renderCSS(container);
                    } catch (error) {
                        new Notice('保存失败: ' + (error as Error).message);
                    }
                });
            } else {
                const editButton = toolbarActions.createEl('button', {
                    text: '编辑',
                    cls: 'mp-theme-css-text-btn',
                });

                editButton.addEventListener('click', () => {
                    this.isEditing = true;
                    this.editedCSS = theme.css;
                    this.renderCSS(container);
                });
            }
        }

        // 代码区域
        const codeWrapper = container.createEl('div', { cls: 'mp-theme-css-code-wrapper' });

        if (this.isEditing) {
            const textarea = codeWrapper.createEl('textarea', {
                cls: 'mp-theme-css-editor',
            });
            textarea.value = this.editedCSS || theme.css;
            textarea.spellcheck = false;

            // Tab 键缩进
            textarea.addEventListener('keydown', (event) => {
                if (event.key === 'Tab') {
                    event.preventDefault();
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                    textarea.selectionStart = textarea.selectionEnd = start + 4;
                }
            });

            // 记住编辑内容
            textarea.addEventListener('input', () => {
                this.editedCSS = textarea.value;
            });

            // 自动聚焦
            window.setTimeout(() => textarea.focus(), 50);
        } else {
            const preEl = codeWrapper.createEl('pre', { cls: 'mp-theme-css-code' });
            const codeEl = preEl.createEl('code', { cls: 'language-css' });
            this.renderHighlightedCSS(codeEl, theme.css);
        }
    }

    /** 简单的 CSS 语法高亮 */
    private renderHighlightedCSS(codeEl: HTMLElement, css: string): void {
        const lines = css.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            if (lineIndex > 0) {
                codeEl.appendText('\n');
            }

            // 注释行
            const trimmedLine = line.replace(/^\s+/, '');
            if (trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
                codeEl.createEl('span', { cls: 'css-hl-comment', text: line });
                continue;
            }

            // 逐字符解析
            let remaining = line;
            while (remaining.length > 0) {
                // 属性值中的颜色
                const colorMatch = remaining.match(/^(#[0-9a-fA-F]{3,8})\b/);
                if (colorMatch) {
                    codeEl.createEl('span', { cls: 'css-hl-color', text: colorMatch[1] });
                    remaining = remaining.substring(colorMatch[1].length);
                    continue;
                }

                // 数值 + 单位
                const numberMatch = remaining.match(/^(-?\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms|deg|fr)?/);
                if (numberMatch && numberMatch[0].length > 0) {
                    codeEl.createEl('span', { cls: 'css-hl-number', text: numberMatch[0] });
                    remaining = remaining.substring(numberMatch[0].length);
                    continue;
                }

                // 字符串
                const stringMatch = remaining.match(/^(['"])(.*?)\1/);
                if (stringMatch) {
                    codeEl.createEl('span', { cls: 'css-hl-string', text: stringMatch[0] });
                    remaining = remaining.substring(stringMatch[0].length);
                    continue;
                }

                // CSS 属性名（冒号前）
                const propMatch = remaining.match(/^([a-z-]+)(\s*:)/);
                if (propMatch) {
                    codeEl.createEl('span', { cls: 'css-hl-property', text: propMatch[1] });
                    codeEl.appendText(propMatch[2]);
                    remaining = remaining.substring(propMatch[0].length);
                    continue;
                }

                // 选择器中的类名
                const classMatch = remaining.match(/^(\.[a-zA-Z_-][a-zA-Z0-9_-]*)/);
                if (classMatch) {
                    codeEl.createEl('span', { cls: 'css-hl-selector', text: classMatch[1] });
                    remaining = remaining.substring(classMatch[1].length);
                    continue;
                }

                // 花括号
                if (remaining[0] === '{' || remaining[0] === '}') {
                    codeEl.createEl('span', { cls: 'css-hl-bracket', text: remaining[0] });
                    remaining = remaining.substring(1);
                    continue;
                }

                // 普通字符
                codeEl.appendText(remaining[0]);
                remaining = remaining.substring(1);
            }
        }
    }

    async onClose(): Promise<void> {
        this.containerEl.children[1]?.empty();
        await Promise.resolve();
    }
}
