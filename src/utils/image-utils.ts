import { requestUrl } from 'obsidian';

/**
 * 获取图片数据（支持 http/https 和 app:// 协议）
 * 统一处理图片获取逻辑，避免 copyManager 和 wechat.ts 重复实现
 */
export async function fetchImageAsArrayBuffer(src: string): Promise<ArrayBuffer | null> {
    try {
        if (src.startsWith('http://') || src.startsWith('https://')) {
            const response = await requestUrl({ url: src });
            if (response.status !== 200) return null;
            return response.arrayBuffer;
        }

        // app:// 等本地协议：使用 window.fetch
        // 不使用 requestUrl 因为它不支持 app:// 协议
        const response = await window.fetch(src);
        if (!response.ok) return null;
        return await response.arrayBuffer();
    } catch (error) {
        console.error(`获取图片失败: ${src}`, error);
        return null;
    }
}

/**
 * 将 ArrayBuffer 转为 base64 data URL
 */
export function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mimeType};base64,${window.btoa(binary)}`;
}
