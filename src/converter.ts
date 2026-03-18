import { App, MarkdownRenderer, Component } from 'obsidian';
import { cleanObsidianUIElements } from './utils/html-cleaner';
import type { ThemeManager } from './themeManager';

export class MPConverter {
    private static app: App;

    static initialize(app: App) {
        this.app = app;
    }

    static formatContent(element: HTMLElement): void {
        // 创建 section 容器
        const section = document.createElement('section');
        section.className = 'mp-content-section';
        // 移动原有内容到 section 中
        while (element.firstChild) {
            section.appendChild(element.firstChild);
        }
        element.appendChild(section);

        // 处理元素
        this.processElements(section);
    }

    private static processElements(container: HTMLElement | null): void {
        if (!container) return;
        // 处理列表项内部元素，用 inline 的 span 包裹（避免 section 块级元素导致额外空行）
        container.querySelectorAll('li').forEach(li => {
            const wrapper = document.createElement('span');
            while (li.firstChild) {
                wrapper.appendChild(li.firstChild);
            }
            li.appendChild(wrapper);
        });

        // 处理代码块
        container.querySelectorAll('pre').forEach(pre => {
            // 过滤掉 frontmatter
            if (pre.classList.contains('frontmatter')) {
                pre.remove();
                return;
            }

            const codeEl = pre.querySelector('code');
            if (codeEl) {
                // 添加 macOS 风格的窗口按钮
                const header = document.createElement('div');
                header.className = 'mp-code-header';

                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('span');
                    dot.className = 'mp-code-dot';
                    header.appendChild(dot);
                }

                pre.insertBefore(header, pre.firstChild);

                // 移除原有的复制按钮
                const copyButton = pre.querySelector('.copy-code-button');
                if (copyButton) {
                    copyButton.remove();
                }
            }
        });

        // 处理 callout（Obsidian 的提示框）
        this.processCallouts(container);

