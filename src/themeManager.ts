import { App, Notice, requestUrl } from 'obsidian';
import { CSSTheme, ThemeSource, ThemeSettings, FontOption, DEFAULT_FONTS, RemoteThemeIndex, REMOTE_THEME_CONFIG } from './types/css-theme';
import { builtinThemes, communityThemes } from './themes';
import type { MPSettings } from './settings/settings';

/**
 * CSS 主题管理器
 * 负责管理内置、云端、本地三层主题
 */
export class ThemeManager {
    private app: App;
    private plugin: { settingsManager: { getSettings(): MPSettings; updateSettings(updates: Partial<MPSettings>): Promise<void> }; manifest: { dir?: string } };
    private themes: Map<string, CSSTheme> = new Map();
    private activeTheme: CSSTheme | null = null;
    private currentFont: string;
    private currentFontSize: number;
    private injectedStyleElement: HTMLStyleElement | null = null;

    constructor(app: App, plugin: { settingsManager: { getSettings(): MPSettings; updateSettings(updates: Partial<MPSettings>): Promise<void> }; manifest: { dir?: string } }) {
        this.app = app;
        this.plugin = plugin;
        this.currentFont = DEFAULT_FONTS[0].value;
        this.currentFontSize = 16;
    }

    /** 初始化：加载所有主题 */
    async initialize(): Promise<void> {
        const hiddenIds = this.getHiddenThemeIds();

        // 1. 加载内置主题
        for (const theme of builtinThemes) {
            theme.isVisible = !hiddenIds.includes(theme.id);
            this.themes.set(theme.id, theme);
        }

        // 2. 加载社区投稿主题
        for (const theme of communityThemes) {
            theme.isVisible = !hiddenIds.includes(theme.id);
            this.themes.set(theme.id, theme);
        }

        // 3. 加载已下载的云端主题（从设置中恢复）
        const settings = this.getThemeSettings();
        if (settings.downloadedRemoteThemes) {
            for (const theme of settings.downloadedRemoteThemes) {
                this.themes.set(theme.id, theme);
            }
        }

        // 3. 加载本地自定义主题
        await this.loadLocalThemes();

        // 4. 恢复上次选中的主题
        const activeId = settings.activeThemeId || 'default';
        this.setActiveTheme(activeId);

        // 5. 恢复字体设置
        this.currentFont = settings.fontFamily || DEFAULT_FONTS[0].value;
        this.currentFontSize = settings.fontSize || 16;
    }

    /** 获取主题设置 */
    private getThemeSettings(): ThemeSettings {
        const data = this.plugin.settingsManager.getSettings();
        return {
            activeThemeId: data.activeThemeId || 'default',
            fontFamily: data.fontFamily || DEFAULT_FONTS[0].value,
            fontSize: data.fontSize || 16,
            customFonts: data.customFonts || DEFAULT_FONTS,
            downloadedRemoteThemes: data.downloadedRemoteThemes || [],
            remoteThemeIndexCache: data.remoteThemeIndexCache,
            remoteIndexLastUpdate: data.remoteIndexLastUpdate,
        };
    }

    // ==================== 主题获取 ====================

    /** 获取所有主题 */
    getAllThemes(): CSSTheme[] {
        return Array.from(this.themes.values());
    }

    /** 获取所有可见主题 */
    getVisibleThemes(): CSSTheme[] {
        return this.getAllThemes().filter(theme => theme.isVisible);
    }

    /** 按来源获取主题 */
    getThemesBySource(source: ThemeSource): CSSTheme[] {
        return this.getAllThemes().filter(theme => theme.source === source);
    }

    /** 获取指定主题 */
    getTheme(themeId: string): CSSTheme | undefined {
        return this.themes.get(themeId);
    }

    /** 获取当前激活的主题 */
    getActiveTheme(): CSSTheme | null {
        return this.activeTheme;
    }

    // ==================== 主题切换 ====================

    /** 设置当前主题 */
    setActiveTheme(themeId: string): boolean {
        const theme = this.themes.get(themeId);
        if (theme) {
            this.activeTheme = theme;
            return true;
        }
        // 降级到默认主题
        const defaultTheme = this.themes.get('default');
        if (defaultTheme) {
            this.activeTheme = defaultTheme;
        }
        return false;
    }

    /** 设置字体 */
    setFont(fontFamily: string): void {
        this.currentFont = fontFamily;
    }

