import { App, MarkdownRenderer, Component, sanitizeHTMLToDom, Notice } from 'obsidian';
import { cleanObsidianUIElements } from './utils/html-cleaner';
import { preprocessMathFormula, waitForAsyncRender, convertMathToSVG as mathToSVG } from './utils/math-formula';
import type { ThemeManager } from './themeManager';
import { parseCssString } from './utils/css-props';

export class MPConverter {
    private static app: App;

    static initialize(app: App) {
        this.app = app;
    }

    static formatContent(element: HTMLElement, options?: { showImageCaption?: boolean }): void {
        // 创建 section 容器
        const section = activeDocument.createElement('section');
        section.className = 'mp-content-section';
        // 移动原有内容到 section 中
        while (element.firstChild) {
            section.appendChild(element.firstChild);
        }
        element.appendChild(section);

        // 处理元素
        this.processElements(section, options);
    }

    private static processElements(container: HTMLElement | null, options?: { showImageCaption?: boolean }): void {
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
                const header = activeDocument.createElement('section');
                header.setCssProps(parseCssString('margin-bottom: 1em; display: flex; gap: 6px;'));

                const dotColors = ['#ff5f56', '#ffbd2e', '#27c93f'];
                for (const color of dotColors) {
                    const dot = activeDocument.createElement('section');
                    dot.setCssProps(parseCssString(`display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${color};`));
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
        container.querySelectorAll('span.internal-embed[alt][src]').forEach(el => {
            const originalSpan = el as HTMLElement;
            const src = originalSpan.getAttribute('src');
            const alt = originalSpan.getAttribute('alt');

            if (!src) return;

            try {
                const linktext = src.split('|')[0];
                const file = this.app.metadataCache.getFirstLinkpathDest(linktext, '');
                if (file) {
                    const absolutePath = this.app.vault.adapter.getResourcePath(file.path);
                    const newImg = activeDocument.createElement('img');
                    newImg.src = absolutePath;
                    if (alt) newImg.alt = alt;
                    originalSpan.parentNode?.replaceChild(newImg, originalSpan);
                }
            } catch (error) {
                console.error('图片处理失败:', error);
            }
        });

        // 5. 处理链接：外部链接转脚注，内部链接转纯文本
        this.processLinksToFootnotes(container);

        // 6. 处理图片描述
        if (options?.showImageCaption) {
            this.processImageCaptions(container);
        }
    }

    private static processImageCaptions(container: HTMLElement): void {
        try {
            const extRegex = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)$/i;

            container.querySelectorAll('img').forEach(img => {
                if (img.closest('pre')) return;

                let alt = img.getAttribute('alt');
                if (!alt || !alt.trim()) return;

                // 内部嵌入的 alt 是文件名，去掉扩展名
                alt = alt.replace(extRegex, '').trim();
                if (!alt) return;

                // 图片在 <p> 内时，描述插到 <p> 后面，避免 p 嵌套 p
                const parent = img.parentElement;
                const insertionTarget = (parent && parent.tagName === 'P' && parent.children.length === 1) ? parent : img;

                // 跳过已有描述（防止重复渲染时叠加）
                const nextSibling = insertionTarget.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('mp-image-caption')) return;

                // 使用 <p> 而非 <div>，微信公众号对 <p> 标签的样式支持更可靠
                const caption = activeDocument.createElement('p');
                caption.className = 'mp-image-caption';
                caption.style.cssText = 'display: block; text-align: center; font-size: 12px; color: #888; margin: -0.6em 0 1em 0; padding: 0;';
                caption.textContent = alt;

                insertionTarget.parentNode?.insertBefore(caption, insertionTarget.nextSibling);
            });
        } catch (error) {
            console.error('[mp-publisher] 图片描述处理失败:', error);
        }
    }

    private static processLinksToFootnotes(container: HTMLElement): void {
        try {
            const urlToNum = new Map<string, number>();
            const footnotes: { url: string; text: string }[] = [];

            container.querySelectorAll('a').forEach(a => {
                if (a.closest('pre')) return;

                if (a.classList.contains('internal-link')) {
                    const linkText = a.textContent || a.getAttribute('data-href') || '';
                    a.replaceWith(activeDocument.createTextNode(linkText));
                    return;
                }

                const href = a.getAttribute('href') || '';
                if (href.startsWith('http://') || href.startsWith('https://')) {
                    const linkText = a.textContent || href;

                    let num = urlToNum.get(href);
                    if (num === undefined) {
                        num = footnotes.length + 1;
                        urlToNum.set(href, num);
                        footnotes.push({ url: href, text: linkText });
                    }

                    const sup = activeDocument.createElement('sup');
                    sup.setCssProps(parseCssString('font-size: 0.75em;'));
                    sup.textContent = `[${num}]`;

                    const linkSpan = activeDocument.createElement('span');
                    linkSpan.setCssProps(parseCssString('text-decoration: underline;'));
                    while (a.firstChild) {
                        linkSpan.appendChild(a.firstChild);
                    }
                    if (!linkSpan.childNodes.length) {
                        linkSpan.appendChild(activeDocument.createTextNode(href));
                    }

                    const fragment = activeDocument.createDocumentFragment();
                    fragment.appendChild(linkSpan);
                    fragment.appendChild(sup);
                    a.replaceWith(fragment);
                }
            });

            if (footnotes.length > 0) {
                const fnSection = activeDocument.createElement('section');
                fnSection.setCssProps(parseCssString(
                    'margin-top: 1.5em; padding-top: 0.75em; border-top: 1px solid #e0e0e0;'
                ));

                footnotes.forEach((fn, i) => {
                    const item = activeDocument.createElement('section');
                    item.setCssProps(parseCssString(
                        'font-size: 0.85em; color: #888; margin: 0.25em 0;'
                    ));
                    item.textContent = `[${i + 1}] ${fn.text}：${fn.url}`;
                    fnSection.appendChild(item);
                });

                container.appendChild(fnSection);
            }
        } catch (error) {
            console.error('[mp-publisher] 链接转脚注失败:', error);
        }
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
        let maxIterations = 100;
        while (container.querySelector('ul, ol') && maxIterations-- > 0) {
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
        if (maxIterations <= 0) {
            console.warn('convertListsToSection: 达到最大迭代次数，可能存在未转换的列表');
        }
    }

    /**
     * 转换单个列表元素为纯 section 结构
     * 所有标签统一使用 section，不使用 p/ul/ol/li 等会被公众号还原的标签
     *
     * @param listElement 要转换的 ul/ol 元素
     * @param depth 当前嵌套层级（0 = 顶层列表）
     *
     * 核心设计：
     * - padding-left 在 mp-list-section 上，mp-list-item 无缩进
     * - 嵌套层 padding-left 固定 1.5em，每层间距一致
     * - 查找所有子列表（querySelectorAll），避免遗漏
     */
    private static convertSingleList(listElement: HTMLElement, depth: number): void {
        const isOrdered = listElement.tagName.toLowerCase() === 'ol';
        const listItems = Array.from(listElement.querySelectorAll(':scope > li'));

        const section = activeDocument.createElement('section');
        section.className = 'mp-list-section';
        section.setAttribute('data-list-type', isOrdered ? 'ordered' : 'unordered');
        section.setAttribute('data-depth', String(depth));

        // 顶层：上边距 + 1em 左间距；嵌套层：固定 1.5em 左间距
        section.setCssProps(depth === 0
            ? parseCssString('margin: 1em 0 0 0; padding: 0 0 0 1em;')
            : parseCssString('margin: 0; padding: 0 0 0 1.5em;'));

        let itemNumber = 1;
        for (const li of listItems) {
            const liElement = li as HTMLElement;

            // 查找所有直接子列表（不只是第一个）
            const childLists = Array.from(liElement.querySelectorAll(':scope > ul, :scope > ol'));
            // 先移除所有子列表，防止 innerHTML 重复包含
            childLists.forEach(child => child.remove());

            const itemSection = activeDocument.createElement('section');
            itemSection.className = 'mp-list-item';
            itemSection.setCssProps(parseCssString('display: block; margin: 0; line-height: 1.8;'));

            const marker = isOrdered ? `${itemNumber}. ` : '• ';
            const markerSection = activeDocument.createElement('section');
            markerSection.textContent = marker;
            markerSection.setCssProps(parseCssString('display: inline; margin-right: 0.25em; color: #888;'));
            itemSection.appendChild(markerSection);

            const contentSection = activeDocument.createElement('section');
            contentSection.setCssProps(parseCssString('display: inline;'));
            while (liElement.firstChild) {
                contentSection.appendChild(liElement.firstChild);
            }

            contentSection.querySelectorAll('p').forEach(pEl => {
                (pEl as HTMLElement).setCssProps({ display: 'inline', margin: '0', padding: '0' });
            });

            itemSection.appendChild(contentSection);
            section.appendChild(itemSection);

            // 按文档顺序处理所有子列表
            childLists.forEach(child => {
                const clone = child.cloneNode(true) as HTMLElement;
                section.appendChild(clone);
                this.convertSingleList(clone, depth + 1);
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
            const newCallout = activeDocument.createElement('section');
            newCallout.className = `mp-callout mp-callout-${calloutType}`;
            newCallout.setAttribute('data-callout', calloutType);
            newCallout.setCssProps(parseCssString(`background: ${colors.bg}; border-radius: 6px; padding: 12px 16px; margin: 1em 0; box-sizing: border-box;`));

            // 标题行
            const titleRow = activeDocument.createElement('section');
            titleRow.className = 'mp-callout-title';
            titleRow.setCssProps(parseCssString(`display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-weight: bold; color: ${colors.title}; font-size: 1em; line-height: 1.5;`));

            const iconSection = activeDocument.createElement('section');
            iconSection.className = 'mp-callout-icon';
            iconSection.textContent = colors.icon;
            iconSection.setCssProps(parseCssString('display: inline; font-size: 1.1em;'));

            const titleSection = activeDocument.createElement('section');
            titleSection.className = 'mp-callout-title-text';
            titleSection.textContent = titleText;
            titleSection.setCssProps(parseCssString('display: inline;'));

            titleRow.appendChild(iconSection);
            titleRow.appendChild(titleSection);
            newCallout.appendChild(titleRow);

            // 内容区域
            if (contentHTML.trim()) {
                const contentDiv = activeDocument.createElement('section');
                contentDiv.className = 'mp-callout-content';
                contentDiv.setCssProps(parseCssString('color: #4a4a4a; font-size: 0.95em; line-height: 1.7;'));
                contentDiv.appendChild(sanitizeHTMLToDom(contentHTML));

                // 给内容中的 p 标签添加内联样式
                contentDiv.querySelectorAll('p').forEach(paragraph => {
                    paragraph.setCssProps(parseCssString('margin: 4px 0; padding: 0; line-height: 1.7;'));
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
                (span as HTMLElement).setCssProps({ color: computedColor });
            }
        });
    });
}
/**
 * 将代码块每行包裹在 section 中，用 padding-left 实现缩进
 * 同时将行内空格替换为 NBSP（U+00A0）
 * 
 * 微信公众号保存时会移除 white-space: pre-wrap 并折叠空格（包括 NBSP）
 * 仅靠空格字符无法可靠保留缩进，必须用 CSS padding-left 作为缩进载体
 * 
 * 策略：
 * 1. 先将所有普通空格替换为 NBSP（保护行内间距）
 * 2. 在 DOM 层面按换行符拆分文本节点，识别行首 NBSP 数量
 * 3. 每行用 section 包裹，padding-left = 行首 NBSP 数量 × 0.5em
 * 4. 移除行首 NBSP（由 padding-left 替代），保留行内 NBSP 和语法高亮 span
 */
function convertCodeBlockLines(container: HTMLElement): void {
    const NBSP = '\u00A0';

    // Step 1: 将代码块内所有普通空格替换为 NBSP
    container.querySelectorAll('pre code').forEach(codeEl => {
        const walker = activeDocument.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
            textNodes.push(node);
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';
            if (!text.length) continue;
            const converted = text.replace(/ /g, NBSP);
            if (converted !== text) {
                textNode.textContent = converted;
            }
        }
    });

    // Step 2: 按行拆分代码块，每行用 section + padding-left 实现缩进
    // 在 DOM 层面操作，保留语法高亮 span 结构
    container.querySelectorAll('pre code').forEach(codeEl => {
        // 2a: 先将所有含 \n 的文本节点按换行拆分
        //     确保每个文本节点只属于一行
        const walker = activeDocument.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
            textNodes.push(node);
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';
            if (!text.includes('\n')) continue;

            const parts = text.split('\n');
            const fragment = activeDocument.createDocumentFragment();
            parts.forEach((part, idx) => {
                if (idx > 0) {
                    fragment.appendChild(activeDocument.createTextNode('\n'));
                }
                if (part.length > 0) {
                    fragment.appendChild(activeDocument.createTextNode(part));
                }
            });
            textNode.parentNode?.replaceChild(fragment, textNode);
        }

        // 2b: 将 code 的子节点按 \n 文本节点拆分为行组
        //     每个行组包含该行的所有元素（span、文本节点等）
        const childNodes = Array.from(codeEl.childNodes);
        const lineGroups: Node[][] = [[]];
        
        for (const child of childNodes) {
            // 检查是否是换行文本节点
            if (child.nodeType === Node.TEXT_NODE && child.textContent === '\n') {
                lineGroups.push([]); // 开始新行
            } else {
                lineGroups[lineGroups.length - 1].push(child);
            }
        }

        // 过滤掉空行组（连续换行产生的）
        const nonEmptyGroups = lineGroups.filter(group => group.length > 0);

        if (nonEmptyGroups.length <= 1) return; // 单行代码块无需处理

        // 2c: 为每行计算行首 NBSP 数量，移除行首 NBSP，设置 padding-left
        const lineSections: HTMLElement[] = [];

        for (const group of nonEmptyGroups) {
            // 计算行首 NBSP 数量：遍历行组中的文本节点，统计连续的行首 NBSP
            let leadingNbspCount = 0;

            for (const child of group) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent || '';
                    for (const char of text) {
                        if (char === NBSP) {
                            leadingNbspCount++;
                        } else {
                            break; // 遇到非 NBSP 字符，停止计数
                        }
                    }
                    if (leadingNbspCount > 0 && text.length === leadingNbspCount) {
                        // 整个文本节点都是行首 NBSP，继续看下一个节点
                        continue;
                    }
                    break; // 文本节点包含非 NBSP 内容，行首部分结束
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    // span 元素：检查其第一个文本子节点
                    const firstText = (child as HTMLElement).textContent || '';
                    for (const char of firstText) {
                        if (char === NBSP) {
                            leadingNbspCount++;
                        } else {
                            break;
                        }
                    }
                    break; // span 元素后不再属于行首
                } else {
                    break;
                }
            }

            // 2d: 移除行首 NBSP
            let removedCount = 0;
            for (const child of group) {
                if (removedCount >= leadingNbspCount) break;

                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent || '';
                    const remaining = leadingNbspCount - removedCount;
                    const nbspInNode = text.length <= remaining ? text.length : remaining;

                    if (nbspInNode === text.length) {
                        // 整个文本节点都是行首 NBSP，移除
                        child.textContent = '';
                        removedCount += text.length;
                    } else {
                        // 部分是行首 NBSP，截取移除
                        child.textContent = text.slice(nbspInNode);
                        removedCount += nbspInNode;
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const el = child as HTMLElement;
                    const firstTextChild = el.childNodes[0];
                    if (firstTextChild && firstTextChild.nodeType === Node.TEXT_NODE) {
                        const text = firstTextChild.textContent || '';
                        const remaining = leadingNbspCount - removedCount;
                        const nbspInNode = text.length <= remaining ? text.length : remaining;

                        if (nbspInNode === text.length) {
                            firstTextChild.textContent = '';
                        } else {
                            firstTextChild.textContent = text.slice(nbspInNode);
                        }
                        removedCount += nbspInNode;
                    }
                    break;
                } else {
                    break;
                }
            }

            // 2e: 创建 section 包裹该行
            const section = activeDocument.createElement('section');
            section.setCssProps(parseCssString(
                `display: block; margin: 0; padding: 0; padding-left: ${leadingNbspCount * 0.5}em; line-height: 1.6;`
            ));

            for (const child of group) {
                // 移除空文本节点（行首 NBSP 被清空后产生的）
                if (child.nodeType === Node.TEXT_NODE && !child.textContent?.length) continue;
                section.appendChild(child);
            }

            lineSections.push(section);
        }

        // 2f: 用 section 行替换 code 内容
        codeEl.empty();
        lineSections.forEach(section => {
            codeEl.appendChild(section);
        });
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
    showImageCaption: boolean = false,
): Promise<string> {
    const tempDiv = activeDocument.createElement('div');
    tempDiv.setCssProps({ position: 'fixed', left: '-9999px', top: '0', width: '1000px' });
    activeDocument.body.appendChild(tempDiv);

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
        MPConverter.formatContent(tempDiv, { showImageCaption });

        // 将代码高亮的 computed style 写入 inline style
        // Obsidian 的代码高亮颜色通过 CSS class 产生，不在主题 CSS 中，
        // juice 无法内联，需要在 DOM 还挂载时读取 computed style 补全
        applyCodeHighlightStyles(tempDiv);

        // 将代码块按行拆分，每行用 section + padding-left 实现缩进
        // 微信公众号保存后会移除 white-space: pre-wrap 并折叠空格（包括 NBSP）
        // 仅靠空格字符不可靠，必须用 CSS padding-left 作为缩进载体
        convertCodeBlockLines(tempDiv);

        // 移除定位样式
        tempDiv.removeAttribute('style');

        // 序列化 HTML
        const serializer = new XMLSerializer();
        const cleanContainer = activeDocument.createElement('div');
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
                new Notice('CSS 内联失败，样式可能不完整，请检查主题 CSS 是否有语法错误');
            }
        }

        // juice 的 cheerio 序列化可能丢失已有的 inline style，
        // 需要在 juice 处理后强制补回图片描述样式（与代码高亮补全同理）
        if (showImageCaption) {
            htmlContent = reapplyImageCaptionStyles(htmlContent);
        }

        return htmlContent;
    } finally {
        renderComponent.unload();
        if (tempDiv.parentNode) {
            activeDocument.body.removeChild(tempDiv);
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

            const img = activeDocument.createElement('img');
            img.src = dataUrl;
            img.alt = 'mermaid diagram';
            img.setCssProps(parseCssString('display: block; max-width: 100%; margin: 1em auto; border-radius: 0;'));

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
            const canvas = activeDocument.createElement('canvas');
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
        } catch (svgError) {
            console.error('SVG 转 PNG 失败:', svgError);
            resolve(null);
        }
    });
}

/**
 * juice 的 cheerio 序列化可能丢失元素已有的 inline style，
 * 用 DOMParser 重新解析 HTML，强制为 .mp-image-caption 元素补回样式。
 * 与 applyCodeHighlightStyles 的策略相同：在 juice 之后补全。
 */
function reapplyImageCaptionStyles(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const captions = doc.querySelectorAll('.mp-image-caption');
    if (captions.length === 0) return html;

    captions.forEach(caption => {
        const el = caption as HTMLElement;
        el.style.setProperty('display', 'block');
        el.style.setProperty('text-align', 'center');
        el.style.setProperty('font-size', '12px');
        el.style.setProperty('color', '#888');
        el.style.setProperty('margin', '-0.6em 0 1em 0');
        el.style.setProperty('padding', '0');
    });

    const wrapper = doc.body.firstChild as Element;
    return wrapper.innerHTML;
}