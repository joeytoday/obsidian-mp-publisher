import { App, MarkdownRenderer, Component } from 'obsidian';
import { cleanObsidianUIElements } from './utils/html-cleaner';
import { preprocessMathFormula, waitForAsyncRender, convertMathToSVG as mathToSVG } from './utils/math-formula';
import { prerenderPseudoElements } from './utils/pseudo-element-renderer';
import { nanoid } from './utils/nanoid';
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
     * 逐个处理列表，处理一个后重新查询 DOM，保证遍历顺序忠实于文档顺序
     */
    private static convertListsToSection(container: HTMLElement): void {
        while (container.querySelector('ul, ol')) {
            const allLists = Array.from(container.querySelectorAll('ul, ol'));
            if (allLists.length === 0) break;

            for (const list of allLists) {
                const closestList = list.closest('ul, ol');
                if (!closestList || closestList === list) {
                    this.convertSingleList(list as HTMLElement, 0);
                    break;
                }
            }

            if (!container.querySelector('ul, ol')) break;
        }
    }

    /**
     * 转换单个列表元素为纯 section 结构
     * 所有标签统一使用 section，不使用 p/ul/ol/li 等会被公众号还原的标签
     *
     * @param listElement 要转换的 ul/ol 元素
     * @param depth 当前嵌套层级（0 = 顶层列表）
     * @param mixedType 是否为混合类型列表（子列表类型与父列表不同）
     *
     * 核心设计：
     * - padding-left 在 mp-list-section 上，mp-list-item 无缩进
     * - 嵌套层 padding-left 固定 1.5em，每层间距一致
     * - 查找所有子列表（querySelectorAll），避免遗漏
     */
    private static convertSingleList(listElement: HTMLElement, depth: number, mixedType: boolean = false): void {
        const isOrdered = listElement.tagName.toLowerCase() === 'ol';
        const listItems = Array.from(listElement.querySelectorAll(':scope > li'));

        const section = document.createElement('section');
        section.className = 'mp-list-section';
        section.setAttribute('data-list-type', isOrdered ? 'ordered' : 'unordered');
        section.setAttribute('data-depth', String(depth));

        // 顶层：上边距 + 1em 左间距；嵌套层：固定 1.5em 左间距
        section.style.cssText = depth === 0
            ? 'margin: 1em 0 0 0; padding: 0 0 0 1em;'
            : 'margin: 0; padding: 0 0 0 1.5em;';

        let itemNumber = 1;
        for (const li of listItems) {
            const liElement = li as HTMLElement;

            // 查找所有直接子列表（不只是第一个）
            const childLists = Array.from(liElement.querySelectorAll(':scope > ul, :scope > ol'));
            // 先移除所有子列表，防止 innerHTML 重复包含
            childLists.forEach(child => child.remove());

            const itemSection = document.createElement('section');
            itemSection.className = 'mp-list-item';
            itemSection.style.cssText = 'display: block; margin: 0; line-height: 1.8;';

            const marker = isOrdered ? `${itemNumber}. ` : '• ';
            const markerSection = document.createElement('section');
            markerSection.textContent = marker;
            markerSection.style.cssText = 'display: inline; margin-right: 0.25em; color: #888;';
            itemSection.appendChild(markerSection);

            const contentSection = document.createElement('section');
            contentSection.style.cssText = 'display: inline;';
            contentSection.innerHTML = liElement.innerHTML;

            contentSection.querySelectorAll('p').forEach(pEl => {
                (pEl as HTMLElement).style.display = 'inline';
                (pEl as HTMLElement).style.margin = '0';
                (pEl as HTMLElement).style.padding = '0';
            });

            itemSection.appendChild(contentSection);
            section.appendChild(itemSection);

            // 按文档顺序处理所有子列表
            childLists.forEach(child => {
                const clone = child.cloneNode(true) as HTMLElement;
                section.appendChild(clone);
                const childIsMixedType = child.tagName.toLowerCase() !== listElement.tagName.toLowerCase();
                this.convertSingleList(clone, depth + 1, childIsMixedType);
            });

            itemNumber++;
        }

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
            newCallout.style.cssText = `background: ${colors.bg}; border-radius: 6px; padding: 12px 16px; margin: 1em 0; box-sizing: border-box;`;

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
 * 将代码高亮的 computed style 写入 inline style
 * Obsidian 的代码高亮颜色通过 CSS class 产生，不在主题 CSS 文件中，
 * juice 无法内联这些样式，需要在 DOM 挂载时读取 computed style 补全
 */
function applyCodeHighlightStyles(container: HTMLElement): void {
    container.querySelectorAll('pre code').forEach(codeEl => {
        const spans = codeEl.querySelectorAll('span');
        spans.forEach(span => {
            const computedColor = window.getComputedStyle(span).color;
            if (computedColor) {
                (span as HTMLElement).style.color = computedColor;
            }
        });
    });
}

/**
 * 将代码块中行首的普通空格（U+0020）替换为不间断空格（U+00A0）
 * 微信公众号富文本引擎不支持 CSS white-space: pre-wrap，普通空格会被折叠导致缩进丢失
 * U+00A0（不间断空格）在公众号中不会被折叠，能正确保留代码缩进
 */
function convertCodeBlockLeadingSpaces(container: HTMLElement): void {
    const NBSP = String.fromCharCode(160);
    const NL = String.fromCharCode(10);

    container.querySelectorAll('pre code').forEach(codeEl => {
        // 使用 TreeWalker 一次性收集所有文本节点，避免重复或遗漏
        const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT);
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
            const text = node.textContent || '';
            if (!text.length) continue;

            const hasNewline = text.indexOf(NL) !== -1;

            if (hasNewline) {
                const parts = text.split(NL);
                const fragment = document.createDocumentFragment();
                parts.forEach((part, idx) => {
                    if (idx > 0) {
                        fragment.appendChild(document.createTextNode(NL));
                    }
                    const leadingMatch = part.match(/^[ \t]+/);
                    const leadingSpaces = leadingMatch ? leadingMatch[0].length : 0;
                    const rest = leadingMatch ? part.slice(leadingSpaces) : part;
                    let converted = rest;
                    for (let j = 0; j < leadingSpaces; j++) {
                        converted = NBSP + converted;
                    }
                    fragment.appendChild(document.createTextNode(converted));
                });
                node.parentNode?.replaceChild(fragment, node);
            } else {
                const leadingMatch = text.match(/^[ \t]+/);
                const leadingSpaces = leadingMatch ? leadingMatch[0].length : 0;
                if (leadingSpaces > 0) {
                    const rest = text.slice(leadingSpaces);
                    let converted = rest;
                    for (let j = 0; j < leadingSpaces; j++) {
                        converted = NBSP + converted;
                    }
                    node.textContent = converted;
                }
            }
        }
    });
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

    const renderComponent = new Component();
    renderComponent.load();

    try {
        // 预处理 Markdown，转换 LaTeX 语法
        const processedMarkdown = preprocessMathFormula(markdown);

        // 使用 Obsidian 的 MarkdownRenderer 渲染
        await MarkdownRenderer.render(
            app,
            processedMarkdown,
            tempDiv,
            sourcePath,
            renderComponent,
        );

        // 等待异步渲染完成（MathJax、Mermaid 等）
        await waitForAsyncRender(tempDiv, 3000);

        // 将 Mermaid SVG 转为 PNG 图片（微信公众号对 SVG 支持有限）
        await convertMermaidSVGToImage(tempDiv);

        // 清理 Obsidian UI 元素
        cleanObsidianUIElements(tempDiv);

        // 格式化内容（创建 section 容器、处理代码块等）
        MPConverter.formatContent(tempDiv);

        // 将代码高亮的 computed style 写入 inline style
        // Obsidian 的代码高亮颜色通过 CSS class 产生，不在主题 CSS 中，
        // juice 无法内联，需要在 DOM 还挂载时读取 computed style 补全
        applyCodeHighlightStyles(tempDiv);

        // 将代码块行首空格替换为 U+00A0（不间断空格）
        // 微信公众号不支持 CSS white-space: pre-wrap，普通空格会被折叠导致缩进丢失
        convertCodeBlockLeadingSpaces(tempDiv);

        // ★ 获取主题 CSS（在 DOM 仍挂载时，用于伪元素渲染和后续 juice 内联）
        const themeCSS = themeManager ? themeManager.getActiveThemeCSS() : '';

        // ★ 临时注入 <style> 到 <head>，让浏览器 CSS 引擎完整计算计数器值
        //   必须放在 <head> 中并强制重排，Chromium 才能正确解析 counter() 函数
        //   在 tempDiv 内部注入 <style> 时 Chromium 可能不触发计数器计算
        let tempStyle: HTMLStyleElement | null = null;
        if (themeCSS) {
            tempStyle = document.createElement('style');
            tempStyle.setAttribute('data-mp-temp', `prerender-${nanoid()}`);
            tempStyle.textContent = themeCSS;
            document.head.appendChild(tempStyle);

            // 强制浏览器重排，确保 CSS 规则和计数器完全生效
            // eslint-disable-next-line no-unused-expressions
            document.body.offsetHeight;
        }

        // ★ 将 CSS ::before / ::after 伪元素转为真实 <span> DOM 元素
        //   必须在 DOM 挂载 + CSS 激活状态下执行，以便 getComputedStyle 读取计数器等解析值
        //   返回已移除伪元素规则的 CSS，后续 juice 内联不会再产生无效的伪元素样式
        let cleanedCSS: string;
        try {
            cleanedCSS = prerenderPseudoElements(tempDiv, themeCSS);
        } finally {
            if (tempStyle) {
                tempStyle.remove();
            }
        }

        // 移除定位样式
        tempDiv.removeAttribute('style');

        // 序列化 HTML（伪元素已转为真实 DOM，可安全序列化）
        const serializer = new XMLSerializer();
        const cleanContainer = document.createElement('div');
        while (tempDiv.firstChild) {
            cleanContainer.appendChild(tempDiv.firstChild);
        }

        let htmlContent = serializer.serializeToString(cleanContainer);
        htmlContent = htmlContent.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');

        // 处理数学公式（使用在线 API 转为图片）
        if (convertMathToSVG && htmlContent.includes('mjx-')) {
            try {
                htmlContent = await mathToSVG(htmlContent, processedMarkdown);
            } catch (mathError) {
                console.error('数学公式处理失败:', mathError);
            }
        }

        // 使用 juice 将 CSS 内联到 HTML（使用已清理伪元素规则的 CSS）
        if (cleanedCSS) {
            try {
                const { inlineContent } = await import('juice');
                htmlContent = inlineContent(htmlContent, cleanedCSS, {
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
        renderComponent.unload();
        if (tempDiv.parentNode) {
            document.body.removeChild(tempDiv);
        }
    }
}

/**
 * 将 Mermaid 渲染的 SVG 转为 PNG 图片
 * 微信公众号对 SVG 支持有限，需要转为 base64 PNG
 */
async function convertMermaidSVGToImage(container: HTMLElement): Promise<void> {
    const mermaidContainers = container.querySelectorAll('.mermaid, pre.mermaid, [class*="mermaid"]');
    if (mermaidContainers.length === 0) return;

    for (const mermaidEl of Array.from(mermaidContainers)) {
        const svgElement = mermaidEl.querySelector('svg');
        if (!svgElement) continue;

        try {
            const dataUrl = await svgToDataUrl(svgElement);
            if (!dataUrl) continue;

            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = 'mermaid diagram';
            img.style.cssText = 'display: block; max-width: 100%; margin: 1em auto; border-radius: 0;';

            mermaidEl.parentNode?.replaceChild(img, mermaidEl);
        } catch (error) {
            console.error('[Mermaid] SVG 转图片失败:', error);
        }
    }
}

/**
 * 将 SVG 元素通过 Canvas 转为 base64 PNG data URL
 * 优先从 viewBox 获取尺寸，确保甘特图等宽图表正确渲染
 */
function svgToDataUrl(svgElement: SVGElement): Promise<string | null> {
    return new Promise((resolve) => {
        try {
            const svgEl = svgElement as SVGSVGElement;

            // 优先从 viewBox 获取尺寸（甘特图等通常只有 viewBox）
            let width = 0;
            let height = 0;

            const viewBox = svgEl.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/[\s,]+/).map(Number);
                if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
                    width = parts[2];
                    height = parts[3];
                }
            }

            // 其次从 width/height 属性获取（排除百分比值）
            if (!width || !height) {
                const attrWidth = svgEl.getAttribute('width') || '';
                const attrHeight = svgEl.getAttribute('height') || '';
                if (attrWidth && !attrWidth.includes('%')) {
                    width = parseFloat(attrWidth) || width;
                }
                if (attrHeight && !attrHeight.includes('%')) {
                    height = parseFloat(attrHeight) || height;
                }
            }

            // 最后兜底
            if (!width) width = 800;
            if (!height) height = 600;

            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
            }

            const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
            clonedSvg.setAttribute('width', String(width));
            clonedSvg.setAttribute('height', String(height));
            // 确保 viewBox 存在，保持正确的宽高比
            if (!clonedSvg.getAttribute('viewBox')) {
                clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }

            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(clonedSvg);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };
            img.src = url;
        } catch {
            resolve(null);
        }
    });
}