    /** 获取当前字体 */
    getFont(): string {
        return this.currentFont;
    }

    /** 设置字号 */
    setFontSize(size: number): void {
        this.currentFontSize = size;
    }

    /** 获取当前字号 */
    getFontSize(): number {
        return this.currentFontSize;
    }

    // ==================== 主题应用 ====================

    /**
     * 将当前主题的 CSS 应用到预览元素
     * 通过注入 <style> 标签实现
     */
    applyTheme(element: HTMLElement, theme?: CSSTheme, scopeId?: string): void {
        const targetTheme = theme || this.activeTheme;
        if (!targetTheme) return;

        // 移除已有的主题样式
        const existingStyle = element.querySelector('style[data-mp-theme]');
        if (existingStyle) {
            existingStyle.remove();
        }

        // 设置作用域属性，防止不同视图间样式泄露
        if (scopeId) {
            element.setAttribute('data-mp-scope', scopeId);
        }

        // 构建最终 CSS：主题 CSS + 字体/字号覆盖
        const fontOverrideCSS = this.buildFontOverrideCSS(scopeId);
        const scopedThemeCSS = scopeId ? this.scopeCSS(targetTheme.css, scopeId) : targetTheme.css;
        const finalCSS = scopedThemeCSS + '\n' + fontOverrideCSS;

        // 注入新的样式标签（使用 createEl 符合 Obsidian DOM 创建规范）
        const styleElement = element.createEl('style', { attr: { 'data-mp-theme': targetTheme.id } });
        styleElement.textContent = finalCSS;
    }

    /** 给 CSS 选择器加上作用域前缀，防止跨视图污染 */
    private scopeCSS(css: string, scopeId: string): string {
        const scopeAttr = `[data-mp-scope="${scopeId}"]`;
        return css.replace(/\.mp-content-section/g, `.mp-content-section${scopeAttr}`);
    }

    /**
     * 获取当前主题的完整 CSS（用于发布时内联）
     */
    getActiveThemeCSS(): string {
        if (!this.activeTheme) return '';
        return this.activeTheme.css + '\n' + this.buildFontOverrideCSS();
    }

    /** 构建字体/字号覆盖 CSS */
    private buildFontOverrideCSS(scopeId?: string): string {
        const scopeAttr = scopeId ? `[data-mp-scope="${scopeId}"]` : '';
        return `
/* 字体/字号覆盖 */
.mp-content-section${scopeAttr} {
    font-family: ${this.currentFont} !important;
    font-size: ${this.currentFontSize}px !important;
}
.mp-content-section${scopeAttr} p,
.mp-content-section${scopeAttr} li,
.mp-content-section${scopeAttr} blockquote,
.mp-content-section${scopeAttr} th,
.mp-content-section${scopeAttr} td {
    font-family: ${this.currentFont} !important;
    font-size: ${this.currentFontSize}px !important;
}
`;
    }

    // ==================== 本地主题管理 ====================

    /** 获取本地自定义主题目录路径（使用插件实际安装目录下的 custom 文件夹） */
    private getCustomThemeDir(): string {
        return this.plugin.manifest.dir + '/custom';
    }

    /** 加载本地自定义 CSS 主题 */
    async loadLocalThemes(): Promise<void> {
        const customDir = this.getCustomThemeDir();
        const hiddenIds = this.getHiddenThemeIds();

        // 先移除已有的本地主题，避免重复
        for (const [id, theme] of this.themes.entries()) {
            if (theme.source === ThemeSource.LOCAL) {
                this.themes.delete(id);
            }
        }

        try {
            // 确保目录存在
            const adapter = this.app.vault.adapter;
            if (!(await adapter.exists(customDir))) {
                await adapter.mkdir(customDir);
                return;
            }

            // 读取目录下的所有 .css 文件
            const listing = await adapter.list(customDir);
            for (const filePath of listing.files) {
                if (!filePath.endsWith('.css')) continue;

                try {
                    const cssContent = await adapter.read(filePath);
                    const fileName = filePath.split('/').pop() || '';
                    const themeName = fileName.replace('.css', '');
                    const themeId = `local-${themeName}`;

                    const theme: CSSTheme = {
                        id: themeId,
                        name: themeName,
                        description: '本地自定义主题',
                        source: ThemeSource.LOCAL,
                        css: cssContent,
                        localPath: filePath,
                        isVisible: !hiddenIds.includes(themeId),
                    };

                    this.themes.set(themeId, theme);
                } catch (readError) {
                    console.error(`读取本地主题文件失败: ${filePath}`, readError);
                }
            }
        } catch (error) {
            console.error('加载本地主题失败:', error);
        }
    }

