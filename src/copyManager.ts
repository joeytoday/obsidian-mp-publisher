import { Notice } from 'obsidian';

export class CopyManager {
    /**
     * 提取 <style> 标签中的 CSS 内容
     */
    private static extractStyleCSS(element: HTMLElement): string {
        const styleTags = element.querySelectorAll('style');
        const cssFragments: string[] = [];
        styleTags.forEach(tag => {
            if (tag.textContent) {
                cssFragments.push(tag.textContent);
            }
        });
        return cssFragments.join('\n');
    }

    /**
     * 使用 juice 将 CSS 内联到 HTML 元素的 style 属性上，
     * 确保跨平台粘贴时样式一致
     */
    private static async inlineCSS(html: string, css: string): Promise<string> {
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

    /**
     * 清理 HTML 中不需要的属性（在 CSS 已内联之后调用）
     */
    private static cleanupAttributes(element: HTMLElement): void {
        element.querySelectorAll('*').forEach(el => {
            // 移除 data-* 属性
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    el.removeAttribute(attr.name);
                }
            });
            // 移除 id 属性
            el.removeAttribute('id');
            // 移除 class 属性（CSS 已内联，class 不再需要）
            el.removeAttribute('class');
        });
    }

    private static async processImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        const imageArray = Array.from(images);
        
        for (const img of imageArray) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        img.src = reader.result as string;
                        resolve(null);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('图片转换失败:', error);
            }
        }
    }

    /**
     * 从预览区域的 DOM 生成内联样式的 HTML 字符串。
     * 复制到公众号和发布到草稿箱共用此方法，确保两者输出完全一致。
     *
     * @param previewElement 预览区域的根 HTMLElement（包含 .mp-content-section）
     * @param processImagesForClipboard 是否将图片转为 base64（复制时为 true，发布时为 false，由发布流程单独处理图片上传）
     * @returns 内联样式后的 HTML 字符串
     */
    public static async getInlinedHtml(
        previewElement: HTMLElement,
        processImagesForClipboard: boolean = true,
    ): Promise<string> {
        const clone = previewElement.cloneNode(true) as HTMLElement;

        if (processImagesForClipboard) {
            await this.processImages(clone);
        }

        const contentSection = clone.querySelector('.mp-content-section');
        if (!contentSection) {
            throw new Error('找不到内容区域');
        }

        // 1. 提取 <style> 标签中的主题 CSS
        const themeCSS = this.extractStyleCSS(contentSection as HTMLElement);

        // 2. 移除 <style> 标签（后续由 juice 内联）
        contentSection.querySelectorAll('style').forEach(tag => tag.remove());

        // 3. 序列化为 HTML 字符串
        const serializer = new XMLSerializer();
        let rawHtml = serializer.serializeToString(contentSection);
        rawHtml = rawHtml.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');

        // 4. 使用 juice 将 CSS 内联到每个元素的 style 属性
        let inlinedHtml = await this.inlineCSS(rawHtml, themeCSS);

        // 5. 清理多余属性（data-*、id、class）
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = inlinedHtml;
        this.cleanupAttributes(tempContainer);

        return tempContainer.innerHTML;
    }

    public static async copyToClipboard(element: HTMLElement): Promise<void> {
        try {
            const finalHtml = await this.getInlinedHtml(element, true);

            const clone = element.cloneNode(true) as HTMLElement;
            const clipData = new ClipboardItem({
                'text/html': new Blob([finalHtml], { type: 'text/html' }),
                'text/plain': new Blob([clone.textContent || ''], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipData]);
            new Notice('已复制到剪贴板');
        } catch (error) {
            console.error('复制失败:', error);
            new Notice('复制失败');
        }
    }
}