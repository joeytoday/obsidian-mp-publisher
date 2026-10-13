/**
 * 序列化容器的内容，不带仅用于临时渲染的外层容器。
 */
export function serializeChildNodes(container: HTMLElement): string {
	const serializer = new XMLSerializer();
	return Array.from(container.childNodes)
		.map(node => serializer.serializeToString(node))
		.join('');
}
