/**
 * CSS 主题系统类型定义
 * 参考 mdnice 的纯 CSS 主题方案
 */

/** 主题来源类型 */
export enum ThemeSource {
    BUILTIN = 'builtin',   // 内置主题
    REMOTE = 'remote',     // 云端主题（GitHub）
    LOCAL = 'local',       // 本地自定义主题
}

/** CSS 主题定义 */
export interface CSSTheme {
    /** 唯一标识 */
    id: string;
    /** 显示名称 */
    name: string;
    /** 主题描述 */
    description: string;
    /** 主题来源 */
    source: ThemeSource;
    /** CSS 内容 */
    css: string;
    /** 远程 URL（仅 remote 类型） */
    remoteUrl?: string;
    /** 本地文件路径（仅 local 类型） */
    localPath?: string;
    /** 作者 */
    author?: string;
    /** 是否可见 */
    isVisible: boolean;
}

/** 云端主题索引项 */
export interface RemoteThemeIndex {
    id: string;
    name: string;
    description: string;
    author: string;
    /** CSS 文件的 raw URL */
    cssUrl: string;
    /** 预览图 URL（可选） */
    previewUrl?: string;
}

/** 主题管理器设置（从 MPSettings 中提取主题相关字段，避免重复定义） */
export interface ThemeSettings {
    activeThemeId: string;
    fontFamily: string;
    fontSize: number;
    customFonts: FontOption[];
    downloadedRemoteThemes: CSSTheme[];
    remoteThemeIndexCache?: RemoteThemeIndex[];
    remoteIndexLastUpdate?: number;
}

/** 字体选项 */
export interface FontOption {
    value: string;
    label: string;
    isPreset?: boolean;
}

/** 默认字体列表 */
export const DEFAULT_FONTS: FontOption[] = [
    {
        value: 'Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, "PingFang SC", Cambria, Cochin, Georgia, Times, "Times New Roman", serif',
        label: '默认字体',
        isPreset: true,
    },
    { value: 'SimSun, "宋体", serif', label: '宋体', isPreset: true },
    { value: 'SimHei, "黑体", sans-serif', label: '黑体', isPreset: true },
    { value: 'KaiTi, "楷体", serif', label: '楷体', isPreset: true },
    { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '雅黑', isPreset: true },
];

/** GitHub 云端主题仓库配置 */
export const REMOTE_THEME_CONFIG = {
    /** 主题索引 JSON 的 raw URL */
    indexUrl: 'https://raw.githubusercontent.com/user/mp-publisher-themes/main/index.json',
    /** 索引缓存有效期（24小时） */
    cacheExpiry: 24 * 60 * 60 * 1000,
};
