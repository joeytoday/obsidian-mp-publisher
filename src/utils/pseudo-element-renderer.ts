/**
 * 伪元素渲染器
 *
 * 在 DOM 挂载时将 CSS ::before / ::after 伪元素转为真实 <span> 元素，
 * 解决微信公众号和 juice 内联引擎无法处理伪元素的问题。
 *
 * 核心原理：
 *   1. 解析主题 CSS，提取所有 ::before / ::after 规则
 *   2. 手动追踪 CSS 计数器（counter-reset / counter-increment）
 *   3. 按 DOM 顺序遍历匹配元素，计算计数器当前值
 *   4. 创建真实 <span> 并写入 inline style + textContent
 *   5. 从 CSS 字符串中移除所有 ::before / ::after 规则块
 *
 * 赤霞主题适配：
 *   h1::after           → <span class="h1-dot">       （金色圆点）
 *   h2::before          → <span class="h2-num">        （01/02… 序号）
 *   h3::after           → <span class="h3-dot">        （金色小圆点）
 *   blockquote::before  → <span class="bq-mark">       （大引号 "）
 *   .mp-callout::before → <span class="callout-mark">  （装饰符号 ※✦◆…）
 */

// ============================================================
// 类型
// ============================================================

interface PseudoRule {
    baseSelector: string;
    pseudoType: 'before' | 'after';
    properties: Record<string, string>;
}

interface CounterConfig {
    resets: Array<{ selector: string; name: string; value: number }>;
    increments: Array<{ selector: string; name: string; value: number }>;
}

// ============================================================
// CSS 解析
// ============================================================

export function parsePseudoRules(css: string): PseudoRule[] {
    const rules: PseudoRule[] = [];
    const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = splitCSSBlocks(cssWithoutComments);

    for (const block of blocks) {
        const braceIndex = block.indexOf('{');
        if (braceIndex === -1) continue;

        const selectorPart = block.substring(0, braceIndex).trim();
        const bodyPart = block.substring(braceIndex + 1).trim();
        if (!selectorPart || !bodyPart) continue;

        const selectors = splitSelectors(selectorPart);

        for (const sel of selectors) {
            const trimmed = sel.trim();
            if (!trimmed) continue;

            // Fix (Info.2): 使用 regex 精确匹配 selector 末尾的 ::before/::after，
            // 避免匹配到出现在 selector 中间的无效伪元素
            const pseudoMatch = trimmed.match(/::(before|after)\s*$/);
            if (!pseudoMatch) continue;
            const pseudoType = pseudoMatch[1] as 'before' | 'after';

            const baseSelector = trimmed
                .replace(/::before/g, '')
                .replace(/::after/g, '')
                .trim();
            if (!baseSelector) continue;

            rules.push({ baseSelector, pseudoType, properties: parseProperties(bodyPart) });
        }
    }

    return rules;
}

export function parseCounterConfig(css: string): CounterConfig {
    const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = splitCSSBlocks(cssWithoutComments);
    const resets: CounterConfig['resets'] = [];
    const increments: CounterConfig['increments'] = [];

    // Fix (P2.2): CSS-wide keywords that should not be parsed as counter names
    const CSS_WIDE_KEYWORDS = new Set(['none', 'inherit', 'initial', 'unset']);

    for (const block of blocks) {
        const braceIndex = block.indexOf('{');
        if (braceIndex === -1) continue;

        const selectorPart = block.substring(0, braceIndex).trim();
        const bodyPart = block.substring(braceIndex + 1).trim();
        if (!selectorPart || !bodyPart) continue;

        // 跳过伪元素块
        if (selectorPart.includes('::before') || selectorPart.includes('::after')) continue;

        const properties = parseProperties(bodyPart);

        // counter-reset: "counter-name <value>?"
        if (properties['counter-reset']) {
            const parts = properties['counter-reset'].trim().split(/\s+/);
            // Fix (P2.2): 跳过 CSS-wide 关键字，防止 "none" 被解析为计数器名
            if (!CSS_WIDE_KEYWORDS.has(parts[0].toLowerCase())) {
                const name = parts[0];
                const value = parts.length > 1 ? parseInt(parts[1], 10) : 0;
                if (name && !isNaN(value)) {
                    for (const sel of splitSelectors(selectorPart)) {
                        if (!sel.includes('::before') && !sel.includes('::after')) {
                            resets.push({ selector: sel.trim(), name, value });
                        }
                    }
                }
            }
        }

        // counter-increment: "counter-name <value>?"
        if (properties['counter-increment']) {
            const parts = properties['counter-increment'].trim().split(/\s+/);
            // Fix (P2.2): 跳过 CSS-wide 关键字
            if (!CSS_WIDE_KEYWORDS.has(parts[0].toLowerCase())) {
                const name = parts[0];
                const value = parts.length > 1 ? parseInt(parts[1], 10) : 1;
                if (name && !isNaN(value)) {
                    for (const sel of splitSelectors(selectorPart)) {
                        if (!sel.includes('::before') && !sel.includes('::after')) {
                            increments.push({ selector: sel.trim(), name, value });
                        }
                    }
                }
            }
        }
    }

    return { resets, increments };
}

