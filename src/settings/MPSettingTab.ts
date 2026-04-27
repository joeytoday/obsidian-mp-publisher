import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import MPPlugin from '../main';
import { ConfirmModal } from './ConfirmModal';
import { MetadataListItem } from '../storage/documentMetadataStore';

export class MPSettingTab extends PluginSettingTab {
    plugin: MPPlugin;
    private selectedMetadataPaths: Set<string> = new Set();

    constructor(app: App, plugin: MPPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('mp-settings');

        containerEl.createEl('h2', { text: 'MP Publisher 设置' });

        // 主题管理入口
        new Setting(containerEl)
            .setName('主题管理')
            .setDesc('管理内置主题、云端主题和本地自定义 CSS 主题')
            .addButton(btn => btn
                .setButtonText('打开主题管理')
                .setCta()
                .onClick(() => {
                    // 通过插件方法打开主题管理界面
                    this.plugin.activateThemeManager();
                }));

        // 微信公众号配置
        containerEl.createEl('h3', { text: '微信公众号配置' });

        // AppID 设置
        new Setting(containerEl)
            .setName('AppID')
            .setDesc('微信公众号的 AppID')
            .addText(text => text
                .setPlaceholder('输入 AppID')
                .setValue(this.plugin.settingsManager.getSettings().wechatAppId || '')
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        wechatAppId: value,
                    });
                }));

        // AppSecret 设置
        new Setting(containerEl)
            .setName('AppSecret')
            .setDesc('微信公众号的 AppSecret')
            .addText(text => text
                .setPlaceholder('输入 AppSecret')
                .setValue(this.plugin.settingsManager.getSettings().wechatAppSecret || '')
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        wechatAppSecret: value,
                    });
                }));

        // 调试模式
        new Setting(containerEl)
            .setName('调试模式')
            .setDesc('启用后将显示详细的调试日志信息')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.getSettings().debugMode)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        debugMode: value,
                    });
                    this.plugin.logger.setDebugMode(value);
                }));

        // 数学公式配置
        containerEl.createEl('h3', { text: '数学公式配置' });

        // 转换数学公式为 SVG
        new Setting(containerEl)
            .setName('转换数学公式为 SVG')
            .setDesc('启用后将把 LaTeX 数学公式转换为 SVG 格式，确保在微信公众号中正确显示。支持 $...$（行内公式）和 $$...$$（块级公式）语法')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.getSettings().convertMathToSVG)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        convertMathToSVG: value,
                    });
                }));

        // 缓存清理配置
        containerEl.createEl('h3', { text: '元数据缓存清理' });

        new Setting(containerEl)
            .setName('启用自动清理')
            .setDesc('在插件启动和发布前自动清理过期缓存元数据')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.getSettings().cacheCleanupEnabled)
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({
                        cacheCleanupEnabled: value,
                    });
                }));

        new Setting(containerEl)
            .setName('自动清理保留时长')
            .setDesc('支持 3 天、7 天，或自定义天数')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('3', '3 天')
                    .addOption('7', '7 天')
                    .addOption('custom', '自定义')
                    .setValue(this.plugin.settingsManager.getSettings().cacheRetentionMode)
                    .onChange(async (value: '3' | '7' | 'custom') => {
                        await this.plugin.settingsManager.updateSettings({
                            cacheRetentionMode: value,
                        });
                        this.display();
                    });
            });

        new Setting(containerEl)
            .setName('自定义保留天数')
            .setDesc('仅在“自动清理保留时长”选择“自定义”时生效，最小为 1 天')
            .addText(text => {
                const settings = this.plugin.settingsManager.getSettings();
                text
                    .setPlaceholder('输入天数，例如 14')
                    .setValue(String(settings.cacheRetentionDays))
                    .setDisabled(settings.cacheRetentionMode !== 'custom')
                    .onChange(async (value) => {
                        const days = Math.max(1, Number(value) || 1);
                        await this.plugin.settingsManager.updateSettings({
                            cacheRetentionDays: days,
                        });
                    });
            });

        const metadataListRoot = containerEl.createDiv({ cls: 'mp-metadata-list-root' });
        metadataListRoot.createEl('h4', { text: '缓存条目管理' });
        metadataListRoot.createEl('p', {
            text: '可勾选条目后手动清理。清理会删除该文档的图片缓存和草稿信息。',
        });
        const metadataListContainer = metadataListRoot.createDiv({ cls: 'mp-metadata-list-container' });
        void this.renderMetadataList(metadataListContainer);
    }

    private async renderMetadataList(container: HTMLElement): Promise<void> {
        container.empty();
        this.selectedMetadataPaths.clear();

        const entries = this.plugin.metadataStore.listEntries();

        const actionBar = container.createDiv({ cls: 'mp-metadata-actions' });
        actionBar.style.display = 'flex';
        actionBar.style.gap = '8px';
        actionBar.style.alignItems = 'center';
        actionBar.style.flexWrap = 'wrap';

        const quickSelectButton = actionBar.createEl('button', { text: '全选' });
        const clearButton = actionBar.createEl('button', { text: '清除选中条目' });
        clearButton.disabled = true;

        quickSelectButton.addEventListener('click', () => {
            const selectedCount = this.selectAllEntries(container);
            clearButton.disabled = selectedCount === 0;
            new Notice(`已全选 ${selectedCount} 条缓存`);
        });

        clearButton.addEventListener('click', () => {
            const selected = Array.from(this.selectedMetadataPaths);
            if (selected.length === 0) {
                new Notice('请先选择要清理的条目');
                return;
            }

            const modal = new ConfirmModal(
                this.app,
                '确认清理',
                `确定清理选中的 ${selected.length} 条缓存数据吗？清理后将删除图片缓存与草稿信息。`,
                () => {
                    void this.clearSelectedEntries(selected, container);
                },
            );
            modal.open();
        });

        if (entries.length === 0) {
            container.createEl('p', { text: '当前没有可清理的缓存条目。' });
            return;
        }

        const tableWrap = container.createDiv();
        tableWrap.style.overflowX = 'auto';
        tableWrap.style.maxWidth = '100%';

        const table = tableWrap.createEl('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'auto';
        table.style.whiteSpace = 'nowrap';

        const thead = table.createEl('thead');
        const headRow = thead.createEl('tr');
        ['选择', '文档路径', '最后使用时间', '图片数', '草稿'].forEach((title) => {
            const th = headRow.createEl('th', { text: title });
            th.style.textAlign = 'left';
            th.style.padding = '6px 8px';
            th.style.borderBottom = '1px solid var(--background-modifier-border)';
            th.style.whiteSpace = 'nowrap';
        });

        const tbody = table.createEl('tbody');
        for (const entry of entries) {
            const row = tbody.createEl('tr');
            row.dataset.filePath = entry.filePath;
            row.dataset.lastUsedAt = String(entry.lastUsedAt || 0);

            const checkTd = row.createEl('td');
            checkTd.style.padding = '6px 8px';
            checkTd.style.whiteSpace = 'nowrap';
            const checkbox = checkTd.createEl('input', { type: 'checkbox' });
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedMetadataPaths.add(entry.filePath);
                } else {
                    this.selectedMetadataPaths.delete(entry.filePath);
                }
                clearButton.disabled = this.selectedMetadataPaths.size === 0;
            });

            const pathTd = row.createEl('td');
            pathTd.style.padding = '6px 8px';
            pathTd.style.whiteSpace = 'nowrap';
            pathTd.style.maxWidth = '520px';
            pathTd.style.overflow = 'hidden';
            pathTd.style.textOverflow = 'ellipsis';
            pathTd.title = entry.filePath;
            pathTd.setText(entry.filePath);

            const timeTd = row.createEl('td', { text: this.formatTime(entry.lastUsedAt) });
            timeTd.style.padding = '6px 8px';
            timeTd.style.whiteSpace = 'nowrap';

            const imageTd = row.createEl('td', { text: String(entry.imageCount) });
            imageTd.style.padding = '6px 8px';
            imageTd.style.whiteSpace = 'nowrap';

            const draftTd = row.createEl('td', { text: entry.hasDraft ? '有' : '无' });
            draftTd.style.padding = '6px 8px';
            draftTd.style.whiteSpace = 'nowrap';
        }
    }

    private selectAllEntries(container: HTMLElement): number {
        this.selectedMetadataPaths.clear();
        const rows = container.querySelectorAll<HTMLTableRowElement>('tbody tr');
        for (const row of Array.from(rows)) {
            const filePath = row.dataset.filePath || '';
            const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]');
            if (!checkbox || !filePath) continue;

            checkbox.checked = true;
            this.selectedMetadataPaths.add(filePath);
        }

        return this.selectedMetadataPaths.size;
    }

    private async clearSelectedEntries(selected: string[], container: HTMLElement): Promise<void> {
        const removed = await this.plugin.metadataStore.removeMany(selected);
        if (removed > 0) {
            new Notice(`已清理 ${removed} 条缓存数据`);
        } else {
            new Notice('未清理任何数据');
        }
        void this.renderMetadataList(container);
    }

    private formatTime(timestamp: number): string {
        if (!timestamp || timestamp <= 0) return '未知';
        return new Date(timestamp).toLocaleString();
    }
}
