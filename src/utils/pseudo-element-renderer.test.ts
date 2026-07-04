/**
 * 伪元素渲染器 — 纯函数单元测试
 */
import { describe, it, expect } from 'vitest';
import {
    formatCounterValue,
    toRoman,
    numToAlpha,
    parsePseudoRules,
    resolveContent,
    parseCounterConfig,
    splitCSSBlocks,
    removePseudoRulesFromCSS,
} from './pseudo-element-renderer';

// ============================================================
// formatCounterValue
// ============================================================

describe('formatCounterValue', () => {
    it('decimal (default)', () => {
        expect(formatCounterValue(1, 'decimal')).toBe('1');
        expect(formatCounterValue(42, 'decimal')).toBe('42');
    });

    it('decimal-leading-zero', () => {
        expect(formatCounterValue(1, 'decimal-leading-zero')).toBe('01');
        expect(formatCounterValue(9, 'decimal-leading-zero')).toBe('09');
        expect(formatCounterValue(10, 'decimal-leading-zero')).toBe('10');
        expect(formatCounterValue(99, 'decimal-leading-zero')).toBe('99');
    });

    it('upper-roman', () => {
        expect(formatCounterValue(1, 'upper-roman')).toBe('I');
        expect(formatCounterValue(4, 'upper-roman')).toBe('IV');
        expect(formatCounterValue(9, 'upper-roman')).toBe('IX');
        expect(formatCounterValue(42, 'upper-roman')).toBe('XLII');
        expect(formatCounterValue(99, 'upper-roman')).toBe('XCIX');
    });

    it('lower-roman', () => {
        expect(formatCounterValue(1, 'lower-roman')).toBe('i');
        expect(formatCounterValue(4, 'lower-roman')).toBe('iv');
        expect(formatCounterValue(2024, 'lower-roman')).toBe('mmxxiv');
    });

    it('upper-alpha / upper-latin', () => {
        expect(formatCounterValue(1, 'upper-alpha')).toBe('A');
        expect(formatCounterValue(26, 'upper-alpha')).toBe('Z');
        expect(formatCounterValue(27, 'upper-alpha')).toBe('AA');
        expect(formatCounterValue(52, 'upper-alpha')).toBe('AZ');
        expect(formatCounterValue(53, 'upper-alpha')).toBe('BA');
    });

    it('lower-alpha / lower-latin', () => {
        expect(formatCounterValue(1, 'lower-alpha')).toBe('a');
        expect(formatCounterValue(26, 'lower-alpha')).toBe('z');
        expect(formatCounterValue(27, 'lower-alpha')).toBe('aa');
        expect(formatCounterValue(28, 'lower-latin')).toBe('ab');
    });

    it('unknown style falls back to decimal', () => {
        expect(formatCounterValue(5, 'unknown-style')).toBe('5');
    });
});

// ============================================================
// toRoman
// ============================================================

describe('toRoman', () => {
    it('basic conversions', () => {
        expect(toRoman(1)).toBe('i');
        expect(toRoman(2)).toBe('ii');
        expect(toRoman(3)).toBe('iii');
        expect(toRoman(4)).toBe('iv');
        expect(toRoman(5)).toBe('v');
        expect(toRoman(6)).toBe('vi');
        expect(toRoman(9)).toBe('ix');
        expect(toRoman(10)).toBe('x');
    });

    it('tens', () => {
        expect(toRoman(14)).toBe('xiv');
        expect(toRoman(19)).toBe('xix');
        expect(toRoman(20)).toBe('xx');
        expect(toRoman(40)).toBe('xl');
        expect(toRoman(49)).toBe('xlix');
        expect(toRoman(50)).toBe('l');
        expect(toRoman(90)).toBe('xc');
        expect(toRoman(99)).toBe('xcix');
    });

    it('hundreds and thousands', () => {
        expect(toRoman(100)).toBe('c');
        expect(toRoman(400)).toBe('cd');
        expect(toRoman(500)).toBe('d');
        expect(toRoman(900)).toBe('cm');
        expect(toRoman(1000)).toBe('m');
        expect(toRoman(2024)).toBe('mmxxiv');
        expect(toRoman(3999)).toBe('mmmcmxcix');
    });
});

// ============================================================
// numToAlpha
// ============================================================

