/**
 * HTML 清理与序列化工具
 */

/**
 * 将 DOM 元素序列化为 HTML 字符串，并清理 XMLSerializer 自动添加的 xmlns 属性
 */
export function serializeToHtml(element: HTMLElement): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(element)
        .replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');
}

/**
 * 判断元素是否为 SVG 或包含 SVG（用于避免误删图表元素）
 */
function isSvgRelated(element: Element): boolean {
    return element.tagName.toLowerCase() === 'svg'
        || element.querySelector('svg') !== null
        || element.closest('.mermaid, .plantuml, pre.mermaid, pre.plantuml') !== null;
}

/**
 * 清理 HTML 内容，移除 Obsidian 特有的 UI 元素
 * 直接操作 DOM 元素，避免反复序列化和解析带来的风险
 */
export function cleanObsidianUIElements(element: HTMLElement): void {
    try {
        // 移除Obsidian特有的UI元素（使用更具体的选择器避免误删）
        const elementsToRemove = [
            '.copy-code-button',           // 代码块复制按钮
            '.clickable-icon',             // 可点击图标
            '.markdown-embed-link',        // 嵌入链接
            '.internal-link',              // 内部链接图标
            '.collapse-indicator',         // 折叠指示器
            '.file-embed-link',            // 文件嵌入链接
            '.popover',                    // 弹出提示
            '.tooltip',                    // 工具提示
        ];

        elementsToRemove.forEach(selector => {
            element.querySelectorAll(selector).forEach(el => {
                if (!isSvgRelated(el)) {
                    el.remove();
                }
            });
        });

        // 清理代码块中的额外包装元素和按钮
        const preElements = element.querySelectorAll('pre');
        preElements.forEach(pre => {
            const isDiagram = pre.classList.contains('mermaid')
                || pre.classList.contains('plantuml')
                || pre.querySelector('.mermaid, .plantuml, [class*="mermaid"]') !== null
                || pre.getElementsByTagName('svg').length > 0;

            // 只移除pre内部的按钮元素
            const buttons = pre.querySelectorAll('button');
            buttons.forEach(button => button.remove());

            // 只有当确定不是图表且不包含 SVG 时，才执行清理
            if (!isDiagram) {
                const children = Array.from(pre.children);
                children.forEach(child => {
                    // 保留 code 标签
                    if (child.tagName.toLowerCase() === 'code') {
                        return;
                    }

                    if (child.getElementsByTagName('svg').length === 0) {
                        child.remove();
                    }
                });
            }
        });

        // 处理任务列表复选框（转换为文本标记）
        const checkboxes = element.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
        checkboxes.forEach(checkbox => {
            const isChecked = (checkbox as HTMLInputElement).checked;
            const textNode = document.createTextNode(isChecked ? '[x] ' : '[ ] ');
            checkbox.parentNode?.insertBefore(textNode, checkbox);
            checkbox.remove();
        });

    } catch (error) {
        console.error('清理HTML内容时出错:', error);
    }
}
