import { App } from 'obsidian';
import { SettingsManager } from './settings/settings';

export interface Template {
    id: string;
    name: string;
    description: string;
    isPreset?: boolean;
    isVisible?: boolean;
    styles: {
        container: string;
        title: {
            h1: {
                base: string;
                content: string;
                after: string;
            };
            h2: {
                base: string;
                content: string;
                after: string;
            };
            h3: {
                base: string;
                content: string;
                after: string;
            };
            base: {
                base: string;
                content: string;
                after: string;
            };
        };
        paragraph: string;
        list: {
            container: string;
            item: string;
            taskList: string;
        };
        quote: string;
        code: {
            header: {
                container: string;
                dot: string;
                colors: [string, string, string];
            };
            block: string;
            inline: string;
        };
        image: string;
        link: string;
        emphasis: {
            strong: string;
            em: string;
            del: string;
        };
        table: {
            container: string;
            header: string;
            cell: string;
        };
        hr: string;
    };
}

export class TemplateManager {
    private templates: Map<string, Template> = new Map();
    private currentTemplate: Template;
    private currentFont: string = '-apple-system';
    private currentFontSize: number = 16;
    private app: App;
    private settingsManager: SettingsManager;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
    }

    public setCurrentTemplate(id: string): boolean {
        const template = this.settingsManager.getTemplate(id);
        if (template) {
            this.currentTemplate = template;
            return true;
        }
        console.error('主题未找到:', id);
        return false;
    }

    public setFont(fontFamily: string) {
        this.currentFont = fontFamily;
    }

    public setFontSize(size: number) {
        this.currentFontSize = size;
    }

    public applyTemplate(element: HTMLElement, template?: Template): void {
        const styles = template ? template.styles : this.currentTemplate.styles;
        // 应用标题样式
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
            element.querySelectorAll(tag).forEach(el => {
                // 检查是否已经处理过
                if (!el.querySelector('.content')) {
                    const content = document.createElement('span');
                    content.className = 'content';
                    // 使用 textContent 替代 innerHTML
                    while (el.firstChild) {
                        content.appendChild(el.firstChild);
                    }
                    el.textContent = '';
                    el.appendChild(content);

                    const after = document.createElement('span');
                    after.className = 'after';
                    el.appendChild(after);
                }

                // 根据标签选择对应的样式
                const styleKey = (tag === 'h4' || tag === 'h5' || tag === 'h6' ? 'base' : tag) as keyof typeof styles.title;
                const titleStyle = styles.title[styleKey];

                // 应用样式
                el.setAttribute('style', `${titleStyle.base}; font-family: ${this.currentFont};`);
                el.querySelector('.content')?.setAttribute('style', titleStyle.content);
                el.querySelector('.after')?.setAttribute('style', titleStyle.after);
            });
        });

        // 应用段落样式
        element.querySelectorAll('p').forEach(el => {
            if (!el.parentElement?.closest('p') && !el.parentElement?.closest('blockquote')) {
                el.setAttribute('style', `${styles.paragraph}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`);
            }
        });

        // 应用列表样式
        element.querySelectorAll('ul, ol').forEach(el => {
            el.setAttribute('style', styles.list.container);
        });
        element.querySelectorAll('li').forEach(el => {
            el.setAttribute('style', `${styles.list.item}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`);
        });
        element.querySelectorAll('.task-list-item').forEach(el => {
            el.setAttribute('style', `${styles.list.taskList}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`);
        });

        // 应用引用样式
        element.querySelectorAll('blockquote').forEach(el => {
            el.setAttribute('style', `${styles.quote}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`);
        });

        // 应用代码样式
        element.querySelectorAll('pre').forEach(el => {
            // 应用基础代码块样式
            el.setAttribute('style', styles.code.block);

            // 设置代码块头部样式
            const header = el.querySelector('.mp-code-header');
            if (header) {
                header.setAttribute('style', styles.code.header.container);
                // 设置窗口按钮样式
                header.querySelectorAll('.mp-code-dot').forEach((dot, index) => {
                    dot.setAttribute('style', `${styles.code.header.dot}; background-color: ${styles.code.header.colors[index]};`);
                });
            }
        });

        // 应用内联代码样式
        element.querySelectorAll('code:not(pre code)').forEach(el => {
            el.setAttribute('style', styles.code.inline);
        });

        // 应用链接样式
        element.querySelectorAll('a').forEach(el => {
            el.setAttribute('style', styles.link);
        });

        // 应用强调样式
        element.querySelectorAll('strong').forEach(el => {
            el.setAttribute('style', styles.emphasis.strong);
        });
        element.querySelectorAll('em').forEach(el => {
            el.setAttribute('style', styles.emphasis.em);
        });
        element.querySelectorAll('del').forEach(el => {
            el.setAttribute('style', styles.emphasis.del);
        });

        // 应用表格样式（内容表格，非包裹表格）
        element.querySelectorAll('table').forEach(el => {
            el.setAttribute('style', styles.table.container);
        });
        element.querySelectorAll('th').forEach(el => {
            el.setAttribute('style', `${styles.table.header}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`);
        });
        element.querySelectorAll('td').forEach(el => {
            el.setAttribute('style', `${styles.table.cell}; font-family: ${this.currentFont}; font-size: ${this.currentFontSize}px;`);
        });

        // 应用分割线样式
        element.querySelectorAll('hr').forEach(el => {
            el.setAttribute('style', styles.hr);
        });

        // 应用图片样式
        element.querySelectorAll('img').forEach(el => {
            const img = el as HTMLImageElement;
            el.setAttribute('style', styles.image);
        });
    }
}

export const templateManager = (app: App, settingsManager: SettingsManager) => new TemplateManager(app, settingsManager);