// ============================================================
// CSS 工具函数
// ============================================================

export function splitCSSBlocks(css: string): string[] {
    const blocks: string[] = [];
    let depth = 0;
    let current = '';

    for (const ch of css) {
        if (ch === '{') { depth++; current += ch; }
        else if (ch === '}') {
            depth--;
            current += ch;
            if (depth === 0) { blocks.push(current); current = ''; }
        } else { current += ch; }
    }
    if (current.trim()) blocks.push(current);
    return blocks;
}

function splitSelectors(selectorStr: string): string[] {
    const result: string[] = [];
    let depth = 0;
    let current = '';

    for (const ch of selectorStr) {
        if (ch === '(') { depth++; current += ch; }
        else if (ch === ')') { depth--; current += ch; }
        else if (ch === ',' && depth === 0) { result.push(current); current = ''; }
        else { current += ch; }
    }
    if (current.trim()) result.push(current);
    return result;
}

function parseProperties(body: string): Record<string, string> {
    const props: Record<string, string> = {};
    for (const decl of body.split(';')) {
        const colonIndex = decl.indexOf(':');
        if (colonIndex === -1) continue;
        const prop = decl.substring(0, colonIndex).trim();
        const value = decl.substring(colonIndex + 1).trim();
        if (prop && value) props[prop] = value;
    }
    return props;
}

// ============================================================
// 计数器计算
// ============================================================

export function formatCounterValue(value: number, style: string): string {
    switch (style) {
        case 'decimal-leading-zero': return String(value).padStart(2, '0');
        case 'upper-roman': return toRoman(value).toUpperCase();
        case 'lower-roman': return toRoman(value).toLowerCase();
        case 'upper-alpha': case 'upper-latin': return numToAlpha(value).toUpperCase();
        case 'lower-alpha': case 'lower-latin': return numToAlpha(value).toLowerCase();
        default: return String(value);
    }
}

export function toRoman(num: number): string {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i'];
    let result = '';
    for (let i = 0; i < vals.length; i++) while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
    return result;
}

export function numToAlpha(num: number): string {
    if (num <= 0) return '';
    let result = '';
    while (num > 0) { num--; result = String.fromCharCode(97 + (num % 26)) + result; num = Math.floor(num / 26); }
    return result;
}

function computeCounters(
    container: HTMLElement,
    config: CounterConfig,
): Map<Element, Map<string, number>> {
    const result = new Map<Element, Map<string, number>>();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    const counters = new Map<string, number>();

    let node: Node | null;
    while ((node = walker.nextNode())) {
        const el = node as HTMLElement;

        // counter-reset 先于 increment
        for (const reset of config.resets) {
            if (!matchesSelectorInContainer(el, reset.selector, container)) continue;
            counters.set(reset.name, reset.value);
        }

        for (const inc of config.increments) {
            if (!matchesSelectorInContainer(el, inc.selector, container)) continue;
            const newVal = (counters.get(inc.name) ?? 0) + inc.value;
            counters.set(inc.name, newVal);
            if (!result.has(el)) result.set(el, new Map());
            result.get(el)!.set(inc.name, newVal);
        }
    }

    return result;
}

function matchesSelectorInContainer(
    el: HTMLElement,
    selector: string,
    container: HTMLElement,
): boolean {
    try {
        return container.contains(el) && el.matches(selector);
    } catch { return false; }
}

// ============================================================
// 内容解析
// ============================================================

/**
 * Fix (P1.2): Tokenize content value to support mixed string + counter() expressions.
 *
 * CSS content 属性支持混合值，例如:
 *   content: "第" counter(h2) "章"   → "第01章"
 *   content: "\201C" counter(quote) "\201D"  → ""1"
 *
 * 此函数按顺序交替解析字符串引号段和 counter() 表达式，拼接为最终字符串。
 * 纯字符串和纯 counter() 也可由此函数统一处理。
 */