        // 处理图片
        container.querySelectorAll('span.internal-embed[alt][src]').forEach(async el => {
            const originalSpan = el as HTMLElement;
            const src = originalSpan.getAttribute('src');
            const alt = originalSpan.getAttribute('alt');

            if (!src) return;

            try {
                const linktext = src.split('|')[0];
                const file = this.app.metadataCache.getFirstLinkpathDest(linktext, '');
                if (file) {
                    const absolutePath = this.app.vault.adapter.getResourcePath(file.path);
                    const newImg = document.createElement('img');
                    newImg.src = absolutePath;
                    if (alt) newImg.alt = alt;
                    originalSpan.parentNode?.replaceChild(newImg, originalSpan);
                }
            } catch (error) {
                console.error('图片处理失败:', error);
            }
        });
    }
    /** Callout 类型到颜色的映射 */
    private static readonly CALLOUT_COLORS: Record<string, { bg: string; border: string; title: string; icon: string }> = {
        note:      { bg: '#e8f0fe', border: '#448aff', title: '#448aff', icon: '📝' },
        info:      { bg: '#e8f0fe', border: '#448aff', title: '#448aff', icon: 'ℹ️' },
        tip:       { bg: '#e6f7f2', border: '#00bfa5', title: '#00bfa5', icon: '💡' },
        hint:      { bg: '#e6f7f2', border: '#00bfa5', title: '#00bfa5', icon: '💡' },
        important: { bg: '#f3e8fd', border: '#7c4dff', title: '#7c4dff', icon: '🔥' },
        warning:   { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '⚠️' },
        caution:   { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '⚠️' },
        attention: { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '⚠️' },
        danger:    { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '⛔' },
        error:     { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        bug:       { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '🐛' },
        success:   { bg: '#e8f5e9', border: '#00c853', title: '#00c853', icon: '✅' },
        check:     { bg: '#e8f5e9', border: '#00c853', title: '#00c853', icon: '✅' },
        done:      { bg: '#e8f5e9', border: '#00c853', title: '#00c853', icon: '✅' },
        question:  { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '❓' },
        help:      { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '❓' },
        faq:       { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '❓' },
        failure:   { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        fail:      { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        missing:   { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        abstract:  { bg: '#e0f7fa', border: '#00b8d4', title: '#00b8d4', icon: '📋' },
        summary:   { bg: '#e0f7fa', border: '#00b8d4', title: '#00b8d4', icon: '📋' },
        tldr:      { bg: '#e0f7fa', border: '#00b8d4', title: '#00b8d4', icon: '📋' },
        example:   { bg: '#f3e8fd', border: '#7c4dff', title: '#7c4dff', icon: '📖' },
        todo:      { bg: '#e8f0fe', border: '#448aff', title: '#448aff', icon: '☑️' },
        quote:     { bg: '#f5f5f5', border: '#9e9e9e', title: '#757575', icon: '💬' },
        cite:      { bg: '#f5f5f5', border: '#9e9e9e', title: '#757575', icon: '💬' },
    };

    /** 处理 Obsidian callout 元素，转换为带内联样式的公众号兼容结构 */
    private static processCallouts(container: HTMLElement): void {
        container.querySelectorAll('.callout').forEach(calloutEl => {
            const callout = calloutEl as HTMLElement;
            const calloutType = (callout.getAttribute('data-callout') || 'note').toLowerCase();
            const colors = this.CALLOUT_COLORS[calloutType] || this.CALLOUT_COLORS['note'];

            // 获取标题文本
            const titleInner = callout.querySelector('.callout-title-inner');
            const titleText = titleInner?.textContent || calloutType.charAt(0).toUpperCase() + calloutType.slice(1);

            // 获取内容
            const contentEl = callout.querySelector('.callout-content');
            const contentHTML = contentEl?.innerHTML || '';

            // 构建新的内联样式 HTML 结构
            const newCallout = document.createElement('section');
            newCallout.className = `mp-callout mp-callout-${calloutType}`;
            newCallout.setAttribute('data-callout', calloutType);
            newCallout.style.cssText = `background: ${colors.bg}; border-left: 4px solid ${colors.border}; border-radius: 6px; padding: 12px 16px; margin: 1em 0; box-sizing: border-box;`;

            // 标题行
            const titleRow = document.createElement('div');
            titleRow.className = 'mp-callout-title';
            titleRow.style.cssText = `display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-weight: bold; color: ${colors.title}; font-size: 1em; line-height: 1.5;`;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'mp-callout-icon';
            iconSpan.textContent = colors.icon;
            iconSpan.style.cssText = 'font-size: 1.1em;';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'mp-callout-title-text';
            titleSpan.textContent = titleText;

            titleRow.appendChild(iconSpan);
            titleRow.appendChild(titleSpan);
            newCallout.appendChild(titleRow);

            // 内容区域
            if (contentHTML.trim()) {
                const contentDiv = document.createElement('div');
                contentDiv.className = 'mp-callout-content';
                contentDiv.style.cssText = 'color: #4a4a4a; font-size: 0.95em; line-height: 1.7;';
                contentDiv.innerHTML = contentHTML;

                // 给内容中的 p 标签添加内联样式
                contentDiv.querySelectorAll('p').forEach(paragraph => {
                    paragraph.style.cssText = 'margin: 4px 0; padding: 0; line-height: 1.7;';
                });

                newCallout.appendChild(contentDiv);
            }

            // 替换原始 callout 元素
            // Obsidian 的 callout 通常包裹在 blockquote 中
            const parentBlockquote = callout.closest('blockquote');
            if (parentBlockquote && parentBlockquote.parentNode) {
                parentBlockquote.parentNode.replaceChild(newCallout, parentBlockquote);
            } else if (callout.parentNode) {
                callout.parentNode.replaceChild(newCallout, callout);
            }
        });
    }
}

/**
 * 将 Markdown 转换为带主题样式的 HTML（用于发布）
 * 使用 juice 将 CSS 内联到 HTML 元素的 style 属性中
 */
export async function markdownToHtml(
    app: App,
    markdown: string,
    sourcePath: string = '',
    themeManager?: ThemeManager,
): Promise<string> {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '1000px';
    document.body.appendChild(tempDiv);

    try {
        // 使用 Obsidian 的 MarkdownRenderer 渲染
        await MarkdownRenderer.render(
            app,
            markdown,
            tempDiv,
            sourcePath,
            new Component(),
        );

        // 等待异步渲染完成
        await new Promise(resolve => setTimeout(resolve, 500));

        // 清理 Obsidian UI 元素
        cleanObsidianUIElements(tempDiv);

        // 格式化内容（创建 section 容器、处理代码块等）
        MPConverter.formatContent(tempDiv);

        // 移除定位样式
        tempDiv.removeAttribute('style');

        // 获取主题 CSS 用于 juice 内联（不通过 applyTheme 注入 <style> 标签，
        // 而是直接通过 juice 将 CSS 内联到每个元素的 style 属性上，
        // 确保公众号后台和跨设备粘贴时样式不丢失）
        const themeCSS = themeManager ? themeManager.getActiveThemeCSS() : '';

        // 序列化 HTML - 直接序列化 section，避免额外的 div 包裹（与复制功能一致）
        const section = tempDiv.querySelector('.mp-content-section');
        const serializer = new XMLSerializer();
        let htmlContent = section 
            ? serializer.serializeToString(section)
            : serializer.serializeToString(tempDiv);
        htmlContent = htmlContent.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');

        // 使用 juice 将 CSS 内联到 HTML
        if (themeCSS) {
            try {
                const { inlineContent } = await import('juice');
                htmlContent = inlineContent(htmlContent, themeCSS, {
                    applyStyleTags: true,
                    removeStyleTags: true,
                    preserveMediaQueries: false,
                    preserveFontFaces: false,
                });
            } catch (juiceError) {
                console.error('juice 内联 CSS 失败:', juiceError);
            }
        }

        return htmlContent;
    } finally {
        if (tempDiv.parentNode) {
            document.body.removeChild(tempDiv);
        }
    }
}