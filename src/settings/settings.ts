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
};

export class SettingsManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Obsidian Plugin lacks public type definitions for loadData/saveData
    private plugin: { loadData(): Promise<any>; saveData(data: MPSettings): Promise<void> };
    private settings: MPSettings;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Obsidian Plugin lacks public type definitions for loadData/saveData
    constructor(plugin: { loadData(): Promise<any>; saveData(data: MPSettings): Promise<void> }) {
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

        // 迁移旧的单公众号配置到多账号列表
        if (!savedData.wechatAccounts || savedData.wechatAccounts.length === 0) {
            if (savedData.wechatAppId && savedData.wechatAppSecret) {
                savedData.wechatAccounts = [{
                    id: 'default',
                    name: '默认公众号',
                    appId: savedData.wechatAppId,
                    appSecret: savedData.wechatAppSecret,
                }];
                savedData.activeWechatAccountId = 'default';
            } else {
                savedData.wechatAccounts = [];
                savedData.activeWechatAccountId = '';
            }
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

    getActiveWechatAccount(): WechatAccount | undefined {
        const { wechatAccounts, activeWechatAccountId } = this.settings;
        return wechatAccounts.find(account => account.id === activeWechatAccountId);
    }

    getWechatAccountById(accountId: string): WechatAccount | undefined {
        return this.settings.wechatAccounts.find(account => account.id === accountId);
    }
}