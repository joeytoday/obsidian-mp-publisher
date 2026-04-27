
import { TFile } from 'obsidian';

// 图片元数据接口
export interface ImageMetadata {
    fileName: string;
    url: string;
    media_id: string;
    uploadTime: number;
}

// 草稿元数据接口
export interface DraftMetadata {
    media_id: string;
    item: Array<{
        index: number;
        ad_count: number;
    }>;
    title: string;
    content: string;
    updateTime: number;
}

// 文档元数据接口
export interface DocumentMetadata {
    images: { [key: string]: ImageMetadata }; // key 是图片文件名
    draft?: DraftMetadata;
    lastUsedAt?: number;
}

/**
 * 获取文档的元数据（从插件 data.json 中读取，不再生成文件系统上的文件夹和文件）
 * @param plugin 插件实例（需要有 settingsManager）
 * @param file 当前文档文件
 */
export function getOrCreateMetadata(
    plugin: { metadataStore: { get(filePath: string): DocumentMetadata | null } },
    file: TFile,
): DocumentMetadata {
    const metadata = plugin.metadataStore.get(file.path);
    if (metadata) {
        touchMetadata(metadata);
        return metadata;
    }

    // 返回新的空元数据对象
    return { images: {}, lastUsedAt: Date.now() };
}

/**
 * 更新文档的元数据（保存到插件 data.json 中）
 * @param plugin 插件实例
 * @param file 当前文档文件
 * @param metadata 要保存的元数据
 */
export async function updateMetadata(
    plugin: { metadataStore: { set(filePath: string, metadata: DocumentMetadata): Promise<void> } },
    file: TFile,
    metadata: DocumentMetadata,
): Promise<void> {
    touchMetadata(metadata);
    await plugin.metadataStore.set(file.path, metadata);
}

// 检查图片是否已上传
export function isImageUploaded(metadata: DocumentMetadata, fileName: string): ImageMetadata | null {
    return metadata.images[fileName] || null;
}

// 添加图片元数据
export function addImageMetadata(metadata: DocumentMetadata, fileName: string, imageData: ImageMetadata): void {
    metadata.images[fileName] = imageData;
}

// 更新草稿元数据
export function updateDraftMetadata(metadata: DocumentMetadata, draftData: any): void {
    metadata.draft = {
        media_id: draftData.media_id,
        item: draftData.item,
        title: draftData.title,
        content: draftData.content,
        updateTime: Date.now()
    };
    touchMetadata(metadata);
}

// 更新元数据最近使用时间
export function touchMetadata(metadata: DocumentMetadata): void {
    metadata.lastUsedAt = Date.now();
}
