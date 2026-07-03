import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component } from 'obsidian';
import { MPConverter } from './converter';
import type { ThemeManager } from './themeManager';

/** WorkspaceLeaf internal API that includes updateHeader for refreshing view headers */
interface LeafWithUpdateHeader extends WorkspaceLeaf {
    updateHeader?: () => void;
}

export const VIEW_TYPE_THEME_PREVIEW = 'mp-theme-preview';

const SAMPLE_MARKDOWN = `# 标题示例

这是一段正文内容，用于展示主题的排版效果。**加粗文字**和*斜体文字*在这里展示。

## 二级标题

> 引用块：好的设计是尽可能少的设计。—— Dieter Rams

### 三级标题

- 无序列表项 A
- 无序列表项 B
  - 嵌套列表项
- 无序列表项 C

1. 有序列表项一
2. 有序列表项二
3. 有序列表项三

这是一段包含\`行内代码\`的文字。下面是代码块：

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}
\`\`\`

| 表头 A | 表头 B | 表头 C |
|--------|--------|--------|
| 单元格 | 单元格 | 单元格 |
| 单元格 | 单元格 | 单元格 |

---

![图片描述示例](https://picsum.photos/seed/mpublisher/400/250)

正文段落，展示行间距和字体效果。中文排版需要关注字间距、行高和段落间距的协调。
`;

/**
 * 主题预览视图
 * 用示例 Markdown 渲染主题效果，在独立窗口中展示
 */
export class ThemePreviewView extends ItemView {
    private themeManager: ThemeManager;
    private themeId: string;
    private themeName: string;
    private renderComponent: Component | null = null;

    constructor(leaf: WorkspaceLeaf, themeManager: ThemeManager) {
        super(leaf);
        this.themeManager = themeManager;
        this.themeId = '';
        this.themeName = '';
    }

    getViewType(): string {
        return VIEW_TYPE_THEME_PREVIEW;
    }

    getDisplayText(): string {
        return this.themeName ? `预览：${this.themeName}` : '主题预览';
    }

    getIcon(): string {
        return 'eye';
    }

    setTheme(themeId: string, themeName: string): void {
        this.themeId = themeId;
        this.themeName = themeName;
    }

    /** 刷新预览内容（供外部复用窗口时调用） */
    async refresh(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        if (!container) return;
        container.empty();
        container.classList.add('mp-theme-preview-container');

        // Obsidian 内部 API，leaf.updateHeader refreshes the view tab header
        (this.leaf as LeafWithUpdateHeader).updateHeader?.();

        await this.renderPreview(container);
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.classList.add('mp-theme-preview-container');

        await this.renderPreview(container);
    }

    private async renderPreview(container: HTMLElement): Promise<void> {
        // 清理旧的渲染组件
        if (this.renderComponent) {
            this.renderComponent.unload();
        }
        this.renderComponent = new Component();
        this.renderComponent.load();

        const previewArea = container.createEl('div', { cls: 'mp-preview-area' });

        await MarkdownRenderer.render(
            this.app,
            SAMPLE_MARKDOWN,
            previewArea,
            '',
            this.renderComponent,
        );

        MPConverter.formatContent(previewArea, { showImageCaption: true });

        const section = previewArea.querySelector('.mp-content-section') as HTMLElement;
        if (section && this.themeId) {
            const theme = this.themeManager.getTheme(this.themeId);
            if (theme) {
                this.themeManager.applyTheme(section, theme, 'theme-preview');
            }
        }
    }

    async onClose(): Promise<void> {
        if (this.renderComponent) {
            this.renderComponent.unload();
            this.renderComponent = null;
        }
        this.containerEl.children[1]?.empty();
        await Promise.resolve();
    }
}
