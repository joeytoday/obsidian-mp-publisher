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
