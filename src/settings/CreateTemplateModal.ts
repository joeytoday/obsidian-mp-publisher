import { App, Modal, Setting, Notice, setIcon, ColorComponent } from 'obsidian';
import MPPlugin from '../main';
import { Template } from '../templateManager';
import { TemplatePreviewModal } from './templatePreviewModal';

export class CreateTemplateModal extends Modal {
    private template: Template;
    private onSubmit: (template: Template) => void;
    private nameInput: HTMLInputElement;
    private plugin: MPPlugin;
    private templateSelect: HTMLSelectElement;
    private showSampleTemplate = false;
    private existingTemplate: Template | undefined;
    constructor(app: App, plugin: MPPlugin, onSubmit: (template: Template) => void, existingTemplate?: Template) {
        super(app);
        this.plugin = plugin;
        this.existingTemplate = existingTemplate;
        this.onSubmit = onSubmit;
        this.template = existingTemplate ? { ...existingTemplate } : {
            id: '',
            name: '',
            description: '',
            isPreset: false,
            isVisible: true,
            styles: this.initializeStyles()
        };
    }

    private initializeStyles(): any {
        return {
            container: "",
            title: {
                h1: {
                    base: "margin: 28px 0 0; font-size: 28px; letter-spacing: -0.03em; line-height: 1.5; text-align: center;",
                    content: "font-weight: bold; color: #666b8f; display: inline-block;",
                    after: ""
                },
                h2: {
                    base: "margin: 24px 0 0; font-size: 24px; letter-spacing: -0.02em; line-height: 1.5; border-bottom: 1px solid rgba(122,125,160,0.2);",
                    content: "font-weight: bold; color: #ffffff; background: #7a7da0; padding: 1px 4px; border-radius: 3px;",
                    after: ""
                },
                h3: {
                    base: "margin: 20px 0 0; font-size: 20px; letter-spacing: -0.01em; line-height: 1.5;",
                    content: "font-weight: bold; color: #7a7da0; padding: 1px 1px;",
                    after: ""
                },
                base: {
                    base: "margin: 16px 0 0; font-size: 16px;",
                    content: "font-weight: bold; color: #7a7da0;",
                    after: ""
                }
            },
            paragraph: "line-height: 1.8; margin-top: 1em; font-size: 1em; color: #4a4a4a;",
            list: {
                container: "padding-left: 32px; color: #4a4a4a;",
                item: "font-size: 1em; color: #4a4a4a; line-height: 1.8;",
                taskList: "list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;"
            },
            code: {
                header: {
                    container: "margin-bottom: 1em; display: flex; gap: 6px;",
                    dot: "width: 12px; height: 12px; border-radius: 50%;",
                    colors: ["#ff5f56", "#ffbd2e", "#27c93f"]
                },
                block: "color: #333; background: #f8f9fc; border-radius: 8px; border: 1px solid #eef0f7; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em 1em 1em;  font-size: 14px; line-height: 1.6; white-space: pre-wrap;",
                inline: "background: #f8f9fc; padding: 2px 6px; border-radius: 4px; color: #333; font-size: 14px; border: 1px solid #eef0f7;"
            },
            quote: "border-left: 4px solid #7a7da0; border-radius: 6px; padding: 10px 10px; background: #f8f9fc; margin: 0.8em 0; color: #666b8f; font-style: italic; word-wrap: break-word;",
            image: "max-width: 100%; height: auto; margin: 1em auto; display: block;",
            link: "color: #7a7da0; text-decoration: none; border-bottom: 1px solid #7a7da0; transition: all 0.2s ease;",
            emphasis: {
                strong: "font-weight: bold; color: #4a4a4a;",
                em: "font-style: italic; color: #4a4a4a;",
                del: "text-decoration: line-through; color: #4a4a4a;"
            },
            table: {
                container: "width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #e1e4e8;",
                header: "background: #f8f9fc; font-weight: bold; color: #4a4a4a; border-bottom: 2px solid #e1e4e8; font-size: 1em;",
                cell: "border: 1px solid #f0f0f0; padding: 8px; color: #4a4a4a; font-size: 1em;"
            },
            hr: "border: none; border-top: 1px solid #eef0f7; margin: 20px 0;"
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('mp-template-modal');

        // 创建固定的头部区域
        const headerEl = contentEl.createDiv('modal-header');
        headerEl.createEl('h2', { text: this.template.id ? '编辑模板' : '新建模板' });

        // 创建模板名称输入区域（在头部）
        const nameContainer = headerEl.createDiv('name-container');
        if (!this.existingTemplate) {
            new Setting(nameContainer)
                .setName('是否选择参考模板')
                .addToggle(toggle => {
                    toggle.setValue(this.showSampleTemplate)
                        .onChange(value => {
                            this.showSampleTemplate = value;
                            this.templateSelect.style.display = this.showSampleTemplate ? 'block' : 'none';
                        });
                });

            // 添加选择框
            new Setting(nameContainer)
                .setName('选择参考模板')
                .addDropdown(dropdown => {
                    this.templateSelect = dropdown
                        .addOptions(this.getTemplateOptions()) // 获取所有主题选项
                        .setValue(this.template.id)
                        .onChange(value => {
                            const selectedTemplate = this.getTemplateById(value);
                            if (selectedTemplate) {
                                this.template = { ...selectedTemplate, id: '', name: '', description: '', isPreset: false };
                            }
                        })
                        .selectEl;
                    this.templateSelect.style.display = this.showSampleTemplate ? 'block' : 'none'; // 默认隐藏
                });
        }
        new Setting(nameContainer)
            .setName('模板名称')
            .addText(text => {
                this.nameInput = text
                    .setPlaceholder('请输入模板名称')
                    .setValue(this.template.name)
                    .onChange(value => {
                        const trimmedValue = value.trim();
                        this.template.name = trimmedValue;

                        if (!trimmedValue) {
                            new Notice('模板名称不能为空');
                        }

                        if (!this.template.id.startsWith('preset-')) {
                            this.template.id = this.generateTemplateId(trimmedValue || '未命名模板');
                        }
                    })
                    .inputEl;

                setTimeout(() => this.nameInput.focus(), 0);
                return text;
            });
        new Setting(nameContainer)
            .setName('模板描述')
            .addText(text => {
                text.setPlaceholder('请输入模板描述')
                    .setValue(this.template.description)
                    .onChange(value => {
                        const trimmedValue = value.trim();
                        this.template.description = trimmedValue;
                    });
                return text;
            });

        // 创建可滚动的内容区域
        const scrollContainer = contentEl.createDiv('modal-scroll-container');
        const settingContainer = scrollContainer.createDiv('setting-container');

        // 添加样式设置
        this.addStyleSettings(settingContainer, '全局样式', this.template.styles);
        this.addStyleSettings(settingContainer, '标题样式', this.template.styles.title);
        this.addStyleSettings(settingContainer, '段落样式', this.template.styles);
        this.addStyleSettings(settingContainer, '列表样式', this.template.styles.list);
        this.addStyleSettings(settingContainer, '代码样式', this.template.styles.code);
        this.addStyleSettings(settingContainer, '引用样式', this.template.styles);
        this.addStyleSettings(settingContainer, '图片样式', this.template.styles);
        this.addStyleSettings(settingContainer, '链接样式', this.template.styles);
        this.addStyleSettings(settingContainer, '表格样式', this.template.styles.table);
        this.addStyleSettings(settingContainer, '分隔线样式', this.template.styles);

        // 保存和取消按钮
        const buttonContainer = contentEl.createDiv('modal-button-container');
        new Setting(buttonContainer)
            .addButton(btn => btn
                .setButtonText('预览')
                .onClick(() => {
                    // 打开预览模式
                    const previewModal = new TemplatePreviewModal(this.app, this.template, this.plugin.templateManager);
                    previewModal.open();
                }))
            .addButton(btn => btn
                .setButtonText('取消')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('保存')
                .setCta()
                .onClick(async () => {
                    if (await this.validateAndSubmit()) {
                        this.close();
                    }
                }));

        this.nameInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (await this.validateAndSubmit()) {
                    this.close();
                }
            }
        });
    }

    private getTemplateOptions(): Record<string, string> {
        const templates = this.plugin.settingsManager.getAllTemplates();
        const options: Record<string, string> = {};
        templates.forEach(template => {
            options[template.id] = template.name;
        });
        return options;
    }

    private getTemplateById(id: string): Template | undefined {
        return this.plugin.settingsManager.getAllTemplates().find(template => template.id === id);
    }

    private addStyleSettings(container: HTMLElement, sectionName: string, styles: any) {
        const section = container.createDiv('style-section');

        // 创建折叠面板标题区域
        const header = section.createDiv('style-section-header');
        const titleContainer = header.createDiv('style-section-title');
        const toggle = titleContainer.createSpan('style-section-toggle');
        setIcon(toggle, 'chevron-right');
        titleContainer.createEl('h3', { text: sectionName });

        // 添加恢复默认按钮
        const resetButton = header.createDiv('style-section-reset');
        const resetIcon = resetButton.createSpan('clickable-icon');
        setIcon(resetIcon, 'reset');
        resetButton.addEventListener('click', (e) => {
            e.stopPropagation();  // 防止触发折叠面板
            const defaultStyles = this.initializeStyles();

            // 更新 this.template.styles
            switch (sectionName) {
                case '全局样式':
                    this.template.styles = defaultStyles;
                    styles = defaultStyles;
                    break;
                case '标题样式':
                    this.template.styles.title = defaultStyles.title;
                    styles = defaultStyles.title;
                    break;
                case '段落样式':
                    this.template.styles.paragraph = defaultStyles.paragraph;
                    styles = { paragraph: defaultStyles.paragraph };
                    break;
                case '列表样式':
                    this.template.styles.list = defaultStyles.list;
                    styles = defaultStyles.list;
                    break;
                case '代码样式':
                    this.template.styles.code = defaultStyles.code;
                    styles = defaultStyles.code;
                    break;
                case '引用样式':
                    this.template.styles.quote = defaultStyles.quote;
                    styles = { quote: defaultStyles.quote };
                    break;
                case '链接样式':
                    this.template.styles.link = defaultStyles.link;
                    styles = { link: defaultStyles.link };
                    break;
                case '表格样式':
                    this.template.styles.table = defaultStyles.table;
                    styles = defaultStyles.table;
                    break;
                case '分隔线样式':
                    this.template.styles.hr = defaultStyles.hr;
                    styles = { hr: defaultStyles.hr };
                    break;
                case '图片样式':
                    this.template.styles.image = defaultStyles.image;
                    styles = { image: defaultStyles.image };
                    break;
            }

            // 重新渲染设置项
            content.empty();
            this.addStyleSettingsContent(content, sectionName, styles);
        });

        // 创建内容区域
        const content = section.createDiv('style-section-content');
        this.addStyleSettingsContent(content, sectionName, styles);

        // 折叠面板点击事件
        header.addEventListener('click', () => {
            const isExpanded = !section.hasClass('is-expanded');
            section.toggleClass('is-expanded', isExpanded);
            setIcon(toggle, isExpanded ? 'chevron-down' : 'chevron-right');
        });
    }

    // 新增方法，用于处理设置内容
    private addStyleSettingsContent(content: HTMLElement, sectionName: string, styles: any) {
        switch (sectionName) {
            case '全局样式':
                this.addGlobalStylesSettings(content, styles);
                break;
            case '标题样式':
                this.addTitleSettings(content, styles);
                break;
            case '段落样式':
                this.addParagraphAndEmphasisSettings(content, styles);
                break;
            case '列表样式':
                this.addListSettings(content, styles);
                break;
            case '代码样式':
                this.addCodeSettings(content, styles);
                break;
            case '引用样式':
                this.addQuoteSettings(content, styles);
                break;
            case '链接样式':
                this.addLinkSettings(content, styles);
                break;
            case '表格样式':
                this.addTableSettings(content, styles);
                break;
            case '分隔线样式':
                this.addHrSettings(content, styles);
                break;
            case '图片样式':
                this.addImageSettings(content, styles);
                break;
        }
    }

    // 示例方法，用于处理具体的样式设置
    private addGlobalStylesSettings(container: HTMLElement, styles: any) {
        const section = container.createDiv('global-style-section');

        new Setting(section)
            .setName('全局主题色')
            .setDesc('修改此颜色将更新所有文字相关的颜色')
            .addColorPicker(color => {
                const defaultColor = styles.title.h2.content.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1] || '#ef7060';
                color.setValue(defaultColor)
                    .onChange(value => {
                        // 更新段落颜色
                        styles.paragraph = styles.paragraph.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);

                        // 更新强调文字颜色
                        Object.keys(styles.emphasis).forEach(key => {
                            styles.emphasis[key] = styles.emphasis[key].replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                        });

                        // 更新标题颜色
                        ['h1', 'h2', 'h3', 'base'].forEach(level => {
                            styles.title[level].content = styles.title[level].content.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                        });

                        // 更新列表颜色
                        ['container', 'item', 'taskList'].forEach(key => {
                            styles.list[key] = styles.list[key].replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                        });

                        // 更新引用颜色
                        styles.quote = styles.quote.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);

                        // 更新代码颜色
                        ['block', 'inline'].forEach(key => {
                            styles.code[key] = styles.code[key].replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                        });

                        // 更新链接颜色
                        styles.link = styles.link.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`)
                            .replace(/linear-gradient\([^)]+\)/, `linear-gradient(to right, ${value}80, ${value}80)`);

                        // 更新表格颜色
                        styles.table.header = styles.table.header.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                        styles.table.cell = styles.table.cell.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);

                        // 更新图片边框颜色
                        styles.image = styles.image.replace(/border:\s*1px solid\s*#[a-fA-F0-9]+80/, `border: 1px solid ${value}80`);
                    });
            });
    }

    private addTitleSettings(container: HTMLElement, styles: any) {
        ['h1', 'h2', 'h3', 'base'].forEach(level => {
            const titleSection = container.createDiv('style-section');

            // 创建折叠面板标题区域
            const header = titleSection.createDiv('style-section-header');
            const titleContainer = header.createDiv('style-section-title');
            const toggle = titleContainer.createSpan('style-section-toggle');
            setIcon(toggle, 'chevron-right');
            titleContainer.createEl('h4', { text: level === 'base' ? '其他标题样式' : `${level.toUpperCase()} 标题样式` });

            // 创建内容区域
            const content = titleSection.createDiv('style-section-content');
            content.hide(); // 默认隐藏

            // 折叠面板点击事件
            header.addEventListener('click', () => {
                const isExpanded = !titleSection.hasClass('is-expanded');
                titleSection.toggleClass('is-expanded', isExpanded);
                setIcon(toggle, isExpanded ? 'chevron-down' : 'chevron-right');
                content.toggle(isExpanded);
            });

            new Setting(content)
                .setName('上边距')
                .setDesc('设置标题与上方内容之间的间距（单位：像素）')
                .addText(text => {
                    const currentMargin = styles[level].base.match(/margin:\s*(\d+)px/)?.[1];
                    text.setValue(currentMargin)
                        .onChange(value => {
                            const margin = parseInt(value) || 10;
                            if (styles[level].base.includes('margin:')) {
                                styles[level].base = styles[level].base.replace(/margin:\s*\d+px/, `margin: ${margin}px`);
                            } else {
                                styles[level].base += ` margin: ${margin}px;`;
                            }
                        });
                });
            new Setting(content)
                .setName('字体大小')
                .setDesc('设置标题的字体大小（单位：像素）')
                .addText(text => {
                    // 兼容 px 和 em 两种单位的字体大小
                    const fontSizeMatch = styles[level].base.match(/font-size:\s*(\d+(?:\.\d+)?)(px|em)/);
                    let currentSize = '';

                    if (fontSizeMatch) {
                        const [, size, unit] = fontSizeMatch;
                        // 如果是 em 单位，转换为 px (假设基础字体大小为 16px)
                        currentSize = unit === 'em' ? String(parseFloat(size) * 16) : size;
                    }

                    text.setValue(currentSize)
                        .onChange(value => {
                            const size = parseInt(value) || 16;
                            // 替换任意单位的 font-size
                            styles[level].base = styles[level].base.replace(/font-size:\s*\d+(?:\.\d+)?(?:px|em)/, `font-size: ${size}px`);
                        });
                });
            new Setting(content)
                .setName('字体颜色')
                .setDesc('设置标题的字体颜色')
                .addColorPicker(color => {
                    const currentColor = styles[level].content.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                    color.setValue(currentColor)
                        .onChange(value => {
                            if (styles[level].content.includes('color:')) {
                                styles[level].content = styles[level].content.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                            } else {
                                styles[level].content += ` color: ${value};`;
                            }
                        });
                });

            let colorPicker: ColorComponent; // 定义 colorPicker 变量
            new Setting(content)
                .setName('背景颜色')
                .setDesc('设置标题的背景颜色')
                .addToggle(toggle => {
                    const hasBackground = styles[level].content.includes('background:');
                    toggle.setValue(hasBackground)
                        .onChange(value => {
                            if (!value) {
                                styles[level].content = styles[level].content.replace(/background:\s*#[a-fA-F0-9]+;/, '');
                                colorPicker.setDisabled(true);
                            } else {
                                colorPicker.setDisabled(false);
                            }
                        });
                })
                .addColorPicker(color => {
                    const currentBg = styles[level].content.match(/background:\s*(#[a-fA-F0-9]+)/)?.[1];
                    color.setValue(currentBg)
                        .onChange(value => {
                            if (styles[level].content.includes('background:')) {
                                styles[level].content = styles[level].content.replace(/background:\s*#[a-fA-F0-9]+/, `background: ${value}`);
                            } else {
                                styles[level].content += ` background: ${value};`;
                            }
                            // 添加圆角
                            if (!styles[level].content.includes('border-radius:')) {
                                styles[level].content += ' padding: 1px 4px; border-radius: 3px;';
                            }
                        });
                    colorPicker = color; // 保存 colorPicker 变量
                });

            new Setting(content)
                .setName('居中')
                .setDesc('设置标题是否居中')
                .addToggle(toggle => {
                    const isCentered = styles[level].base.includes('text-align: center;');
                    toggle.setValue(isCentered)
                        .onChange(value => {
                            styles[level].base = value ? styles[level].base + ' text-align: center;' : styles[level].base.replace(/text-align: center;/, '');
                        });
                });
            new Setting(content)
                .setName('左边框')
                .setDesc('设置标题左侧边框是否显示')
                .addToggle(toggle => {
                    const hasBorder = styles[level].base.includes('border-left');
                    toggle.setValue(hasBorder)
                        .onChange(value => {
                            const fontColor = styles[level].content.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                            const bgColor = styles[level].content.match(/background:\s*(#[a-fA-F0-9]+)/)?.[1];
                            let borderColor = fontColor !== '#ffffff' ? fontColor : bgColor !== '#ffffff' ? bgColor : '#000000';
                            if (value) {
                                styles[level].base += ` border-left: 4px solid ${borderColor}; padding-left: 12px;`;
                            } else {
                                styles[level].base = styles[level].base.replace(/border-left:[^;]+;/, '').replace(/padding-left:[^;]+;/, '');
                            }
                        });
                });

            new Setting(content)
                .setName('下划线')
                .setDesc('设置标题下划线是否显示')
                .addToggle(toggle => {
                    const hasUnderline = styles[level].base.includes('border-bottom');
                    toggle.setValue(hasUnderline)
                        .onChange(value => {
                            const fontColor = styles[level].content.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                            const bgColor = styles[level].content.match(/background:\s*(#[a-fA-F0-9]+)/)?.[1];
                            let underlineColor = fontColor !== '#ffffff' ? fontColor : bgColor !== '#ffffff' ? bgColor : '#000000';

                            // 将颜色转换为rgba格式
                            const rgbaColor = `rgba(${parseInt(underlineColor.slice(1, 3), 16)}, ${parseInt(underlineColor.slice(3, 5), 16)}, ${parseInt(underlineColor.slice(5, 7), 16)}, 0.2)`;

                            if (value) {
                                styles[level].base += ` border-bottom: 1px solid ${rgbaColor};`;
                            } else {
                                styles[level].base = styles[level].base.replace(/border-bottom:[^;]+;/, '');
                            }
                        });
                });
        });
    }

    private addParagraphAndEmphasisSettings(container: HTMLElement, styles: any) {
        const paragraphSection = container.createDiv('style-section');

        // 创建折叠面板标题区域
        const header = paragraphSection.createDiv('style-section-header');
        const titleContainer = header.createDiv('style-section-title');
        const toggle = titleContainer.createSpan('style-section-toggle');
        setIcon(toggle, 'chevron-right');
        titleContainer.createEl('h4', { text: '段落样式' });

        // 创建内容区域
        const content = paragraphSection.createDiv('style-section-content');
        content.hide(); // 默认隐藏

        // 折叠面板点击事件
        header.addEventListener('click', () => {
            const isExpanded = !paragraphSection.hasClass('is-expanded');
            paragraphSection.toggleClass('is-expanded', isExpanded);
            setIcon(toggle, isExpanded ? 'chevron-down' : 'chevron-right');
            content.toggle(isExpanded);
        });

        new Setting(content)
            .setName('行高')
            .setDesc('设置段落文本的行高（推荐值：1.5-2.0）')
            .addText(text => {
                const currentLineHeight = styles.paragraph.match(/line-height:\s*([\d.]+)/)?.[1];
                text.setValue(currentLineHeight)
                    .onChange(value => {
                        const lineHeight = parseFloat(value) || 1.75;
                        styles.paragraph = styles.paragraph.replace(/line-height:\s*[\d.]+/, `line-height: ${lineHeight}`);
                    });
            });

        new Setting(content)
            .setName('段前距')
            .setDesc('设置段落与上方内容之间的间距（单位：em）')
            .addText(text => {
                // 只处理margin-top属性
                const marginTopMatch = styles.paragraph.match(/margin-top:\s*([\d.]+)em/);
                const currentMargin = marginTopMatch ? marginTopMatch[1] : '';
                text.setValue(currentMargin)
                    .onChange(value => {
                        const value_num = parseFloat(value);
                        const margin = !isNaN(value_num) ? value_num : 1;
                        if (styles.paragraph.match(/margin-top:\s*[\d.]+em/)) {
                            // 替换已有的margin-top
                            styles.paragraph = styles.paragraph.replace(/margin-top:\s*[\d.]+em/, `margin-top: ${margin}em`);
                        } else {
                            // 没有margin-top，直接加上
                            styles.paragraph += ` margin-top: ${margin}em;`;
                        }
                    });
            });

        new Setting(content)
            .setName('文本颜色')
            .setDesc('设置段落文本的颜色')
            .addColorPicker(color => {
                const currentColor = styles.paragraph.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.paragraph = styles.paragraph.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                    });
            });

        // 强调样式设置
        const emphasisSection = container.createDiv('style-section');

        // 创建折叠面板标题区域
        const emphasisHeader = emphasisSection.createDiv('style-section-header');
        const emphasisTitleContainer = emphasisHeader.createDiv('style-section-title');
        const emphasisToggle = emphasisTitleContainer.createSpan('style-section-toggle');
        setIcon(emphasisToggle, 'chevron-right');
        emphasisTitleContainer.createEl('h4', { text: '强调样式' });

        // 创建内容区域
        const emphasisContent = emphasisSection.createDiv('style-section-content');
        emphasisContent.hide(); // 默认隐藏

        // 折叠面板点击事件
        emphasisHeader.addEventListener('click', () => {
            const isExpanded = !emphasisSection.hasClass('is-expanded');
            emphasisSection.toggleClass('is-expanded', isExpanded);
            setIcon(emphasisToggle, isExpanded ? 'chevron-down' : 'chevron-right');
            emphasisContent.toggle(isExpanded);
        });

        new Setting(emphasisContent)
            .setName('粗体样式')
            .setDesc('设置粗体文本的样式')
            .addColorPicker(color => {
                const currentColor = styles.emphasis.strong.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.emphasis.strong = styles.emphasis.strong.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                    });
            });

        // 斜体设置
        new Setting(emphasisContent)
            .setName('斜体样式')
            .setDesc('设置斜体文本的样式')
            .addColorPicker(color => {
                const currentColor = styles.emphasis.em.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.emphasis.em = styles.emphasis.em.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                    });
            });

        // 删除线设置
        new Setting(emphasisContent)
            .setName('删除线样式')
            .setDesc('设置删除线文本的样式')
            .addColorPicker(color => {
                const currentColor = styles.emphasis.del.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.emphasis.del = styles.emphasis.del.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                    });
            });
    }

    private addListSettings(container: HTMLElement, styles: any) {
        const listSection = container.createDiv('list-section');

        new Setting(listSection)
            .setName('列表缩进')
            .setDesc('设置列表的左侧缩进（单位：像素）')
            .addText(text => {
                const currentPadding = styles.container.match(/padding-left:\s*(\d+)px/)?.[1];
                text.setValue(currentPadding)
                    .onChange(value => {
                        const padding = parseInt(value) || 26;
                        styles.container = styles.container.replace(/padding-left:\s*\d+px/, `padding-left: ${padding}px`);
                    });
            });
        new Setting(listSection)
            .setName('列表文本颜色')
            .setDesc('设置列表文本的颜色')
            .addColorPicker(color => {
                const currentColor = styles.item.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        ['container', 'item', 'taskList'].forEach(key => {
                            styles[key] = styles[key].replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                        });
                    });
            });
    }

    private addQuoteSettings(container: HTMLElement, styles: any) {
        const quoteSection = container.createDiv('quote-section');

        new Setting(quoteSection)
            .setName('引用文本颜色')
            .setDesc('设置引用块内文本的颜色')
            .addColorPicker(color => {
                const currentColor = styles.quote.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.quote = styles.quote.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                    });
            });
        new Setting(quoteSection)
            .setName('文本样式')
            .setDesc('设置引用块内文本是否斜体、是否加粗')
            .addToggle(toggle => {
                const isItalic = styles.quote.includes('font-style: italic');
                toggle.setValue(isItalic)
                    .setTooltip('斜体')
                    .onChange(value => {
                        if (value) {
                            if (!styles.quote.includes('font-style:')) {
                                styles.quote = styles.quote.replace(/;(\s*)$/, `; font-style: italic;$1`);
                            } else {
                                styles.quote = styles.quote.replace(/font-style:[^;]+;/, 'font-style: italic;');
                            }
                        } else {
                            styles.quote = styles.quote.replace(/font-style:[^;]+;/, '');
                        }
                    });
            })
            .addToggle(toggle => {
                const isBold = styles.quote.includes('font-weight: bold');
                toggle.setValue(isBold)
                    .setTooltip('粗体')
                    .onChange(value => {
                        if (value) {
                            if (!styles.quote.includes('font-weight:')) {
                                styles.quote = styles.quote.replace(/;(\s*)$/, `; font-weight: bold;$1`);
                            } else {
                                styles.quote = styles.quote.replace(/font-weight:[^;]+;/, 'font-weight: bold;');
                            }
                        } else {
                            styles.quote = styles.quote.replace(/font-weight:[^;]+;/, '');
                        }
                    });
            });
        new Setting(quoteSection)
            .setName('引用背景颜色')
            .setDesc('设置引用块的背景颜色')
            .addColorPicker(color => {
                const currentBg = styles.quote.match(/background:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentBg || '#f8f9fc')
                    .onChange(value => {
                        if (styles.quote.includes('background:')) {
                            styles.quote = styles.quote.replace(/background:\s*#[a-fA-F0-9]+/, `background: ${value}`);
                        } else {
                            styles.quote = styles.quote.replace(/;(\s*)$/, `; background: ${value};$1`);
                        }
                    });
            });

        new Setting(quoteSection)
            .setName('引用边框')
            .setDesc('设置引用块左侧边框的颜色和圆角')
            .addColorPicker(color => {
                const currentColor = styles.quote.match(/border-left:\s*\d+px\s*solid\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.quote = styles.quote.replace(/border-left:\s*\d+px\s*solid\s*#[a-fA-F0-9]+/, `border-left: 4px solid ${value}`);

                        // 如果有渐变背景，也更新背景色
                        if (styles.quote.includes('linear-gradient')) {
                            styles.quote = styles.quote.replace(/rgba\([^)]+\)/, `rgba(${parseInt(value.slice(1, 3), 16)},${parseInt(value.slice(3, 5), 16)},${parseInt(value.slice(5, 7), 16)},0.1)`);
                        }
                    });
            })
            .addToggle(toggle => {
                const hasRadius = styles.quote.includes('border-radius:');
                toggle.setValue(hasRadius)
                    .setTooltip('圆角')
                    .onChange(value => {
                        if (value) {
                            if (!styles.quote.includes('border-radius:')) {
                                styles.quote = styles.quote.replace(/;(\s*)$/, `; border-radius: 6px;$1`);
                            }
                        } else {
                            styles.quote = styles.quote.replace(/border-radius:[^;]+;/, '');
                        }
                    });
            });

        new Setting(quoteSection)
            .setName('内边距')
            .setDesc('设置引用块的内边距（单位：像素）')
            .addText(text => {
                const currentPadding = styles.quote.match(/padding:\s*(\d+)px\s+(\d+)px/);
                text.setValue(currentPadding ? currentPadding[1] : '16')
                    .setPlaceholder('上下内边距')
                    .onChange(value => {
                        const vPadding = parseInt(value) || 16;
                        const hPadding = styles.quote.match(/padding:\s*\d+px\s+(\d+)px/)?.[1] || '20';
                        styles.quote = styles.quote.replace(/padding:[^;]+;/, `padding: ${vPadding}px ${hPadding}px;`);
                    });
            })
            .addText(text => {
                const currentPadding = styles.quote.match(/padding:\s*\d+px\s+(\d+)px/);
                text.setValue(currentPadding ? currentPadding[1] : '20')
                    .setPlaceholder('左右内边距')
                    .onChange(value => {
                        const hPadding = parseInt(value) || 20;
                        const vPadding = styles.quote.match(/padding:\s*(\d+)px/)?.[1] || '16';
                        styles.quote = styles.quote.replace(/padding:[^;]+;/, `padding: ${vPadding}px ${hPadding}px;`);
                    });
            });
    }


    private addCodeSettings(container: HTMLElement, styles: any) {
        const codeBlockSection = container.createDiv('style-section');

        // 创建折叠面板标题区域
        const codeBlockHeader = codeBlockSection.createDiv('style-section-header');
        const codeBlockTitleContainer = codeBlockHeader.createDiv('style-section-title');
        const codeBlockToggle = codeBlockTitleContainer.createSpan('style-section-toggle');
        setIcon(codeBlockToggle, 'chevron-right');
        codeBlockTitleContainer.createEl('h4', { text: '代码块样式' });

        // 创建内容区域
        const codeBlockContent = codeBlockSection.createDiv('style-section-content');
        codeBlockContent.hide();

        // 折叠面板点击事件
        codeBlockHeader.addEventListener('click', () => {
            const isExpanded = !codeBlockSection.hasClass('is-expanded');
            codeBlockSection.toggleClass('is-expanded', isExpanded);
            setIcon(codeBlockToggle, isExpanded ? 'chevron-down' : 'chevron-right');
            codeBlockContent.toggle(isExpanded);
        });

        // 指示器颜色设置
        new Setting(codeBlockContent)
            .setName('指示器颜色')
            .setDesc('设置代码块左上角三个点的颜色')
            .addColorPicker(color => {
                color.setValue(styles.header.colors[0])
                    .onChange(value => {
                        styles.header.colors[0] = value;
                    });
            })
            .addColorPicker(color => {
                color.setValue(styles.header.colors[1])
                    .onChange(value => {
                        styles.header.colors[1] = value;
                    });
            })
            .addColorPicker(color => {
                color.setValue(styles.header.colors[2])
                    .onChange(value => {
                        styles.header.colors[2] = value;
                    });
            });

        new Setting(codeBlockContent)
            .setName('背景颜色')
            .setDesc('设置代码块的背景颜色')
            .addColorPicker(color => {
                const currentBg = styles.block.match(/background:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentBg)
                    .onChange(value => {
                        styles.block = styles.block.replace(/background:\s*#[a-fA-F0-9]+/, `background: ${value}`);
                        styles.inline = styles.inline.replace(/background:\s*#[a-fA-F0-9]+/, `background: ${value}`);
                    });
            });

        new Setting(codeBlockContent)
            .setName('边框颜色')
            .setDesc('设置代码块的边框颜色')
            .addColorPicker(color => {
                const currentBorder = styles.block.match(/border:\s*1px\s*solid\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentBorder)
                    .onChange(value => {
                        styles.block = styles.block.replace(/border:\s*1px\s*solid\s*#[a-fA-F0-9]+/, `border: 1px solid ${value}`);
                        styles.inline = styles.inline.replace(/border:\s*1px\s*solid\s*#[a-fA-F0-9]+/, `border: 1px solid ${value}`);
                    });
            });

        new Setting(codeBlockContent)
            .setName('文本颜色')
            .setDesc('设置代码块的文本颜色')
            .addColorPicker(color => {
                const currentColor = styles.block.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.block = styles.block.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                        styles.inline = styles.inline.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);
                    });
            });
        new Setting(codeBlockContent)
            .setName('文本样式')
            .setDesc('设置代码块文本的样式')
            .addText(text => {
                const currentSize = styles.block.match(/font-size:\s*(\d+)px/)?.[1];
                text.setValue(currentSize || '14')
                    .setPlaceholder('字体大小')
                    .onChange(value => {
                        const size = parseInt(value) || 14;
                        styles.block = styles.block.replace(/font-size:\s*\d+px/, `font-size: ${size}px`);
                        styles.inline = styles.inline.replace(/font-size:\s*\d+px/, `font-size: ${size}px`);
                    });
            })
            .addToggle(toggle => {
                const isBold = styles.block.includes('font-weight: bold');
                toggle.setValue(isBold)
                    .setTooltip('加粗')
                    .onChange(value => {
                        if (value) {
                            styles.block = styles.block.replace(/;(\s*)$/, `; font-weight: bold;$1`);
                            styles.inline = styles.inline.replace(/;(\s*)$/, `; font-weight: bold;$1`);
                        } else {
                            styles.block = styles.block.replace(/font-weight:\s*bold;\s*/, '');
                            styles.inline = styles.inline.replace(/font-weight:\s*bold;\s*/, '');
                        }
                    });
            })
            .addToggle(toggle => {
                const isItalic = styles.block.includes('font-style: italic');
                toggle.setValue(isItalic)
                    .setTooltip('倾斜')
                    .onChange(value => {
                        if (value) {
                            styles.block = styles.block.replace(/;(\s*)$/, `; font-style: italic;$1`);
                            styles.inline = styles.inline.replace(/;(\s*)$/, `; font-style: italic;$1`);
                        } else {
                            styles.block = styles.block.replace(/font-style:\s*italic;\s*/, '');
                            styles.inline = styles.inline.replace(/font-style:\s*italic;\s*/, '');
                        }
                    });
            });
    }


    private addLinkSettings(container: HTMLElement, styles: any) {
        const linkSection = container.createDiv('link-section');

        new Setting(linkSection)
            .setName('链接颜色')
            .setDesc('设置链接文本的颜色')
            .addColorPicker(color => {
                const currentColor = styles.link.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.link = styles.link.replace(/color:\s*#[a-fA-F0-9]+/, `color: ${value}`);

                        // 如果有下划线渐变，也更新下划线颜色
                        if (styles.link.includes('linear-gradient')) {
                            styles.link = styles.link.replace(/linear-gradient\([^)]+\)/, `linear-gradient(to right, ${value}80, ${value}80)`);
                        }
                    });
            });

        new Setting(linkSection)
            .setName('下划线样式')
            .setDesc('选择链接的下划线样式')
            .addDropdown(dropdown => {
                dropdown.addOption('none', '无下划线')
                    .addOption('underline', '实线下划线')
                    .addOption('gradient', '渐变下划线')
                    .setValue(styles.link.includes('text-decoration: none') && !styles.link.includes('background-image') ? 'none' :
                        styles.link.includes('text-decoration: underline') ? 'underline' : 'gradient')
                    .onChange(value => {
                        switch (value) {
                            case 'none':
                                styles.link = styles.link.replace(/text-decoration:[^;]+;/, 'text-decoration: none;')
                                    .replace(/background-image:[^;]+;/, '')
                                    .replace(/background-size:[^;]+;/, '')
                                    .replace(/background-repeat:[^;]+;/, '')
                                    .replace(/background-position:[^;]+;/, '');
                                break;
                            case 'underline':
                                styles.link = styles.link.replace(/text-decoration:[^;]+;/, 'text-decoration: underline;')
                                    .replace(/background-image:[^;]+;/, '')
                                    .replace(/background-size:[^;]+;/, '')
                                    .replace(/background-repeat:[^;]+;/, '')
                                    .replace(/background-position:[^;]+;/, '');
                                break;
                            case 'gradient':
                                const color = styles.link.match(/color:\s*(#[a-fA-F0-9]+)/)?.[1] || '#d2691e';
                                styles.link = styles.link.replace(/text-decoration:[^;]+;/, 'text-decoration: none;')
                                    + ` background-image: linear-gradient(to right, ${color}80, ${color}80); background-size: 0% 1px; background-repeat: no-repeat; background-position: 0 100%; transition: all 0.3s ease;`;
                                break;
                        }
                    });
            });
    }

    private addTableSettings(container: HTMLElement, styles: any) {
        const tableSection = container.createDiv('table-section');

        new Setting(tableSection)
            .setName('表格边框颜色')
            .setDesc('设置表格边框和分隔线的颜色')
            .addColorPicker(color => {
                const currentBorder = styles.container.match(/border:\s*1px\s*solid\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentBorder)
                    .onChange(value => {
                        styles.container = styles.container.replace(/border:\s*1px\s*solid\s*#[a-fA-F0-9]+/, `border: 1px solid ${value}`);
                        styles.header = styles.header.replace(/border-bottom:\s*\d+px\s*solid\s*#[a-fA-F0-9]+/, `border-bottom: 2px solid ${value}`);
                        styles.cell = styles.cell.replace(/border-top:\s*1px\s*solid\s*#[a-fA-F0-9]+/, `border-top: 1px solid ${value}`);
                    });
            });

        new Setting(tableSection)
            .setName('表头背景')
            .setDesc('设置表格头部的背景颜色')
            .addColorPicker(color => {
                const currentBg = styles.header.match(/background:\s*([^;]+)/)?.[1];
                // 如果是渐变色，取第一个颜色
                const firstColor = currentBg.includes('linear-gradient') ?
                    currentBg.match(/linear-gradient\([^,]+,\s*(#[a-fA-F0-9]+)/)?.[1] :
                    currentBg;

                color.setValue(firstColor)
                    .onChange(value => {
                        if (currentBg.includes('linear-gradient')) {
                            styles.header = styles.header.replace(/background:\s*linear-gradient\([^)]+\)/, `background: linear-gradient(135deg, ${value}, #fffaf5)`);
                        } else {
                            styles.header = styles.header.replace(/background:\s*[^;]+/, `background: ${value}`);
                        }
                    });
            });

        new Setting(tableSection)
            .setName('圆角大小')
            .setDesc('设置表格的圆角大小（单位：像素）')
            .addText(text => {
                const currentRadius = styles.container.match(/border-radius:\s*(\d+)px/)?.[1];
                text.setValue(currentRadius)
                    .onChange(value => {
                        const radius = parseInt(value) || 12;
                        styles.container = styles.container.replace(/border-radius:\s*\d+px/, `border-radius: ${radius}px`);
                    });
            });
    }

    private addHrSettings(container: HTMLElement, styles: any) {
        const hrSection = container.createDiv('hr-section');

        new Setting(hrSection)
            .setName('分隔线颜色')
            .setDesc('设置水平分隔线的颜色')
            .addColorPicker(color => {
                const currentColor = styles.hr.match(/border-top:\s*\d+px\s*solid\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor)
                    .onChange(value => {
                        styles.hr = styles.hr.replace(/border-top:\s*\d+px\s*solid\s*#[a-fA-F0-9]+/, `border-top: 2px solid ${value}`);
                    });
            });

        new Setting(hrSection)
            .setName('分隔线粗细')
            .setDesc('设置水平分隔线的粗细（单位：像素）')
            .addText(text => {
                const currentWidth = styles.hr.match(/border-top:\s*(\d+)px/)?.[1];
                text.setValue(currentWidth)
                    .onChange(value => {
                        const width = parseInt(value) || 2;
                        styles.hr = styles.hr.replace(/border-top:\s*\d+px/, `border-top: ${width}px`);
                    });
            });

        new Setting(hrSection)
            .setName('上下边距')
            .setDesc('设置分隔线与上下内容的间距（单位：像素）')
            .addText(text => {
                const currentMargin = styles.hr.match(/margin:\s*(\d+)px/)?.[1];
                text.setValue(currentMargin)
                    .onChange(value => {
                        const margin = parseInt(value) || 28;
                        styles.hr = styles.hr.replace(/margin:\s*\d+px/, `margin: ${margin}px`);
                    });
            });
    }

    private addImageSettings(container: HTMLElement, styles: any) {
        const imageSection = container.createDiv('image-section');

        new Setting(imageSection)
            .setName('最大宽度')
            .setDesc('设置图片的最大显示宽度（支持百分比或像素值，例如：100% 或 800px）')
            .addText(text => {
                const currentWidth = styles.image.match(/max-width:\s*([^;]+)/)?.[1];
                text.setValue(currentWidth)
                    .onChange(value => {
                        // 验证输入值是否为有效的宽度值
                        const isValid = /^\d+(%|px)$/.test(value.trim());
                        const width = isValid ? value.trim() : '100%';
                        styles.image = styles.image.replace(/max-width:\s*[^;]+/, `max-width: ${width}`);
                    });
            });

        new Setting(imageSection)
            .setName('边距')
            .setDesc('设置图片与上下文本的间距（单位：em）')
            .addText(text => {
                const currentMargin = styles.image.match(/margin:\s*([\d.]+)em/)?.[1];
                text.setValue(currentMargin)
                    .onChange(value => {
                        const margin = parseFloat(value) || 1.5;
                        styles.image = styles.image.replace(/margin:\s*[\d.]+em/, `margin: ${margin}em`);
                    });
            });

        new Setting(imageSection)
            .setName('圆角大小')
            .setDesc('设置图片的圆角程度（单位：像素）')
            .addText(text => {
                const currentRadius = styles.image.match(/border-radius:\s*(\d+)px/)?.[1];
                text.setValue(currentRadius || '8')
                    .onChange(value => {
                        const radius = parseInt(value) || 8;
                        if (styles.image.includes('border-radius:')) {
                            styles.image = styles.image.replace(/border-radius:\s*\d+px/, `border-radius: ${radius}px`);
                        } else {
                            styles.image = styles.image.replace(/;(\s*)$/, `; border-radius: ${radius}px;$1`);
                        }
                    });
            });

        new Setting(imageSection)
            .setName('边框颜色')
            .setDesc('设置图片边框的颜色')
            .addColorPicker(color => {
                const currentColor = styles.image.match(/border:\s*1px solid\s*(#[a-fA-F0-9]+)/)?.[1];
                color.setValue(currentColor || '#d1d5db')
                    .onChange(value => {
                        if (styles.image.includes('border:')) {
                            styles.image = styles.image.replace(/border:\s*1px solid\s*#[a-fA-F0-9]+80/, `border: 1px solid ${value}80`);
                        } else {
                            styles.image = styles.image.replace(/;(\s*)$/, `; border: 1px solid ${value}80;$1`);
                        }
                    });
            });
    }

    private async validateAndSubmit(): Promise<boolean> {
        const trimmedName = this.template.name.trim();

        if (!trimmedName) {
            new Notice('模板名称不能为空');
            this.nameInput.focus();
            return false;
        }

        // 检查是否选择了样本模板
        if (this.showSampleTemplate && !this.templateSelect.value) {
            new Notice('请选择一个参考模板');
            this.templateSelect.focus();
            return false;
        }

        try {
            await this.onSubmit(this.template);
            return true;
        } catch (error) {
            new Notice('保存失败：' + error.message, 3000);
            return false;
        }
    }

    private generateTemplateId(name: string): string {
        // 生成模板ID的逻辑
        return `template-${name}`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}