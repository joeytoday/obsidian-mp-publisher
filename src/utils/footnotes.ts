import { parseCssString } from './css-props';

interface NativeFootnoteDefinition {
	id: string;
	element: HTMLElement;
}

interface NativeFootnoteEntry {
	type: 'native';
	number: number;
	definition: NativeFootnoteDefinition;
}

interface LinkFootnoteEntry {
	type: 'link';
	number: number;
	text: string;
	url: string;
}

type FootnoteEntry = NativeFootnoteEntry | LinkFootnoteEntry;

const FOOTNOTE_SECTION_STYLE =
	'margin-top: 1.5em; padding-top: 0.75em; border-top: 1px solid #e0e0e0;';
const FOOTNOTE_ITEM_STYLE =
	'font-size: 0.85em; color: #888; margin: 0.25em 0;';

function removeFootnoteSection(section: Element, container: HTMLElement): void {
	const wrapper = section.parentElement;
	if (
		wrapper &&
		wrapper !== container &&
		wrapper.children.length === 1 &&
		(wrapper.classList.contains('mod-footnotes') || wrapper.classList.contains('el-section'))
	) {
		wrapper.remove();
		return;
	}
	section.remove();
}

function collectNativeDefinitions(container: HTMLElement): NativeFootnoteDefinition[] {
	const definitions: NativeFootnoteDefinition[] = [];

	container.querySelectorAll('.footnotes').forEach(section => {
		const list = section.querySelector(':scope > ol') || section.querySelector('ol');
		if (list) {
			Array.from(list.children).forEach(child => {
				if (!(child instanceof HTMLElement) || child.tagName !== 'LI') return;
				definitions.push({
					id: child.id || `mp-footnote-${definitions.length + 1}`,
					element: child,
				});
			});
		}
		removeFootnoteSection(section, container);
	});

	return definitions;
}

function decodeFragment(href: string): string {
	const fragment = href.startsWith('#') ? href.slice(1) : href;
	try {
		return decodeURIComponent(fragment);
	} catch {
		return fragment;
	}
}

function findNativeDefinition(
	anchor: HTMLAnchorElement,
	definitions: NativeFootnoteDefinition[],
	definitionsById: Map<string, NativeFootnoteDefinition>,
): NativeFootnoteDefinition | undefined {
	const href = anchor.getAttribute('href') || '';
	if (href.startsWith('#')) {
		const definition = definitionsById.get(decodeFragment(href));
		if (definition) return definition;
	}

	const isFootnoteReference =
		anchor.classList.contains('footnote-link') ||
		anchor.classList.contains('footnote-ref') ||
		anchor.parentElement?.classList.contains('footnote-ref');
	if (!isFootnoteReference) return undefined;

	const displayedNumber = Number.parseInt(anchor.textContent?.replace(/\D/g, '') || '', 10);
	if (!Number.isNaN(displayedNumber)) {
		return definitions[displayedNumber - 1];
	}
	return undefined;
}

function replaceReference(anchor: HTMLAnchorElement, number: number): void {
	const doc = anchor.ownerDocument;
	const sup = doc.createElement('sup');
	sup.className = 'footnote-ref';
	sup.setCssProps(parseCssString('font-size: 0.75em;'));
	sup.textContent = `[${number}]`;

	const existingSup = anchor.closest('sup.footnote-ref');
	if (existingSup) {
		existingSup.replaceWith(sup);
	} else {
		anchor.replaceWith(sup);
	}
}

function replaceExternalLink(anchor: HTMLAnchorElement, number: number): void {
	const doc = anchor.ownerDocument;
	const linkSpan = doc.createElement('span');
	linkSpan.setCssProps(parseCssString('text-decoration: underline;'));
	while (anchor.firstChild) {
		linkSpan.appendChild(anchor.firstChild);
	}
	if (!linkSpan.childNodes.length) {
		linkSpan.appendChild(doc.createTextNode(anchor.getAttribute('href') || ''));
	}

	const sup = doc.createElement('sup');
	sup.className = 'footnote-ref';
	sup.setCssProps(parseCssString('font-size: 0.75em;'));
	sup.textContent = `[${number}]`;

	const fragment = doc.createDocumentFragment();
	fragment.appendChild(linkSpan);
	fragment.appendChild(sup);
	anchor.replaceWith(fragment);
}