function tokenizeContent(value: string, counterMap: Map<string, number> | undefined): string | null {
    let result = '';
    let i = 0;
    let matchedAny = false;

    while (i < value.length) {
        // 跳过 token 之间的空白
        while (i < value.length && /\s/.test(value[i])) i++;
        if (i >= value.length) break;

        // 字符串引号段: "..." 或 '...'
        if (value[i] === '"' || value[i] === "'") {
            const quote = value[i];
            i++; // 跳过开引号
            let seg = '';
            while (i < value.length && value[i] !== quote) {
                if (value[i] === '\\' && i + 1 < value.length) {
                    i++; // 跳过反斜杠
                    // Unicode 转义 \XXXX
                    const hexMatch = value.substring(i).match(/^([0-9A-Fa-f]{4})\s?/);
                    if (hexMatch) {
                        seg += String.fromCodePoint(parseInt(hexMatch[1], 16));
                        i += hexMatch[0].length;
                    } else if (value[i] === '\\' || value[i] === quote) {
                        // 简单转义 \\ 或 \"
                        seg += value[i];
                        i++;
                    } else {
                        // 保留反斜杠 + 字符
                        seg += '\\' + value[i];
                        i++;
                    }
                } else {
                    seg += value[i];
                    i++;
                }
            }
            if (i < value.length) i++; // 跳过闭引号
            result += seg;
            matchedAny = true;
            continue;
        }

        // counter() 表达式
        if (value.substring(i).startsWith('counter(')) {
            i += 8; // 跳过 'counter('
            let depth = 0;
            let argsStr = '';
            while (i < value.length) {
                const ch = value[i];
                if (ch === '(') { depth++; argsStr += ch; }
                else if (ch === ')') {
                    if (depth === 0) break;
                    depth--;
                    argsStr += ch;
                } else {
                    argsStr += ch;
                }
                i++;
            }
            if (i < value.length) i++; // 跳过闭括号 ')'

            // 解析参数: counter(name, style)
            const commaIdx = argsStr.indexOf(',');
            const cName = (commaIdx >= 0 ? argsStr.substring(0, commaIdx) : argsStr).trim();
            const cStyle = commaIdx >= 0 ? argsStr.substring(commaIdx + 1).trim() : 'decimal';

            if (counterMap && cName) {
                const val = counterMap.get(cName);
                if (val !== undefined) {
                    result += formatCounterValue(val, cStyle);
                }
            }
            matchedAny = true;
            continue;
        }

        // 无法识别的 token，跳过字符
        i++;
    }

    return matchedAny ? result : null;
}

/**
 * Fix (P1.1 & P1.2): 统一通过 resolveContent 解析所有 content 值。
 *
 * 支持三种形式:
 *   1. 纯字符串: "→" 或 "\201C"
 *   2. 纯计数器: counter(h2, decimal-leading-zero)
 *   3. 混合形式: "第" counter(h2) "章"
 *
 * 所有形式由 tokenizeContent 统一处理，避免 renderPseudoForElement 中
 * 重复的 counter 解析逻辑产生不一致结果。
 */
export function resolveContent(
    cssContentValue: string,
    _el: HTMLElement,
    counterMap: Map<string, number> | undefined,
): string | null {
    if (!cssContentValue || cssContentValue === 'none' || cssContentValue === 'normal') {
        return null;
    }

    // 统一通过 tokenizeContent 解析，同时覆盖纯字符串、纯 counter() 和混合内容
    const tokenized = tokenizeContent(cssContentValue, counterMap);
    if (tokenized !== null) return tokenized;

    return null;
}

// ============================================================
// span 生成
// ============================================================

function generateSpanClass(
    tagName: string,
    pseudoType: 'before' | 'after',
    element: Element,
): string {
    const tag = tagName.toLowerCase();

    if (element.classList.contains('mp-callout') ||
        (element.className && String(element.className).includes('mp-callout-'))) {
        return 'callout-mark';
    }
    if (tag === 'blockquote') return 'bq-mark';
    if (pseudoType === 'before' && tag === 'h2') return 'h2-num';
    if (pseudoType === 'after' && tag === 'h1') return 'h1-dot';
    if (pseudoType === 'after' && tag === 'h3') return 'h3-dot';

    return `${tag}-${pseudoType}`;
}

function isVisualOnly(properties: Record<string, string>): boolean {
    const content = properties['content'];
    if (!content || content === '""' || content === "''" || content === 'none') {
        const visualProps = ['background', 'background-color', 'border', 'border-radius',
            'width', 'height', 'min-width', 'min-height'];
        return visualProps.some(p => p in properties);
    }
    return false;
}