    // ==================== 主题快速切换显隐 ====================

    /** 获取隐藏主题 ID 列表 */
    private getHiddenThemeIds(): string[] {
        return this.plugin.settingsManager.getSettings().hiddenThemeIds || [];
    }

    /** 设置主题在快速切换中的显隐状态 */
    async setThemeQuickSwitchVisible(themeId: string, visible: boolean): Promise<void> {
        const hiddenIds = [...this.getHiddenThemeIds()];
        const index = hiddenIds.indexOf(themeId);

        if (visible && index >= 0) {
            hiddenIds.splice(index, 1);
        } else if (!visible && index < 0) {
            hiddenIds.push(themeId);
        }

        await this.plugin.settingsManager.updateSettings({ hiddenThemeIds: hiddenIds });

        // 同步内存中的 isVisible 状态
        const theme = this.themes.get(themeId);
        if (theme) {
            theme.isVisible = visible;
        }
    }

    /** 检查主题是否在快速切换中可见 */
    isThemeQuickSwitchVisible(themeId: string): boolean {
        return !this.getHiddenThemeIds().includes(themeId);
    }

    /** 保存本地自定义主题 */
    async saveLocalTheme(name: string, css: string): Promise<CSSTheme> {
        const customDir = this.getCustomThemeDir();
        const adapter = this.app.vault.adapter;

        // 确保目录存在
        if (!(await adapter.exists(customDir))) {
            await adapter.mkdir(customDir);
        }

        const fileName = `${name}.css`;
        const filePath = `${customDir}/${fileName}`;
        await adapter.write(filePath, css);

        const themeId = `local-${name}`;
        const theme: CSSTheme = {
            id: themeId,
            name: name,
            description: '本地自定义主题',
            source: ThemeSource.LOCAL,
            css: css,
            localPath: filePath,
            isVisible: true,
        };

        this.themes.set(themeId, theme);
        return theme;
    }

    /** 删除本地自定义主题 */
    async deleteLocalTheme(themeId: string): Promise<boolean> {
        const theme = this.themes.get(themeId);
        if (!theme || theme.source !== ThemeSource.LOCAL) return false;

        if (theme.localPath) {
            try {
                const adapter = this.app.vault.adapter;
                if (await adapter.exists(theme.localPath)) {
                    await adapter.remove(theme.localPath);
                }
            } catch (error) {
                console.error('删除本地主题文件失败:', error);
            }
        }

        this.themes.delete(themeId);

        // 如果删除的是当前主题，切换到默认
        if (this.activeTheme?.id === themeId) {
            this.setActiveTheme('default');
        }

        return true;
    }

    /** 更新本地主题 CSS */
    async updateLocalTheme(themeId: string, css: string): Promise<boolean> {
        const theme = this.themes.get(themeId);
        if (!theme || theme.source !== ThemeSource.LOCAL) return false;

        theme.css = css;

        if (theme.localPath) {
            try {
                await this.app.vault.adapter.write(theme.localPath, css);
            } catch (error) {
                console.error('更新本地主题文件失败:', error);
                return false;
            }
        }

        return true;
    }

    /** 重命名本地主题 */
    async renameLocalTheme(themeId: string, newName: string): Promise<boolean> {
        const theme = this.themes.get(themeId);
        if (!theme || theme.source !== ThemeSource.LOCAL) return false;

        // 验证名称格式
        if (!/^[a-zA-Z0-9\-_\u4e00-\u9fff]+$/.test(newName)) {
            return false;
        }

        const newThemeId = `local-${newName}`;
        const customDir = this.getCustomThemeDir();
        const newFilePath = `${customDir}/${newName}.css`;

        // 检查新名称是否已存在
        if (this.themes.has(newThemeId) && newThemeId !== themeId) {
            return false;
        }

        try {
            const adapter = this.app.vault.adapter;

            // 写入新文件
            await adapter.write(newFilePath, theme.css);

            // 删除旧文件
            if (theme.localPath && await adapter.exists(theme.localPath)) {
                await adapter.remove(theme.localPath);
            }

            // 更新主题信息
            const wasActive = this.activeTheme?.id === themeId;

            // 删除旧的映射
            this.themes.delete(themeId);

            // 更新主题属性
            theme.id = newThemeId;
            theme.name = newName;
            theme.localPath = newFilePath;

            // 添加新的映射
            this.themes.set(newThemeId, theme);

            // 如果是当前激活的主题，更新激活状态和设置
            if (wasActive) {
                this.activeTheme = theme;
                await this.plugin.settingsManager.updateSettings({ activeThemeId: newThemeId });
            }

            return true;
        } catch (error) {
            console.error('重命名本地主题失败:', error);
            return false;
        }
    }

