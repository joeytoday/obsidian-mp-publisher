/**
 * 清理HTML内容，移除Obsidian特有的UI元素
 * 这个函数可以在预览和发布时共享使用
 */
/**
 * 清理HTML内容，移除Obsidian特有的UI元素
 * 直接操作 DOM 元素，避免反复序列化和解析带来的风险
 */
export function cleanObsidianUIElements(element: HTMLElement): void {
    try {
        // 移除Obsidian特有的UI元素（使用更具体的选择器避免误删）
        // 将内部链接转为纯文本（保留文本内容，去掉链接标签）
        const internalLinks = element.querySelectorAll('.internal-link');
        internalLinks.forEach(link => {
            const textContent = link.textContent || '';
            const textNode = activeDocument.createTextNode(textContent);
            link.parentNode?.replaceChild(textNode, link);
        });

        // 移除Obsidian特有的UI元素（使用更具体的选择器避免误删）
        const elementsToRemove = [
            '.copy-code-button',           // 代码块复制按钮
            '.clickable-icon',             // 可点击图标
            '.markdown-embed-link',        // 嵌入链接
            '.collapse-indicator',         // 折叠指示器
            '.file-embed-link',            // 文件嵌入链接
            '.popover',                    // 弹出提示
            '.tooltip',                    // 工具提示
        ];

        elementsToRemove.forEach(selector => {
            const elements = element.querySelectorAll(selector);
            elements.forEach(el => {
                // 不删除 SVG 元素或包含 SVG 的元素
                const isSVG = el.tagName.toLowerCase() === 'svg';
                const containsSVG = el.querySelector('svg') !== null;
                const isInDiagram = el.closest('.mermaid, .plantuml, pre.mermaid, pre.plantuml') !== null;

                if (!isSVG && !containsSVG && !isInDiagram) {
                    el.remove();
                }
            });
        });

        // 清理代码块中的额外包装元素和按钮
        const preElements = element.querySelectorAll('pre');
        preElements.forEach(pre => {
            // 1. 检查是否显式标记为图表
            const isExplicitDiagram = pre.classList.contains('mermaid') ||
                pre.classList.contains('plantuml');

            // 2. 检查内部是否有图表容器
            const hasDiagramContainer = pre.querySelector('.mermaid') !== null ||
                pre.querySelector('.plantuml') !== null ||
                pre.querySelector('[class*="mermaid"]') !== null;

            // 3. 检查是否有 SVG 元素
            const hasSVG = pre.getElementsByTagName('svg').length > 0;

            const isDiagram = isExplicitDiagram || hasDiagramContainer || hasSVG;

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

                    // 双重检查：如果这个 child 包含 SVG，绝对不要移除它
                    if (child.getElementsByTagName('svg').length > 0) {
                        return;
                    }

                    child.remove();
                });
            }
        });

        // 处理任务列表复选框（转换为文本标记）
        const checkboxes = element.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
        checkboxes.forEach(checkbox => {
            const isChecked = (checkbox as HTMLInputElement).checked;
            const textNode = activeDocument.createTextNode(isChecked ? '[x] ' : '[ ] ');
            checkbox.parentNode?.insertBefore(textNode, checkbox);
            checkbox.remove();
        });

    } catch (error) {
        console.error('清理HTML内容时出错:', error);
    }
}