describe('numToAlpha', () => {
    it('single letters', () => {
        expect(numToAlpha(1)).toBe('a');
        expect(numToAlpha(13)).toBe('m');
        expect(numToAlpha(26)).toBe('z');
    });

    it('double letters', () => {
        expect(numToAlpha(27)).toBe('aa');
        expect(numToAlpha(52)).toBe('az');
        expect(numToAlpha(53)).toBe('ba');
        expect(numToAlpha(78)).toBe('bz');
        expect(numToAlpha(79)).toBe('ca');
    });

    it('triple letters', () => {
        expect(numToAlpha(703)).toBe('aaa');
        expect(numToAlpha(728)).toBe('aaz');
    });

    it('zero or negative returns empty string', () => {
        expect(numToAlpha(0)).toBe('');
        expect(numToAlpha(-1)).toBe('');
    });
});

// ============================================================
// splitCSSBlocks
// ============================================================

describe('splitCSSBlocks', () => {
    it('splits simple blocks', () => {
        const css = 'h1 { color: red; } h2 { color: blue; }';
        const blocks = splitCSSBlocks(css);
        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toBe('h1 { color: red; }');
        expect(blocks[1].trim()).toBe('h2 { color: blue; }');
    });

    it('handles nested braces in non-standard CSS', () => {
        const css = '.a { content: "{" attr(href) "}"; }';
        const blocks = splitCSSBlocks(css);
        expect(blocks).toHaveLength(1);
    });

    it('handles empty input', () => {
        expect(splitCSSBlocks('')).toHaveLength(0);
    });
});

// ============================================================
// parsePseudoRules
// ============================================================

describe('parsePseudoRules', () => {
    it('extracts ::before rules', () => {
        const css = 'h1::before { content: "→"; color: red; }';
        const rules = parsePseudoRules(css);
        expect(rules).toHaveLength(1);
        expect(rules[0].baseSelector).toBe('h1');
        expect(rules[0].pseudoType).toBe('before');
        expect(rules[0].properties['content']).toBe('"→"');
        expect(rules[0].properties['color']).toBe('red');
    });

    it('extracts ::after rules', () => {
        const css = 'h1::after { content: "←"; }';
        const rules = parsePseudoRules(css);
        expect(rules).toHaveLength(1);
        expect(rules[0].pseudoType).toBe('after');
    });

    it('rejects pseudo-element in middle of selector (Info.2 fix)', () => {
        // ::before appearing in the middle of selector is invalid
        const css = '.prefix::before-something { color: red; }';
        const rules = parsePseudoRules(css);
        // 不应匹配 ".prefix::before-something" 中的 "::before"
        expect(rules).toHaveLength(0);
    });

    it('handles multiple selectors in one block', () => {
        const css = 'h1::before, h2::before { content: counter(chapter); }';
        const rules = parsePseudoRules(css);
        expect(rules).toHaveLength(2);
        expect(rules[0].baseSelector).toBe('h1');
        expect(rules[1].baseSelector).toBe('h2');
    });

    it('skips blocks without pseudo-elements', () => {
        const css = 'h1 { color: red; } h2::before { content: ">"; }';
        const rules = parsePseudoRules(css);
        expect(rules).toHaveLength(1);
    });

    it('strips comments before parsing', () => {
        const css = '/* h1::before { old: rule; } */ h2::before { content: ">"; }';
        const rules = parsePseudoRules(css);
        expect(rules).toHaveLength(1);
        expect(rules[0].baseSelector).toBe('h2');
    });

    it('handles complex selectors', () => {
        const css = '.mp-content-section blockquote::before { content: "\\201C"; }';
        const rules = parsePseudoRules(css);
        expect(rules).toHaveLength(1);
        expect(rules[0].baseSelector).toBe('.mp-content-section blockquote');
    });
});

// ============================================================
// parseCounterConfig
// ============================================================

describe('parseCounterConfig', () => {
    it('parses counter-reset', () => {
        const css = 'body { counter-reset: h2 0; }';
        const config = parseCounterConfig(css);
        expect(config.resets).toHaveLength(1);
        expect(config.resets[0].name).toBe('h2');
        expect(config.resets[0].value).toBe(0);
    });

    it('parses counter-increment', () => {
        const css = 'h2 { counter-increment: h2 1; }';
        const config = parseCounterConfig(css);
        expect(config.increments).toHaveLength(1);
        expect(config.increments[0].name).toBe('h2');
        expect(config.increments[0].value).toBe(1);
    });

    it('skips counter-reset: none (P2.2 fix)', () => {
        const css = 'body { counter-reset: none; }';
        const config = parseCounterConfig(css);
        expect(config.resets).toHaveLength(0);
    });

    it('skips counter-increment: none (P2.2 fix)', () => {
        const css = 'h2 { counter-increment: none; }';
        const config = parseCounterConfig(css);
        expect(config.increments).toHaveLength(0);
    });

    it('skips CSS-wide keywords: inherit, initial, unset (P2.2 fix)', () => {
        const css = `
            body { counter-reset: inherit; }
            div { counter-reset: initial; }
            p { counter-reset: unset; }
        `;
        const config = parseCounterConfig(css);
        expect(config.resets).toHaveLength(0);
    });

    it('skips pseudo-element blocks', () => {
        const css = 'h2::before { counter-increment: h2 1; }';
        const config = parseCounterConfig(css);
        expect(config.increments).toHaveLength(0);
    });

    it('handles multiple selectors', () => {
        const css = 'h2, h3 { counter-increment: heading 1; }';
        const config = parseCounterConfig(css);
        expect(config.increments).toHaveLength(2);
    });
});

