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
