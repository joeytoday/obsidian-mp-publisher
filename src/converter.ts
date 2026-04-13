import { App, MarkdownRenderer, Component } from 'obsidian';
import { cleanObsidianUIElements } from './utils/html-cleaner';
import { preprocessMathFormula, waitForAsyncRender, convertMathToSVG as mathToSVG } from './utils/math-formula';
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

        // 1. 先处理列表（核心逻辑）
        this.processLists(container);

        // 2. 处理代码块
        container.querySelectorAll('pre').forEach(pre => {
            // 过滤掉 frontmatter
            if (pre.classList.contains('frontmatter')) {
                pre.remove();
                return;
            }

            const codeEl = pre.querySelector('code');
            if (codeEl) {
                // 添加 macOS 风格的窗口按钮（使用 section + inline style 确保公众号复制/发布时样式保留）
                const header = document.createElement('section');
                header.style.cssText = 'margin-bottom: 1em; display: flex; gap: 6px;';

                const dotColors = ['#ff5f56', '#ffbd2e', '#27c93f'];
                for (const color of dotColors) {
                    const dot = document.createElement('section');
                    dot.style.cssText = `display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${color};`;
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

        // 3. 处理 callout（Obsidian 的提示框）
        this.processCallouts(container);

        // 4. 处理图片
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

    /**
     * 统一处理所有列表相关逻辑
     * 将列表转换为 section + p 结构，避免微信自动处理列表元素
     */
    private static processLists(container: HTMLElement): void {
        // 递归处理所有列表（从最内层开始）
        this.convertListsToSection(container);
    }

    /**
     * 将列表元素转换为纯 section 结构
     * 避免使用 ul/ol/li/p 等会被微信公众号自动处理的标签
     */
    private static convertListsToSection(container: HTMLElement): void {
        // 持续处理，直到没有列表元素
        while (container.querySelector('ul, ol')) {
            // 找到所有顶层列表（不在其他列表内的）
            const topLevelLists = Array.from(container.querySelectorAll('ul, ol')).filter(list => {
                return !list.closest('ul, ol') || list.closest('ul, ol') === list;
            });

            for (const list of topLevelLists) {
                this.convertSingleList(list as HTMLElement);
            }
        }
    }

    /**
     * 转换单个列表元素为纯 section 结构
     * 所有标签统一使用 section，不使用 p/ul/ol/li 等会被公众号还原的标签
     */
    private static convertSingleList(listElement: HTMLElement): void {
        const isOrdered = listElement.tagName.toLowerCase() === 'ol';
        const listItems = Array.from(listElement.querySelectorAll(':scope > li'));
        
        // 创建 section 容器
        const section = document.createElement('section');
        section.className = 'mp-list-section';
        section.setAttribute('data-list-type', isOrdered ? 'ordered' : 'unordered');
        
        // 计算基础缩进（通过父级列表数量）
        let indentLevel = 0;
        let parent = listElement.parentElement;
        while (parent) {
            if (parent.classList.contains('mp-list-section')) {
                indentLevel++;
            }
            parent = parent.parentElement;
        }
        
        // 嵌套列表容器清零 margin/padding，顶层列表保留上边距
        section.style.cssText = indentLevel > 0
            ? 'margin: 0; padding: 0;'
            : 'margin: 1em 0 0 0; padding: 0;';

        // 一级列表不缩进，二级及以上才缩进
        const basePaddingLeft = indentLevel > 0 ? indentLevel * 2 : 0; // em

        let itemNumber = 1;
        for (const li of listItems) {
            const liElement = li as HTMLElement;
            
            // 检查是否有嵌套列表
            const nestedList = liElement.querySelector(':scope > ul, :scope > ol');
            const nestedListClone = nestedList ? nestedList.cloneNode(true) as HTMLElement : null;
            
            // 移除嵌套列表，获取纯文本内容
            if (nestedList) {
                nestedList.remove();
            }
            
            // 使用 section 而非 p，避免公众号将 p 解析为段落产生多余空行
            const itemSection = document.createElement('section');
            itemSection.className = 'mp-list-item';
            itemSection.style.cssText = `display: block; margin: 0; padding-left: ${basePaddingLeft}em; line-height: 1.8;`;
            
            // 添加编号或符号
            const marker = isOrdered ? `${itemNumber}. ` : '• ';
            const markerSection = document.createElement('section');
            markerSection.textContent = marker;
            markerSection.style.cssText = 'display: inline; margin-right: 0.25em;';
            itemSection.appendChild(markerSection);
            
            // 添加内容
            const contentSection = document.createElement('section');
            contentSection.style.cssText = 'display: inline;';
            contentSection.innerHTML = liElement.innerHTML;
            
            // 将内容中的 <p> 标签内联化，避免公众号产生额外空行
            contentSection.querySelectorAll('p').forEach(pEl => {
                (pEl as HTMLElement).style.display = 'inline';
                (pEl as HTMLElement).style.margin = '0';
                (pEl as HTMLElement).style.padding = '0';
            });
            
            itemSection.appendChild(contentSection);
            section.appendChild(itemSection);
            
            // 如果有嵌套列表，先挂到当前 section 下再递归
            // 这样递归时向上遍历能找到 .mp-list-section，indentLevel 才能正确计算
            if (nestedListClone) {
                section.appendChild(nestedListClone);
                this.convertSingleList(nestedListClone);
            }
            
            itemNumber++;
        }
        
        // 替换原列表
        listElement.replaceWith(section);
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
            const titleRow = document.createElement('section');
            titleRow.className = 'mp-callout-title';
            titleRow.style.cssText = `display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-weight: bold; color: ${colors.title}; font-size: 1em; line-height: 1.5;`;

            const iconSection = document.createElement('section');
            iconSection.className = 'mp-callout-icon';
            iconSection.textContent = colors.icon;
            iconSection.style.cssText = 'display: inline; font-size: 1.1em;';

            const titleSection = document.createElement('section');
            titleSection.className = 'mp-callout-title-text';
            titleSection.textContent = titleText;
            titleSection.style.cssText = 'display: inline;';

            titleRow.appendChild(iconSection);
            titleRow.appendChild(titleSection);
            newCallout.appendChild(titleRow);

            // 内容区域
            if (contentHTML.trim()) {
                const contentDiv = document.createElement('section');
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
    convertMathToSVG: boolean = false,
): Promise<string> {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '1000px';
    document.body.appendChild(tempDiv);

    try {
        // 预处理 Markdown，转换 LaTeX 语法
        const processedMarkdown = preprocessMathFormula(markdown);

        // 使用 Obsidian 的 MarkdownRenderer 渲染
        await MarkdownRenderer.render(
            app,
            processedMarkdown,
            tempDiv,
            sourcePath,
            new Component(),
        );

        // 等待异步渲染完成（MathJax、Mermaid 等）
        await waitForAsyncRender(tempDiv, 3000);

        // 清理 Obsidian UI 元素
        cleanObsidianUIElements(tempDiv);

        // 格式化内容（创建 section 容器、处理代码块等）
        MPConverter.formatContent(tempDiv);

        // 移除定位样式
        tempDiv.removeAttribute('style');

        // 序列化 HTML
        const serializer = new XMLSerializer();
        const cleanContainer = document.createElement('div');
        while (tempDiv.firstChild) {
            cleanContainer.appendChild(tempDiv.firstChild);
        }

        let htmlContent = serializer.serializeToString(cleanContainer);
        htmlContent = htmlContent.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');

        // 处理数学公式
        if (convertMathToSVG && htmlContent.includes('mjx-')) {
            try {
                htmlContent = await mathToSVG(htmlContent, processedMarkdown);
            } catch (mathError) {
                console.error('数学公式处理失败:', mathError);
            }
        }

        // 获取主题 CSS 用于 juice 内联（不通过 applyTheme 注入 <style> 标签，
        // 而是直接通过 juice 将 CSS 内联到每个元素的 style 属性上，
        // 确保公众号后台和跨设备粘贴时样式不丢失）
        const themeCSS = themeManager ? themeManager.getActiveThemeCSS() : '';

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