function safeQuerySelectorAll(container: HTMLElement, selector: string): Element[] {
    try { return Array.from(container.querySelectorAll(selector)); }
    catch { return []; }
}

// ============================================================
// 核心渲染
// ============================================================

/**
 * Fix (P1.1): 移除 renderPseudoForElement 中独立的 counter 解析分支。
 *
 * 原先 renderPseudoForElement 手动拆括号解析 counter(name,style)，
 * 而 resolveContent 用正则做同样的事。两套逻辑可能产生不同结果。
 *
 * 现在所有 content 值的解析统一通过 resolveContent → tokenizeContent，
 * 包括纯字符串、纯 counter()、以及混合内容。
 */
function renderPseudoForElement(
    el: Element,
    rule: PseudoRule,
    counterMap: Map<string, number> | undefined,
): void {
    const htmlEl = el as HTMLElement;
    const cssContent = rule.properties['content'] || '';
    let textContent: string | null = null;
    let isEmptyVisual = false;

    if (isVisualOnly(rule.properties)) {
        // 纯装饰性，填充 &nbsp; 防止 XMLSerializer 自闭合导致 DOM 错乱
        isEmptyVisual = true;
        textContent = ' ';
    } else {
        // Fix (P1.1): 统一通过 resolveContent 解析，不再在此处手动拆括号解析 counter()
        textContent = resolveContent(cssContent, htmlEl, counterMap);

        // getComputedStyle 兜底（仅在 resolveContent 无法解析时）
        if (textContent === null) {
            try {
                const computed = getComputedStyle(htmlEl,
                    rule.pseudoType === 'before' ? '::before' : '::after');
                const compContent = computed.content;
                if (compContent && compContent !== 'none' && compContent !== 'normal') {
                    textContent = compContent.replace(/^["']|["']$/g, '');
                }
            } catch { /* ignore */ }
        }

        if (!textContent && textContent !== '') return;
    }

    // 创建 span
    const span = document.createElement('span');
    span.className = generateSpanClass(htmlEl.tagName, rule.pseudoType, el);

    // 将 CSS 属性写入 inline style（跳过 content 和 counter- 前缀属性）
    for (const [prop, value] of Object.entries(rule.properties)) {
        if (prop === 'content' || prop.startsWith('counter-')) continue;
        try { span.style.setProperty(prop, value); } catch { /* skip */ }
    }

    // 写入文本内容
    // 纯装饰 span 用 innerHTML 设置 &nbsp;，防止 XMLSerializer 输出自闭合标签
    if (textContent) {
        if (isEmptyVisual) {
            span.innerHTML = '&nbsp;';
        } else {
            span.textContent = textContent;
        }
    }

    // 插入 DOM
    try {
        if (rule.pseudoType === 'before') {
            htmlEl.insertBefore(span, htmlEl.firstChild);
        } else {
            htmlEl.appendChild(span);
        }
    } catch { /* skip */ }
}

// ============================================================
// CSS 清理
// ============================================================

/**
 * Fix (Info.3): 保留原始 CSS 中的注释。
 *
 * 原先实现先删除全部注释再重建 blocks，导致非伪元素块的注释也丢失。
 * 现在直接在原始 CSS 的 blocks 上过滤，只移除 selector 含伪元素的 block，
 * 保留所有其他内容（包括注释）。
 */
export function removePseudoRulesFromCSS(css: string): string {
    // 直接在原始 CSS 上分块，不预先删除注释
    const blocks = splitCSSBlocks(css);

    const filtered = blocks.filter(block => {
        const braceIndex = block.indexOf('{');
        const selectorPart = braceIndex >= 0 ? block.substring(0, braceIndex) : block;
        return !selectorPart.includes('::before') && !selectorPart.includes('::after');
    });

    return filtered.join('');
}

// ============================================================
// 主入口
// ============================================================

export function prerenderPseudoElements(container: HTMLElement, css: string): string {
    if (!css || !container) return css;

    // 1. 解析伪元素规则
    const pseudoRules = parsePseudoRules(css);
    if (pseudoRules.length === 0) return css;

    // 2. 计算计数器
    const counterConfig = parseCounterConfig(css);
    const counterMap = computeCounters(container, counterConfig);

    // 3. 渲染为真实 span
    for (const rule of pseudoRules) {
        const elements = safeQuerySelectorAll(container, rule.baseSelector);
        for (const el of elements) {
            const elCounters = counterMap.get(el as HTMLElement);
            renderPseudoForElement(el, rule, elCounters);
        }
    }

    // 4. 移除伪元素规则（保留注释）
    return removePseudoRulesFromCSS(css);
}
