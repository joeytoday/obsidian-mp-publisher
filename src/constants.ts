/**
 * 插件常量定义
 */
export const CONSTANTS = {
    // 资源文件夹后缀
    DEFAULT_ASSETS_SUFFIX: '__assets',

    // 图片扩展名列表
    IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'],

    // DOM 选择器
    SELECTORS: {
        FILE_EXPLORER: '.nav-files-container, .workspace-leaf-content[data-type="file-explorer"]',
        DOCUMENT_WITH_IMAGES: '.has-images',
        IMAGE_CONTAINER: '.document-images-container',
        EXPAND_INDICATOR: '.image-expand-indicator'
    },

    // DOM 类名和 ID
    STYLE_ELEMENT_ID: 'mp-preview-styles',
    CONTAINER_CLASS: 'document-images-container',
    INDICATOR_CLASS: 'image-expand-indicator',
    HAS_IMAGES_CLASS: 'has-images',

    // 防抖延迟（毫秒）
    DEBOUNCE_DELAY: 100,

    // 事件名称
    EVENTS: {
        REFRESH_CONTAINERS: 'mp-preview:refresh-containers',
        TOGGLE_ALL_CONTAINERS: 'mp-preview:toggle-all-containers'
    },

    // MIME 类型与文件扩展名的双向映射
    MIME_EXTENSIONS: {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'image/webp': 'webp',
        'image/bmp': 'bmp',
    } as Record<string, string>,

    /** 根据扩展名获取 MIME 类型 */
    getMimeType(extension: string): string {
        const normalized = extension.replace(/^\./, '').toLowerCase();
        for (const [mime, ext] of Object.entries(this.MIME_EXTENSIONS)) {
            if (ext === normalized || (normalized === 'jpeg' && ext === 'jpg')) {
                return mime;
            }
        }
        return 'application/octet-stream';
    },
};
