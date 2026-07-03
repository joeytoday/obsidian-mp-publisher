import { CSSTheme, FontOption, DEFAULT_FONTS, RemoteThemeIndex } from '../types/css-theme';
import type { DocumentMetadata } from '../types/metadata';

// 微信公众号账号配置
export interface WechatAccount {
    id: string;
    name: string;
    appId: string;
    appSecret: string;
}

export interface MPSettings {
    // 主题设置
    activeThemeId: string;
    fontFamily: string;
    fontSize: number;
    customFonts: FontOption[];
    downloadedRemoteThemes: CSSTheme[];
    remoteThemeIndexCache?: RemoteThemeIndex[];
    remoteIndexLastUpdate?: number;
    // 微信公众号相关设置（保留旧字段兼容）
    wechatAppId: string;
    wechatAppSecret: string;
    // 多公众号账号列表
    wechatAccounts: WechatAccount[];
    activeWechatAccountId: string;
    debugMode: boolean;
    // 文档发布元数据（图片缓存、草稿 ID 等），以文件路径为 key
    documentMetadata: Record<string, DocumentMetadata>;
    // 主题快速切换隐藏列表
    hiddenThemeIds: string[];
    // 数学公式设置
    convertMathToSVG: boolean;
    // 从 frontmatter 提取标题和描述
    extractFromFrontmatter: boolean;
    frontmatterTitleKey: string;
    frontmatterDescriptionKey: string;
    // 图片描述（默认关闭）
    showImageCaption: boolean;
}

const DEFAULT_SETTINGS: MPSettings = {
    // 主题默认设置
    activeThemeId: 'default',
    fontFamily: DEFAULT_FONTS[0].value,
    fontSize: 16,
    customFonts: [...DEFAULT_FONTS],
    downloadedRemoteThemes: [],
    // 微信公众号默认设置（保留旧字段兼容）
    wechatAppId: '',
    wechatAppSecret: '',
    // 多公众号账号
    wechatAccounts: [],
    activeWechatAccountId: '',
    debugMode: false,
    // 文档发布元数据
    documentMetadata: {},
    // 主题快速切换隐藏列表
    hiddenThemeIds: [],
    // 数学公式默认设置
    convertMathToSVG: true,
    // 从 frontmatter 提取标题和描述（默认关闭）
    extractFromFrontmatter: false,
    frontmatterTitleKey: 'title',
    frontmatterDescriptionKey: 'description',
    // 图片描述（默认关闭）
    showImageCaption: false,
};

export class SettingsManager {
    private plugin: { loadData(): Promise<Record<string, unknown>>; saveData(data: MPSettings): Promise<void> };
    private settings: MPSettings;

    constructor(plugin: { loadData(): Promise<Record<string, unknown>>; saveData(data: MPSettings): Promise<void> }) {
        this.plugin = plugin;
        this.settings = { ...DEFAULT_SETTINGS };
    }

    async loadSettings(): Promise<void> {
        const rawSavedData: Record<string, unknown> = (await this.plugin.loadData()) ?? {};

        // 迁移旧设置：如果有旧的 templateId，映射到 activeThemeId
        if (rawSavedData.templateId && !rawSavedData.activeThemeId) {
            rawSavedData.activeThemeId = rawSavedData.templateId;
        }

        // 确保 customFonts 存在
        if (!rawSavedData.customFonts || !(rawSavedData.customFonts as unknown[])?.length) {
            rawSavedData.customFonts = [...DEFAULT_FONTS];
        }

        // 确保 downloadedRemoteThemes 存在
        if (!rawSavedData.downloadedRemoteThemes) {
            rawSavedData.downloadedRemoteThemes = [];
        }

        // 迁移旧的单公众号配置到多账号列表
        if (!rawSavedData.wechatAccounts || !(rawSavedData.wechatAccounts as unknown[])?.length) {
            if (rawSavedData.wechatAppId && rawSavedData.wechatAppSecret) {
                rawSavedData.wechatAccounts = [{
                    id: 'default',
                    name: '默认公众号',
                    appId: rawSavedData.wechatAppId,
                    appSecret: rawSavedData.wechatAppSecret,
                }];
                rawSavedData.activeWechatAccountId = 'default';
            } else {
                rawSavedData.wechatAccounts = [];
                rawSavedData.activeWechatAccountId = '';
            }
        }

        const savedData = rawSavedData as Partial<MPSettings>;
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

    getActiveWechatAccount(): WechatAccount | undefined {
        const { wechatAccounts, activeWechatAccountId } = this.settings;
        return wechatAccounts.find(account => account.id === activeWechatAccountId);
    }

    getWechatAccountById(accountId: string): WechatAccount | undefined {
        return this.settings.wechatAccounts.find(account => account.id === accountId);
    }
}