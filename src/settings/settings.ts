import { FontOption, DEFAULT_FONTS, ThemeSettings } from '../types/css-theme';
import type { DocumentMetadata } from '../types/metadata';

export interface MPSettings extends ThemeSettings {
    // 微信公众号相关设置
    wechatAppId: string;
    wechatAppSecret: string;
    debugMode: boolean;
    // 文档发布元数据（图片缓存、草稿 ID 等），以文件路径为 key
    documentMetadata: Record<string, DocumentMetadata>;
    // 数学公式设置
    convertMathToSVG: boolean;
}

const DEFAULT_SETTINGS: MPSettings = {
    // 主题默认设置
    activeThemeId: 'default',
    fontFamily: DEFAULT_FONTS[0].value,
    fontSize: 16,
    customFonts: [...DEFAULT_FONTS],
    downloadedRemoteThemes: [],
    // 微信公众号默认设置
    wechatAppId: '',
    wechatAppSecret: '',
    debugMode: false,
    // 文档发布元数据
    documentMetadata: {},
    // 数学公式默认设置
    convertMathToSVG: true,
};

export class SettingsManager {
    private plugin: any;
    private settings: MPSettings;

    constructor(plugin: any) {
        this.plugin = plugin;
        this.settings = { ...DEFAULT_SETTINGS };
    }

    async loadSettings(): Promise<void> {
        const savedData = (await this.plugin.loadData()) || {};

        // 迁移旧设置：如果有旧的 templateId，映射到 activeThemeId
        if (savedData.templateId && !savedData.activeThemeId) {
            savedData.activeThemeId = savedData.templateId;
        }

        // 确保 customFonts 存在
        if (!savedData.customFonts || savedData.customFonts.length === 0) {
            savedData.customFonts = [...DEFAULT_FONTS];
        }

        // 确保 downloadedRemoteThemes 存在
        if (!savedData.downloadedRemoteThemes) {
            savedData.downloadedRemoteThemes = [];
        }

        this.settings = { ...DEFAULT_SETTINGS, ...savedData };
    }

    async saveSettings(): Promise<void> {
        await this.plugin.saveData(this.settings);
    }

    getSettings(): MPSettings {
        return this.settings;
    }

    async updateSettings(updates: Partial<MPSettings>): Promise<void> {
        this.settings = { ...this.settings, ...updates };
        await this.saveSettings();
    }

    getFontOptions(): FontOption[] {
        return this.settings.customFonts;
    }
}