import { sanitizeHTMLToDom } from 'obsidian';

/**
 * 处理列表项内部的 p 标签内联化。
 * 列表已在 converter.ts 中转换为 section + p 结构，
 * 此函数确保 mp-list-item 内的 p 标签保持 inline 显示，
 * 与 CopyManager 和 WechatPublisher 的处理逻辑保持一致。
 */
export function processListItems(container: HTMLElement): void {
	container.querySelectorAll('.mp-list-item').forEach(item => {
		const el = item as HTMLElement;
		el.querySelectorAll('p').forEach(pEl => {
			(pEl as HTMLElement).setCssProps({ display: 'inline', margin: '0', padding: '0' });
		});
	});
}

/**
 * 收集元素内所有文本节点（使用 TreeWalker）
 * 统一 converter.ts 和 wechat.ts 中重复的 TreeWalker 遍历逻辑
 */
export function collectTextNodes(element: Element): Text[] {
	const doc = element.ownerDocument;
	const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const textNodes: Text[] = [];
	let node: Node | null;
	while ((node = walker.nextNode())) {
		textNodes.push(node as Text);
	}
	return textNodes;
}

/**
 * 将 HTML 字符串解析为 DOM 容器
 * 统一 sanitizeHTMLToDom + tempDiv 的重复模式
 */
export function parseHtmlToContainer(html: string, doc: Document = activeDocument): HTMLDivElement {
	const tempDiv = doc.createElement('div');
	tempDiv.appendChild(sanitizeHTMLToDom(html));
	return tempDiv;
}
