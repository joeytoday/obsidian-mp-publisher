import { parseCssString } from './css-props';
import { collectTextNodes } from './text-nodes';

/**
 * 将代码块每行包裹在 section 中，用 padding-left 保留缩进。
 * 空行使用 br 占位，避免在复制或微信发布时被折叠。
 */
export function convertCodeBlockLines(container: HTMLElement): void {
	const NBSP = '\u00A0';

	// 先将普通空格替换为 NBSP，保护行内间距。
	container.querySelectorAll('pre code').forEach(codeEl => {
		const textNodes = collectTextNodes(codeEl);

		for (const textNode of textNodes) {
			const text = textNode.textContent || '';
			if (!text.length) continue;
			const converted = text.replace(/ /g, NBSP);
			if (converted !== text) {
				textNode.textContent = converted;
			}
		}
	});

	container.querySelectorAll('pre code').forEach(codeEl => {
		const doc = codeEl.ownerDocument;

		// 将含换行符的文本节点拆分，使每个文本节点只属于一行。
		const textNodes = collectTextNodes(codeEl);
		for (const textNode of textNodes) {
			const text = textNode.textContent || '';
			if (!text.includes('\n')) continue;

			const parts = text.split('\n');
			const fragment = doc.createDocumentFragment();
			parts.forEach((part, index) => {
				if (index > 0) {
					fragment.appendChild(doc.createTextNode('\n'));
				}
				if (part.length > 0) {
					fragment.appendChild(doc.createTextNode(part));
				}
			});
			textNode.parentNode?.replaceChild(fragment, textNode);
		}

		const childNodes = Array.from(codeEl.childNodes);
		const lineGroups: Node[][] = [[]];

		for (const child of childNodes) {
			if (child.nodeType === Node.TEXT_NODE && child.textContent === '\n') {
				lineGroups.push([]);
			} else {
				lineGroups[lineGroups.length - 1].push(child);
			}
		}

		// MarkdownRenderer 通常会在代码块末尾保留一个换行符，不应把它转成额外空行。
		if (lineGroups.length > 1 && lineGroups[lineGroups.length - 1].length === 0) {
			lineGroups.pop();
		}

		if (lineGroups.length <= 1) return;

		const lineSections: HTMLElement[] = [];
		for (const group of lineGroups) {
			let leadingNbspCount = 0;

			for (const child of group) {
				if (child.nodeType === Node.TEXT_NODE) {
					const text = child.textContent || '';
					for (const char of text) {
						if (char === NBSP) {
							leadingNbspCount++;
						} else {
							break;
						}
					}
					if (leadingNbspCount > 0 && text.length === leadingNbspCount) {
						continue;
					}
					break;
				}

				if (child.nodeType === Node.ELEMENT_NODE) {
					const firstText = (child as HTMLElement).textContent || '';
					for (const char of firstText) {
						if (char === NBSP) {
							leadingNbspCount++;
						} else {
							break;
						}
					}
				}
				break;
			}

			let removedCount = 0;
			for (const child of group) {
				if (removedCount >= leadingNbspCount) break;

				if (child.nodeType === Node.TEXT_NODE) {
					const text = child.textContent || '';
					const remaining = leadingNbspCount - removedCount;
					const nbspInNode = text.length <= remaining ? text.length : remaining;

					if (nbspInNode === text.length) {
						child.textContent = '';
						removedCount += text.length;
					} else {
						child.textContent = text.slice(nbspInNode);
						removedCount += nbspInNode;
					}
				} else if (child.nodeType === Node.ELEMENT_NODE) {
					const firstTextChild = child.childNodes[0];
					if (firstTextChild?.nodeType === Node.TEXT_NODE) {
						const text = firstTextChild.textContent || '';
						const remaining = leadingNbspCount - removedCount;
						const nbspInNode = text.length <= remaining ? text.length : remaining;
						firstTextChild.textContent = nbspInNode === text.length
							? ''
							: text.slice(nbspInNode);
						removedCount += nbspInNode;
					}
					break;
				} else {
					break;
				}
			}

			const section = doc.createElement('section');
			section.setCssProps(parseCssString(
				`display: block; margin: 0; padding: 0; padding-left: ${leadingNbspCount * 0.5}em; line-height: 1.6;`,
			));

			for (const child of group) {
				if (child.nodeType === Node.TEXT_NODE && !child.textContent?.length) continue;
				section.appendChild(child);
			}

			if (!section.textContent?.length) {
				section.empty();
				section.appendChild(doc.createElement('br'));
			}

			lineSections.push(section);
		}

		codeEl.empty();
		lineSections.forEach(section => codeEl.appendChild(section));
	});
}
