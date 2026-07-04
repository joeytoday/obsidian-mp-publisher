/**
 * Parse a CSS string (like cssText value) into a Record<string, string> object
 * suitable for Obsidian's HTMLElement.setCssProps() API.
 *
 * Example: "display: inline; margin: 0;" → { display: "inline", margin: "0" }
 */
export function parseCssString(css: string): Record<string, string> {
	const props: Record<string, string> = {};
	for (const part of css.split(';')) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex === -1) continue;
		const key = trimmed.slice(0, colonIndex).trim();
		const value = trimmed.slice(colonIndex + 1).trim();
		if (key && value) {
			props[key] = value;
		}
	}
	return props;
}

/**
 * 图片描述样式常量 — 确保 converter.ts 和 copyManager.ts 使用一致的样式
 */
export const IMAGE_CAPTION_STYLE = 'display: block; text-align: center; font-size: 12px; color: #888; margin: -0.6em 0 1em 0; padding: 0;';

/**
 * 使用 juice 将 CSS 内联到 HTML 元素的 style 属性上
 * 统一 converter.ts 和 copyManager.ts 的 juice 调用
 */
export async function inlineCSSWithJuice(html: string, css: string): Promise<string> {
	if (!css) return html;
	try {
		const { inlineContent } = await import('juice');
		return inlineContent(html, css, {
			applyStyleTags: true,
			removeStyleTags: true,
			preserveMediaQueries: false,
			preserveFontFaces: false,
		});
	} catch (error) {
		console.error('juice 内联 CSS 失败:', error);
		return html;
	}
}