// ============================================================
// resolveContent
// ============================================================

describe('resolveContent', () => {
    const mockEl = document.createElement('div');

    it('returns null for none/normal/empty', () => {
        expect(resolveContent('none', mockEl, undefined)).toBeNull();
        expect(resolveContent('normal', mockEl, undefined)).toBeNull();
        expect(resolveContent('', mockEl, undefined)).toBeNull();
    });

    it('resolves simple string content', () => {
        const result = resolveContent('"→"', mockEl, undefined);
        expect(result).toBe('→');
    });

    it('resolves string with unicode escapes', () => {
        const result = resolveContent('"\\201C"', mockEl, undefined);
        expect(result).toBe('“');
    });

    it('resolves counter() with default decimal style', () => {
        const counterMap = new Map([['h2', 5]]);
        const result = resolveContent('counter(h2)', mockEl, counterMap);
        expect(result).toBe('5');
    });

    it('resolves counter() with explicit style', () => {
        const counterMap = new Map([['h2', 1]]);
        const result = resolveContent('counter(h2, decimal-leading-zero)', mockEl, counterMap);
        expect(result).toBe('01');
    });

    it('resolves counter() with upper-roman style', () => {
        const counterMap = new Map([['chapter', 4]]);
        const result = resolveContent('counter(chapter, upper-roman)', mockEl, counterMap);
        expect(result).toBe('IV');
    });

    it('resolves mixed string + counter content (P1.2 fix)', () => {
        const counterMap = new Map([['h2', 3]]);
        const result = resolveContent('"第" counter(h2) "章"', mockEl, counterMap);
        expect(result).toBe('第3章');
    });

    it('resolves mixed content with leading-zero', () => {
        const counterMap = new Map([['h2', 1]]);
        const result = resolveContent('"第" counter(h2, decimal-leading-zero) "章"', mockEl, counterMap);
        expect(result).toBe('第01章');
    });

    it('resolves mixed content with unicode escapes', () => {
        const counterMap = new Map([['quote', 1]]);
        const result = resolveContent('"\\201C" counter(quote) "\\201D"', mockEl, counterMap);
        expect(result).toBe('“1”');
    });

    it('resolves mixed content with multiple counters', () => {
        const counterMap = new Map([['chapter', 2], ['section', 1]]);
        const result = resolveContent('counter(chapter) "." counter(section)', mockEl, counterMap);
        expect(result).toBe('2.1');
    });

    it('returns null for counter name not in map', () => {
        const counterMap = new Map([['other', 5]]);
        // Pure counter expression — counter not found, returns empty string via tokenize
        const result = resolveContent('counter(missing)', mockEl, counterMap);
        // tokenizeContent returns '' (matched token but empty result)
        expect(result).toBe('');
    });
});

// ============================================================
// removePseudoRulesFromCSS
// ============================================================

describe('removePseudoRulesFromCSS', () => {
    it('removes ::before and ::after blocks', () => {
        const css = `
            h1 { color: red; }
            h1::before { content: ">"; }
            h1::after { content: "<"; }
            p { font-size: 16px; }
        `;
        const result = removePseudoRulesFromCSS(css);
        expect(result).toContain('h1 { color: red; }');
        expect(result).toContain('p { font-size: 16px; }');
        expect(result).not.toContain('::before');
        expect(result).not.toContain('::after');
    });

    it('preserves non-pseudo-element comments (Info.3 fix)', () => {
        const css = `
            /* This is a heading */
            h1 { color: red; }
            /* This is a pseudo — should be removed */
            h1::before { content: ">"; }
            /* This is a paragraph */
            p { font-size: 16px; }
        `;
        const result = removePseudoRulesFromCSS(css);
        expect(result).toContain('/* This is a heading */');
        expect(result).toContain('/* This is a paragraph */');
        expect(result).not.toContain('::before');
    });

    it('handles CSS with no pseudo-elements', () => {
        const css = 'h1 { color: red; } p { font-size: 16px; }';
        const result = removePseudoRulesFromCSS(css);
        // 应保留所有规则
        expect(result).toContain('h1');
        expect(result).toContain('p');
    });
});
