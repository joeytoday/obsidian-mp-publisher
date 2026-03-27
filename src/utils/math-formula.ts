/**
 * 数学公式处理工具
 * 支持 LaTeX 公式的预处理和图片转换
 */

/** 匹配围栏代码块和行内代码的正则 */
const CODE_BLOCK_REGEX = /```[\s\S]*?```|`[^`\n]+?`/g;

/**
 * 在处理前保护代码块内容，返回替换后的文本和恢复函数
 */
function protectCodeBlocks(text: string): { protected: string; restore: (s: string) => string } {
    const codeBlockMap = new Map<string, string>();
    let idCounter = 0;

    const protectedText = text.replace(CODE_BLOCK_REGEX, (match) => {
        const placeholder = `__CODE_BLOCK_${idCounter++}__`;
        codeBlockMap.set(placeholder, match);
        return placeholder;
    });

    const restore = (s: string): string => {
        codeBlockMap.forEach((code, placeholder) => {
            s = s.replace(placeholder, () => code);
        });
        return s;
    };

    return { protected: protectedText, restore };
}

/**
 * 预处理 Markdown 内容，转换 LaTeX 语法为 Obsidian 支持的 $ 语法
 */
export function preprocessMathFormula(markdown: string): string {
    const { protected: safeText, restore } = protectCodeBlocks(markdown);

    let processed = safeText;
    processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => `$$${tex}$$`);
    processed = processed.replace(/\\\(([^\n]+?)\\\)/g, (_, tex) => `$${tex}$`);

    return restore(processed);
}

/**
 * 等待异步渲染完成（MathJax 等）
 */
export async function waitForAsyncRender(element: HTMLElement, maxWait = 3000): Promise<void> {
    if (!element.querySelector('.math, .math-inline, .math-block, mjx-container')) return;

    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const containers = element.querySelectorAll('mjx-container');
        if (containers.length > 0) {
            const hasContent = Array.from(containers).some(c => c.innerHTML.length > 50);
            if (hasContent) return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

/**
 * 将 MathJax 公式转换为 PNG 图片（通过 CodeCogs API）
 */
export async function convertMathToImage(htmlContent: string, markdown: string): Promise<string> {
    if (!markdown) return htmlContent;

    const formulas = extractFormulas(markdown);
    if (formulas.length === 0) return htmlContent;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const containers = Array.from(doc.querySelectorAll('mjx-container'))
        .filter(element => !element.parentElement?.closest('mjx-container'));

    for (let i = 0; i < Math.min(containers.length, formulas.length); i++) {
        const { tex, isBlock } = formulas[i];
        try {
            const imgHtml = buildFormulaImgTag(tex, isBlock);
            const wrapper = doc.createElement('span');
            wrapper.innerHTML = imgHtml;
            containers[i].replaceWith(wrapper.firstChild as Node);
        } catch (error) {
            console.error('[Math] 转换失败:', error);
        }
    }

    return doc.body.innerHTML;
}

/** 保持旧名称的别名，兼容已有调用 */
export const convertMathToSVG = convertMathToImage;

/**
 * 从 Markdown 中提取公式（保护代码块后匹配）
 */
function extractFormulas(markdown: string): Array<{ tex: string; isBlock: boolean }> {
    const results: Array<{ tex: string; isBlock: boolean; pos: number }> = [];
    const safeMarkdown = markdown.replace(CODE_BLOCK_REGEX, match => ' '.repeat(match.length));

    let match: RegExpExecArray | null;

    const blockRegex = /\$\$([\s\S]+?)\$\$/g;
    while ((match = blockRegex.exec(safeMarkdown)) !== null) {
        results.push({ tex: match[1].trim(), isBlock: true, pos: match.index });
    }

    const inlineRegex = /(?<!\$)\$((?:[^\$\n\\]|\\.)+?)\$(?!\$)/g;
    while ((match = inlineRegex.exec(safeMarkdown)) !== null) {
        results.push({ tex: match[1].trim(), isBlock: false, pos: match.index });
    }

    return results.sort((a, b) => a.pos - b.pos);
}

/**
 * 构建公式的 img 标签 HTML
 */
function buildFormulaImgTag(tex: string, isBlock: boolean): string {
    const encodedTex = encodeURIComponent(tex);
    const imgUrl = `https://latex.codecogs.com/png.latex?\\dpi{200}${encodedTex}`;
    const imgStyle = isBlock
        ? 'display:block;margin:1em auto;max-width:100%;'
        : 'vertical-align:middle;display:inline-block;';

    return `<img src="${imgUrl}" alt="${escapeHtml(tex)}" style="${imgStyle}">`;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
}