    /** 重新加载本地主题（文件变更后） */
    async reloadLocalThemes(): Promise<void> {
        // 移除所有本地主题
        for (const [id, theme] of this.themes.entries()) {
            if (theme.source === ThemeSource.LOCAL) {
                this.themes.delete(id);
            }
        }
        // 重新加载
        await this.loadLocalThemes();
    }

    // ==================== 云端主题管理 ====================

    /** 获取云端主题索引 */
    async fetchRemoteThemeIndex(): Promise<RemoteThemeIndex[]> {
        const settings = this.getThemeSettings();

        // 检查缓存是否有效
        if (
            settings.remoteThemeIndexCache &&
            settings.remoteIndexLastUpdate &&
            Date.now() - settings.remoteIndexLastUpdate < REMOTE_THEME_CONFIG.cacheExpiry
        ) {
            return settings.remoteThemeIndexCache;
        }

        try {
            const response = await requestUrl({
                url: REMOTE_THEME_CONFIG.indexUrl,
                method: 'GET',
            });

            if (response.status === 200 && Array.isArray(response.json)) {
                const themeIndex: RemoteThemeIndex[] = response.json;

                // 更新缓存
                await this.plugin.settingsManager.updateSettings({
                    remoteThemeIndexCache: themeIndex,
                    remoteIndexLastUpdate: Date.now(),
                });

                return themeIndex;
            }
        } catch (error) {
            console.error('获取云端主题索引失败:', error);
            // 返回缓存（如果有）
            if (settings.remoteThemeIndexCache) {
                return settings.remoteThemeIndexCache;
            }
        }

        return [];
    }

    /** 下载并安装云端主题 */
    async downloadRemoteTheme(themeInfo: RemoteThemeIndex): Promise<CSSTheme | null> {
        try {
            const response = await requestUrl({
                url: themeInfo.cssUrl,
                method: 'GET',
            });

            if (response.status !== 200) {
                new Notice(`下载主题失败: HTTP ${response.status}`);
                return null;
            }

            const cssContent = response.text;
            const themeId = `remote-${themeInfo.id}`;

            const theme: CSSTheme = {
                id: themeId,
                name: themeInfo.name,
                description: themeInfo.description,
                source: ThemeSource.REMOTE,
                css: cssContent,
                remoteUrl: themeInfo.cssUrl,
                author: themeInfo.author,
                isVisible: true,
            };

            this.themes.set(themeId, theme);

            // 持久化到设置
            const settings = this.getThemeSettings();
            const downloadedThemes = settings.downloadedRemoteThemes.filter(
                existingTheme => existingTheme.id !== themeId
            );
            downloadedThemes.push(theme);
            await this.plugin.settingsManager.updateSettings({
                downloadedRemoteThemes: downloadedThemes,
            });

            return theme;
        } catch (error) {
            console.error('下载云端主题失败:', error);
            new Notice('下载主题失败，请检查网络连接');
            return null;
        }
    }

    /** 删除已下载的云端主题 */
    async deleteRemoteTheme(themeId: string): Promise<boolean> {
        const theme = this.themes.get(themeId);
        if (!theme || theme.source !== ThemeSource.REMOTE) return false;

        this.themes.delete(themeId);

        // 从设置中移除
        const settings = this.getThemeSettings();
        const downloadedThemes = settings.downloadedRemoteThemes.filter(
            existingTheme => existingTheme.id !== themeId
        );
        await this.plugin.settingsManager.updateSettings({
            downloadedRemoteThemes: downloadedThemes,
        });

        // 如果删除的是当前主题，切换到默认
        if (this.activeTheme?.id === themeId) {
            this.setActiveTheme('default');
        }

        return true;
    }

    // ==================== 字体管理 ====================

    /** 获取字体选项列表 */
    getFontOptions(): FontOption[] {
        const settings = this.getThemeSettings();
        return settings.customFonts || DEFAULT_FONTS;
    }

}
