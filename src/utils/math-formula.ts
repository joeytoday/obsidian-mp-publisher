/**
 * 数学公式处理工具
 * 支持 LaTeX 公式的预处理和图片转换
 */

import { requestUrl } from 'obsidian';

/**
 * 预处理 Markdown 内容，转换 LaTeX 语法为 Obsidian 支持的 $ 语法
 */
export function preprocessMathFormula(markdown: string): string {
    let processed = markdown;

    // 保护代码块，避免误转换其中的 LaTeX 语法
    const codeBlockMap = new Map<string, string>();
    let codeBlockId = 0;

    // 保护围栏代码块和行内代码
    processed = processed.replace(/```[\s\S]*?```|`[^`\n]+?`/g, (match) => {
        const id = `__CODE_BLOCK_${codeBlockId++}__`;
        codeBlockMap.set(id, match);
        return id;
    });

    // \[...\] -> $$...$$ (块级公式)
    processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => `$$${tex}$$`);

    // \(...\) -> $...$ (行内公式)
    processed = processed.replace(/\\\(([^\n]+?)\\\)/g, (_, tex) => `$${tex}$`);

    // 恢复代码块
    codeBlockMap.forEach((code, id) => {
        processed = processed.replace(id, () => code);
    });

    return processed;
}

/**
 * 等待异步渲染完成（MathJax 等）
 */
export async function waitForAsyncRender(el: HTMLElement, maxWait = 3000): Promise<void> {
    const hasMath = el.querySelector('.math, .math-inline, .math-block, mjx-container');
    if (!hasMath) return;

    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const containers = el.querySelectorAll('mjx-container');
        if (containers.length > 0) {
            const hasContent = Array.from(containers).some(c => c.innerHTML.length > 50);
            if (hasContent) return;
        }
        await new Promise(r => setTimeout(r, 100));
    }
}

/**
 * 将 MathJax 公式转换为 PNG 图片
 */
export async function convertMathToSVG(htmlContent: string, markdown: string): Promise<string> {
    if (!markdown) return htmlContent;

    // 提取公式
    const formulas = extractFormulas(markdown);
    if (formulas.length === 0) return htmlContent;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 查找所有 MathJax 容器
    const containers = Array.from(doc.querySelectorAll('mjx-container'))
        .filter(el => !el.parentElement?.closest('mjx-container'));

    for (let i = 0; i < Math.min(containers.length, formulas.length); i++) {
        const container = containers[i];
        const formula = formulas[i];

        try {
            // 使用在线 API 渲染公式为图片
            const imgHtml = await renderFormulaWithApi(formula.tex, formula.isBlock);
            if (imgHtml) {
                const placeholder = doc.createElement('span');
                placeholder.innerHTML = imgHtml;
                container.replaceWith(placeholder.firstChild as Node);
            }
        } catch (e) {
            console.error('[Math] 转换失败:', e);
        }
    }

    return doc.body.innerHTML;
}

/**
 * 从 Markdown 中提取公式
 */
function extractFormulas(markdown: string): Array<{ tex: string; isBlock: boolean }> {
    const formulas: Array<{ tex: string; isBlock: boolean; pos: number }> = [];

    let protectedMd = markdown.replace(/```[\s\S]*?```|`[^`\n]*?`/g, m => ' '.repeat(m.length));

    let match: RegExpExecArray | null;
    const blockRegex = /\$\$([\s\S]+?)\$\$/g;
    while ((match = blockRegex.exec(protectedMd)) !== null) {
        formulas.push({ tex: match[1].trim(), isBlock: true, pos: match.index });
    }

    const inlineRegex = /(?<!\$)\$((?:[^\$\n\\]|\\.)+?)\$(?!\$)/g;
    while ((match = inlineRegex.exec(protectedMd)) !== null) {
        formulas.push({ tex: match[1].trim(), isBlock: false, pos: match.index });
    }

    return formulas.sort((a, b) => a.pos - b.pos);
}

/**
 * 使用在线 API 渲染公式为图片
 */
async function renderFormulaWithApi(tex: string, isBlock: boolean): Promise<string | null> {
    try {
        // 使用 CodeCogs API 渲染公式
        const encodedTex = encodeURIComponent(tex);
        const apiUrl = `https://latex.codecogs.com/png.latex?\\dpi{200}${encodedTex}`;

        // 下载图片
        const response = await requestUrl({
            url: apiUrl,
            method: 'GET',
        });

        if (response.status !== 200) {
            console.error('[Math] API 请求失败:', response.status);
            return null;
        }

        // 转换为 base64
        const arrayBuffer = response.arrayBuffer;
        const base64 = arrayBufferToBase64(arrayBuffer);
        const dataUrl = `data:image/png;base64,${base64}`;

        const imgStyle = isBlock
            ? 'display:block;margin:1em auto;max-width:100%;'
            : 'vertical-align:middle;display:inline-block;';

        return `<img src="${dataUrl}" alt="${escapeHtml(tex)}" style="${imgStyle}">`;
    } catch (e) {
        console.error('[Math] API 渲染失败:', e);
        return null;
    }
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * HTML 转义
 */
function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
}