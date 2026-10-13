/**
 * 收集元素内所有文本节点（使用 TreeWalker）。
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