function unwrapDefinitionLinks(definition: HTMLElement): void {
	definition.querySelectorAll('a').forEach(anchor => {
		if (
			anchor.classList.contains('footnote-backref') ||
			(anchor.getAttribute('href') || '').startsWith('#fnref')
		) {
			if (anchor.previousSibling?.nodeType === Node.TEXT_NODE) {
				anchor.previousSibling.textContent = anchor.previousSibling.textContent?.trimEnd() || '';
			}
			anchor.remove();
			return;
		}

		const href = anchor.getAttribute('href') || '';
		const text = anchor.textContent?.trim() || href;
		const fragment = anchor.ownerDocument.createDocumentFragment();
		while (anchor.firstChild) {
			fragment.appendChild(anchor.firstChild);
		}
		if ((href.startsWith('http://') || href.startsWith('https://')) && href !== text) {
			fragment.appendChild(anchor.ownerDocument.createTextNode(`（${href}）`));
		}
		anchor.replaceWith(fragment);
	});
}

function appendNativeFootnote(item: HTMLElement, definition: NativeFootnoteDefinition): void {
	unwrapDefinitionLinks(definition.element);

	const content = item.ownerDocument.createElement('section');
	content.className = 'mp-footnote-content';
	content.setCssProps(parseCssString('display: inline;'));
	while (definition.element.firstChild) {
		content.appendChild(definition.element.firstChild);
	}
	content.querySelectorAll('p').forEach(paragraph => {
		(paragraph as HTMLElement).setCssProps(parseCssString('display: inline; margin: 0; padding: 0;'));
	});
	item.appendChild(content);
}

function appendFootnoteSection(container: HTMLElement, entries: FootnoteEntry[]): void {
	if (entries.length === 0) return;

	const section = container.ownerDocument.createElement('section');
	section.className = 'mp-footnotes';
	section.setCssProps(parseCssString(FOOTNOTE_SECTION_STYLE));

	entries.forEach(entry => {
		const item = container.ownerDocument.createElement('section');
		item.className = 'mp-footnote-item';
		item.setCssProps(parseCssString(FOOTNOTE_ITEM_STYLE));
		item.appendChild(container.ownerDocument.createTextNode(`[${entry.number}] `));

		if (entry.type === 'native') {
			appendNativeFootnote(item, entry.definition);
		} else {
			item.appendChild(container.ownerDocument.createTextNode(`${entry.text}：${entry.url}`));
		}
		section.appendChild(item);
	});

	container.appendChild(section);
}

/**
 * 将 Obsidian 原生脚注和 Markdown 外链统一转换为公众号可展示的脚注。
 * 输出中不保留页内锚点，避免微信草稿接口拒绝 footnote href/id。
 */
export function processLinksToFootnotes(container: HTMLElement): void {
	try {
		const definitions = collectNativeDefinitions(container);
		const definitionsById = new Map(definitions.map(definition => [definition.id, definition]));
		const nativeNumbers = new Map<string, number>();
		const urlNumbers = new Map<string, number>();
		const entries: FootnoteEntry[] = [];

		Array.from(container.querySelectorAll('a')).forEach(anchor => {
			if (anchor.closest('pre')) return;

			if (anchor.classList.contains('internal-link')) {
				const linkText = anchor.textContent || anchor.getAttribute('data-href') || '';
				anchor.replaceWith(anchor.ownerDocument.createTextNode(linkText));
				return;
			}

			const definition = findNativeDefinition(anchor, definitions, definitionsById);
			if (definition) {
				let number = nativeNumbers.get(definition.id);
				if (number === undefined) {
					number = entries.length + 1;
					nativeNumbers.set(definition.id, number);
					entries.push({ type: 'native', number, definition });
				}
				replaceReference(anchor, number);
				return;
			}

			const href = anchor.getAttribute('href') || '';
			if (!href.startsWith('http://') && !href.startsWith('https://')) return;

			const linkText = anchor.textContent || href;
			let number = urlNumbers.get(href);
			if (number === undefined) {
				number = entries.length + 1;
				urlNumbers.set(href, number);
				entries.push({ type: 'link', number, text: linkText, url: href });
			}
			replaceExternalLink(anchor, number);
		});

		appendFootnoteSection(container, entries);
	} catch (error) {
		console.error('[mp-publisher] 链接转脚注失败:', error);
	}
}
