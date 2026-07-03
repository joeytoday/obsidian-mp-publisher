import { App, PluginSettingTab, Setting } from 'obsidian';
import { VIEW_TYPE_GUIDE, VIEW_TYPE_CHANGELOG } from '../guideView';
import MPPlugin from '../main';
import { WechatAccount } from './settings';
import { nanoid } from '../utils/nanoid';

export class MPSettingTab extends PluginSettingTab {
    plugin: MPPlugin;

    constructor(app: App, plugin: MPPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('mp-settings');

        // ── 使用指南 ──────────────────────────────────
        new Setting(containerEl)
            .setName('使用指南')
            .addButton(btn => btn
                .setButtonText('使用指南')
                .onClick(async () => {
                    await this.openDocView(VIEW_TYPE_GUIDE);
                }))
            .addButton(btn => btn
                .setButtonText('更新日志')
                .onClick(async () => {
                    await this.openDocView(VIEW_TYPE_CHANGELOG);
                }));

        // ── 主题与外观 ──────────────────────────────────

        new Setting(containerEl)
            .setName('主题管理')
            .addButton(btn => btn
                .setButtonText('打开')
                .onClick(() => {
                    void this.plugin.activateThemeManager();
                }));

        // ── 公众号 ──────────────────────────────────

        const accounts = this.plugin.settingsManager.getSettings().wechatAccounts;

        for (const account of accounts) {
            this.renderAccountCard(containerEl, account);
        }

        if (accounts.length < 3) {
            new Setting(containerEl)
                .addButton(btn => btn
                    .setButtonText('添加公众号')
                    .setCta()
                    .onClick(async () => {
                        const newAccount: WechatAccount = {
                            id: nanoid(),
                            name: '',
                            appId: '',
                            appSecret: '',
                        };
                        const updatedAccounts = [...accounts, newAccount];
                        const updates: Partial<ReturnType<typeof this.plugin.settingsManager.getSettings>> = {
                            wechatAccounts: updatedAccounts,
                        };
                        if (updatedAccounts.length === 1) {
                            updates.activeWechatAccountId = newAccount.id;
                        }
                        await this.plugin.settingsManager.updateSettings(updates);
                        this.display();
                    }));
        }

        // ── 发布设置 ──────────────────────────────────

        new Setting(containerEl)
            .setName('数学公式转 SVG')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.getSettings().convertMathToSVG)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        convertMathToSVG: value,
                    });
                }));

        new Setting(containerEl)
            .setName('从属性提取标题和描述')
            .setDesc('开启后，发布时自动从 Markdown 属性中提取标题和描述，填充到发布表单')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.getSettings().extractFromFrontmatter)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        extractFromFrontmatter: value,
                    });
                    titleKeySetting.settingEl.toggle(value);
                    descKeySetting.settingEl.toggle(value);
                }));

        const titleKeySetting = new Setting(containerEl)
            .setName('标题属性名')
            .setDesc('属性中标题对应的字段名')
            .addText(text => text
                .setPlaceholder('title')
                .setValue(this.plugin.settingsManager.getSettings().frontmatterTitleKey)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        frontmatterTitleKey: value || 'title',
                    });
                }));

        const descKeySetting = new Setting(containerEl)
            .setName('描述属性名')
            .setDesc('属性中描述对应的字段名')
            .addText(text => text
                .setPlaceholder('description')
                .setValue(this.plugin.settingsManager.getSettings().frontmatterDescriptionKey)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        frontmatterDescriptionKey: value || 'description',
                    });
                }));

        const isExtractEnabled = this.plugin.settingsManager.getSettings().extractFromFrontmatter;
        titleKeySetting.settingEl.toggle(isExtractEnabled);
        descKeySetting.settingEl.toggle(isExtractEnabled);

        // ── 图片设置 ──────────────────────────────────

        new Setting(containerEl)
            .setName('图片描述')
            .setDesc('开启后，预览、复制和发布时自动在图片下方显示描述文字（取自 ![描述](链接) 中的描述）')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.getSettings().showImageCaption)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        showImageCaption: value,
                    });
                }));

        // ── 其他 ──────────────────────────────────

        new Setting(containerEl)
            .setName('调试模式')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.getSettings().debugMode)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        debugMode: value,
                    });
                    this.plugin.logger.setDebugMode(value);
                }));
    }

    private renderAccountCard(containerEl: HTMLElement, account: WechatAccount): void {
        const settings = this.plugin.settingsManager.getSettings();
        const isActive = settings.activeWechatAccountId === account.id;

        const card = containerEl.createDiv({ cls: 'mp-account-card' });
        if (isActive) {
            card.addClass('is-active');
        }

        // 卡片头部：名称 + 状态标签 + 操作按钮
        const header = card.createDiv({ cls: 'mp-account-card-header' });

        const titleRow = header.createDiv({ cls: 'mp-account-card-title-row' });
        const nameInput = titleRow.createEl('input', {
            cls: 'mp-account-name-input',
            attr: {
                type: 'text',
                placeholder: '公众号名称',
                value: account.name,
            },
        });
        nameInput.addEventListener('change', () => {
            void (async () => {
                account.name = nameInput.value;
                await this.plugin.settingsManager.updateSettings({
                    wechatAccounts: settings.wechatAccounts,
                });
            })();
        });

        if (isActive) {
            titleRow.createEl('span', { text: '默认', cls: 'mp-account-badge' });
        }

        const actions = header.createDiv({ cls: 'mp-account-card-actions' });
        if (!isActive) {
            const setDefaultBtn = actions.createEl('button', {
                text: '设为默认',
                cls: 'mp-account-action-btn',
            });
            setDefaultBtn.addEventListener('click', () => {
                void (async () => {
                    await this.plugin.settingsManager.updateSettings({
                        activeWechatAccountId: account.id,
                        wechatAppId: account.appId,
                        wechatAppSecret: account.appSecret,
                    });
                    this.display();
                })();
            });
        }
        const deleteBtn = actions.createEl('button', {
            text: '删除',
            cls: 'mp-account-action-btn mp-account-action-btn--danger',
        });
        deleteBtn.addEventListener('click', () => {
            void (async () => {
                const updatedAccounts = settings.wechatAccounts.filter(a => a.id !== account.id);
                const updates: Partial<typeof settings> = {
                    wechatAccounts: updatedAccounts,
                };
                if (isActive && updatedAccounts.length > 0) {
                    updates.activeWechatAccountId = updatedAccounts[0].id;
                    updates.wechatAppId = updatedAccounts[0].appId;
                    updates.wechatAppSecret = updatedAccounts[0].appSecret;
                } else if (updatedAccounts.length === 0) {
                    updates.activeWechatAccountId = '';
                    updates.wechatAppId = '';
                    updates.wechatAppSecret = '';
                }
                await this.plugin.settingsManager.updateSettings(updates);
                this.display();
            })();
        });

        // 卡片内容：AppID + AppSecret
        const body = card.createDiv({ cls: 'mp-account-card-body' });

        new Setting(body)
            .setName('AppID')
            .addText(text => text
                .setPlaceholder('wx...')
                .setValue(account.appId)
                .onChange(async (value) => {
                    const trimmed = value.trim();
                    account.appId = trimmed;
                    const updates: Partial<typeof settings> = {
                        wechatAccounts: settings.wechatAccounts,
                    };
                    if (isActive) {
                        updates.wechatAppId = trimmed;
                    }
                    await this.plugin.settingsManager.updateSettings(updates);
                }));

        new Setting(body)
            .setName('AppSecret')
            .addText(text => text
                .setPlaceholder('输入 AppSecret')
                .setValue(account.appSecret)
                .onChange(async (value) => {
                    const trimmed = value.trim();
                    account.appSecret = trimmed;
                    const updates: Partial<typeof settings> = {
                        wechatAccounts: settings.wechatAccounts,
                    };
                    if (isActive) {
                        updates.wechatAppSecret = trimmed;
                    }
                    await this.plugin.settingsManager.updateSettings(updates);
                }));
    }

    private async openDocView(viewType: string): Promise<void> {
        const leaves = this.app.workspace.getLeavesOfType(viewType);
        if (leaves.length > 0) {
            void this.app.workspace.revealLeaf(leaves[0]);
            return;
        }
        const leaf = this.app.workspace.getLeaf(true);
        if (leaf) {
            await leaf.setViewState({ type: viewType, active: true });
        }
    }
}