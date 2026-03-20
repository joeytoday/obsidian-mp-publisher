import { App, Notice, requestUrl, TFile } from 'obsidian';
import MPPlugin from '../main';
import { getOrCreateMetadata, isImageUploaded, addImageMetadata, updateMetadata, updateDraftMetadata } from '../types/metadata';
import { Logger } from '../utils/logger';
import { getProgressIndicator } from '../ui/ProgressIndicator';

// 微信素材类型接口
interface WechatMaterial {
    media_id: string;
    name: string;
    url: string;
    update_time: string;
}

// 封面图缓存接口
interface CoverImageCache {
    materials: WechatMaterial[];
    lastUpdate: number;
}

// 访问令牌缓存接口
interface TokenCache {
    token: string;
    expireTime: number;
}

export class WechatPublisher {
    private app: App;
    private plugin: MPPlugin;
    private logger: Logger;

    constructor(app: App, plugin: MPPlugin) {
        this.app = app;
        this.plugin = plugin;
        this.logger = Logger.getInstance(app);
    }

    // 获取微信素材库列表（支持分页）
    async getWechatMaterials(
        page: number = 0,
        pageSize: number = 20
    ): Promise<{ items: WechatMaterial[], totalCount: number }> {
        try {
            const materialsResponse = await this.requestWithTokenRetry(async (token) => {
                return requestUrl({
                    url: `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${token}`,
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'image',
                        offset: page * pageSize,
                        count: pageSize
                    })
                });
            });

            if (materialsResponse.json.errcode && materialsResponse.json.errcode !== 0) {
                this.handleWechatError(materialsResponse.json);
                return { items: [], totalCount: 0 };
            }

            const items = materialsResponse.json.item || [];
            const totalCount = materialsResponse.json.total_count || 0;

            // 更新缓存
            const cacheKey = `wechat_material_cache_page_${page}`;
            const cacheData = {
                items: items,
                totalCount: totalCount,
                lastUpdate: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));

            return { items, totalCount };
        } catch (error) {
            this.logger.error('获取微信素材库时出错:', error);
            new Notice('获取微信素材库时出错，请检查网络或配置');
            return { items: [], totalCount: 0 };
        }
    }

    // 上传图片到微信公众号（使用uploadimg接口）
    async uploadImageToWechat(imageData: ArrayBuffer, fileName: string): Promise<string> {
        try {
            const result = await this.uploadImageAndGetUrl(imageData, fileName);

            if (!result) return '';

            const mediaId = result.media_id;

            if (mediaId) {
                // 获取现有的上传图片缓存
                const uploadedImagesCache = localStorage.getItem('wechat_uploaded_images_cache');
                const uploadedImages = uploadedImagesCache ? JSON.parse(uploadedImagesCache) : {};

                // 添加新上传的图片
                uploadedImages[mediaId] = {
                    url: result.url,
                    name: fileName,
                    uploadTime: Date.now()
                };

                // 更新缓存
                localStorage.setItem('wechat_uploaded_images_cache', JSON.stringify(uploadedImages));
            }

            return mediaId;
        } catch (error) {
            this.logger.error('上传图片到微信时出错:', error);
            // Notice is handled by uploadImageAndGetUrl or handleWechatError
            return '';
        }
    }

    // 获取访问令牌（带缓存）
    async getAccessToken(forceRefresh: boolean = false): Promise<string> {
        // 1. 检查缓存
        if (!forceRefresh) {
            try {
                const cacheData = localStorage.getItem('wechat_token_cache');
                const cache: TokenCache = cacheData ? JSON.parse(cacheData) : null;

                // 如果缓存存在且未过期（有效期为110分钟，微信令牌有效期为2小时）
                if (cache && Date.now() < cache.expireTime) {
                    this.logger.debug("使用缓存的访问令牌");
                    return cache.token;
                }
            } catch (e) {
                this.logger.error('读取令牌缓存失败:', e);
            }
        }

        // 2. 重新获取访问令牌 (带重试机制)
        const maxRetries = 3;
        const initialDelay = 1000; // 1 second

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = initialDelay * Math.pow(2, attempt - 1);
                    this.logger.warn(`获取令牌尝试第 ${attempt} 次重试，正在等待 ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                this.logger.debug(`开始获取微信访问令牌${forceRefresh ? ' (强制刷新)' : ''}`);

                // 使用 stable_token 接口 (POST)
                const tokenResponse = await requestUrl({
                    url: 'https://api.weixin.qq.com/cgi-bin/stable_token',
                    method: 'POST',
                    body: JSON.stringify({
                        grant_type: 'client_credential',
                        appid: this.plugin.settings.wechatAppId,
                        secret: this.plugin.settings.wechatAppSecret,
                        force_refresh: forceRefresh
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!tokenResponse.json.access_token) {
                    this.logger.error("获取微信访问令牌业务失败: ", tokenResponse.json);
                    const errcode = tokenResponse.json.errcode;
                    const errmsg = tokenResponse.json.errmsg || '未知错误';
                    
                    // 业务失败通常不需要重试，除非是特定错误
                    if (attempt === maxRetries) {
                        // 针对 IP 白名单错误提供明确的提示
                        if (errcode === 40164 || errmsg?.includes('not in whitelist')) {
                            const ipMatch = errmsg?.match(/(\d+\.\d+\.\d+\.\d+)/);
                            const ip = ipMatch ? ipMatch[1] : '当前IP';
                            new Notice(`IP 白名单错误：${ip} 不在微信公众平台白名单中。请登录微信公众平台 → 设置与开发 → 基本配置 → IP 白名单，添加此 IP 地址。`, 8000);
                        } else if (errcode === 41002 || errmsg?.includes('appid missing')) {
                            new Notice('AppID 为空，请在插件设置中填写微信公众号的 AppID。');
                        } else if (errcode === 40013) {
                            new Notice('AppID 无效，请检查插件设置中的 AppID 是否正确。');
                        } else if (errcode === 40125 || errmsg?.includes('secret')) {
                            new Notice('AppSecret 无效，请检查插件设置中的 AppSecret 是否正确。');
                        } else {
                            new Notice(`获取微信访问令牌失败: ${errmsg}`);
                        }
                        return '';
                    }
                    continue; // 尝试重试
                }

                const accessToken = tokenResponse.json.access_token;

                // 更新缓存（110分钟 = 6600000毫秒）
                const expireTime = Date.now() + 6600000;
                const newCache: TokenCache = {
                    token: accessToken,
                    expireTime: expireTime
                };
                localStorage.setItem('wechat_token_cache', JSON.stringify(newCache));

                return accessToken;
            } catch (error: any) {
                this.logger.error(`获取微信访问令牌网络错误 (尝试 ${attempt + 1}/${maxRetries + 1}):`, error);

                if (attempt === maxRetries) {
                    const errorMsg = error.message || String(error);
                    if (errorMsg.includes('ERR_CONNECTION_CLOSED') || errorMsg.includes('net::')) {
                        new Notice('获取微信令牌失败: 网络连接被关闭，请检查是否启用了代理或网络环境不稳定');
                    } else {
                        new Notice('获取微信访问令牌时出错，请检查网络设置');
                    }
                    return '';
                }
                // 继续下一次重试
            }
        }
        return '';
    }

    // 上传单个图片到微信公众号并获取URL
    async uploadImageAndGetUrl(
        imageData: ArrayBuffer,
        fileName: string
    ): Promise<{ url: string; media_id: string } | null> {
        try {
            const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
            const blob = new Blob([imageData]);

            const formDataHeader = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`;
            const formDataFooter = `\r\n--${boundary}--`;

            const headerArray = new TextEncoder().encode(formDataHeader);
            const footerArray = new TextEncoder().encode(formDataFooter);

            const combinedBuffer = new Uint8Array(headerArray.length + imageData.byteLength + footerArray.length);
            combinedBuffer.set(headerArray, 0);

            const imageUint8Array = new Uint8Array(imageData);
            combinedBuffer.set(imageUint8Array, headerArray.length);
            combinedBuffer.set(footerArray, headerArray.length + imageData.byteLength);

            const response = await this.requestWithTokenRetry(async (token) => {
                return requestUrl({
                    url: `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`,
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${boundary}`
                    },
                    body: combinedBuffer.buffer
                });
            });

            this.logger.debug(`response: ${JSON.stringify(response)}`);

            if (response.json.errcode && response.json.errcode !== 0) {
                this.handleWechatError(response.json);
                throw new Error(response.json.errmsg);
            }

            return {
                url: response.json.url,
                media_id: response.json.media_id
            };
        } catch (error) {
            this.logger.error('上传图片失败:', error);
            // Notice is handled in handleWechatError or specifically here if it's a network error not caught by handleWechatError
            if (error instanceof Error && !error.message.includes('errcode')) {
                new Notice('上传图片失败，请检查网络或配置');
            }
            return null;
        }
    }

    // 处理文档中的图片
    async processDocumentImages(
        content: string,
        file: TFile,
        onProgress?: (current: number, total: number, imageName?: string) => void
    ): Promise<string> {
        try {
            if (!file.parent) {
                throw new Error('文件必须在文件夹中');
            }

            // 获取或创建元数据（存储在插件 data.json 中，不再生成文件系统上的文件夹）
            const metadata = getOrCreateMetadata(this.plugin, file);

            // 使用 innerHTML 解析 HTML，避免 DOMParser + XMLSerializer 破坏已内联的样式结构
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;

            // 处理列表（清理空项、空段落、添加 margin: 0）
            this.processLists(tempDiv);

            // 获取所有图片元素
            const images = tempDiv.querySelectorAll('img');
            const totalImages = images.length;
            this.logger.debug(`发现 ${totalImages} 张图片需要处理`);

            // 处理每个图片
            let processedCount = 0;
            for (const img of Array.from(images)) {
                const src = img.getAttribute('src');
                if (!src) continue;

                // 更新进度
                if (onProgress) {
                    const fileName = src.split('/').pop() || `图片 ${processedCount + 1}`;
                    onProgress(processedCount, totalImages, fileName);
                }

                // 处理图片并获取微信 URL (现在也处理 http 图片以供自动上传)
                const imageUrl = await this.processImage(src, file, metadata);
                if (!imageUrl) continue;

                // 更新图片 src 为微信 URL
                img.setAttribute('src', imageUrl);
                processedCount++;
            }

            // 再次处理列表（处理图片后可能产生新的空行）
            this.processLists(tempDiv);

            // 使用 innerHTML 输出，保持与输入一致的 HTML 结构，不引入额外的 xmlns 等属性
            return tempDiv.innerHTML;
        } catch (error) {
            this.logger.error('处理文档图片时出错:', error);
            throw error;
        }
    }

    /**
     * 统一处理所有列表相关逻辑
     */
    private processLists(container: HTMLElement): void {
        // 1. 清理空的列表项
        this.cleanEmptyListItems(container);

        // 2. 清理列表前后的空段落
        this.cleanEmptyParagraphsAroundLists(container);

        // 3. 给列表添加内联样式（margin: 0）
        container.querySelectorAll('ul, ol').forEach(list => {
            const el = list as HTMLElement;
            const currentStyle = el.getAttribute('style') || '';
            if (!currentStyle.includes('margin')) {
                el.setAttribute('style', currentStyle + 'margin: 0;');
            }
        });

        // 4. 清理所有 <li> 的 margin，避免微信公众号后台产生额外空行
        container.querySelectorAll('li').forEach(li => {
            const el = li as HTMLElement;
            const currentStyle = el.getAttribute('style') || '';
            if (currentStyle) {
                // 移除 margin 相关属性
                const newStyle = currentStyle
                    .split(';')
                    .filter(prop => {
                        const propName = prop.split(':')[0].trim().toLowerCase();
                        return !propName.startsWith('margin');
                    })
                    .join(';');
                el.setAttribute('style', newStyle);
            }
        });
    }

    /**
     * 清理列表前后的无效空行（空的 <p> 标签）
     */
    private cleanEmptyParagraphsAroundLists(container: HTMLElement): void {
        const isEmptyElement = (el: Element | null): boolean => {
            if (!el) return false;
            const tagName = el.tagName.toLowerCase();
            
            // 只检查 <p> 标签
            if (tagName !== 'p') return false;
            
            const text = el.textContent?.trim() || '';
            if (text !== '') return false;
            
            // 检查是否有非文本内容
            const hasNonTextContent = el.querySelector('img, video, iframe, audio');
            return !hasNonTextContent;
        };

        // 收集需要移除的元素
        const toRemove: Element[] = [];

        container.querySelectorAll('ul, ol').forEach(list => {
            // 检查列表前的空元素
            let prev = list.previousElementSibling;
            while (prev && isEmptyElement(prev)) {
                toRemove.push(prev);
                prev = prev.previousElementSibling;
            }

            // 检查列表后的空元素
            let next = list.nextElementSibling;
            while (next && isEmptyElement(next)) {
                toRemove.push(next);
                next = next.nextElementSibling;
            }
        });

        // 移除重复元素并删除
        [...new Set(toRemove)].forEach(el => el.remove());
    }

    /**
     * 清理空的列表项
     */
    private cleanEmptyListItems(container: HTMLElement): void {
        // 从下往上遍历，避免删除元素影响后续索引
        const allLis = Array.from(container.querySelectorAll('li'));
        
        this.logger.debug('[cleanEmptyListItems] 开始清理，原始 li 数量:', allLis.length);
        
        for (let i = allLis.length - 1; i >= 0; i--) {
            const li = allLis[i];
            
            // 获取纯文本内容
            const text = li.textContent?.trim() || '';
            
            // 检查是否只包含 ProseMirror 的 trailingBreak 或空白
            const hasOnlyBreak = li.querySelector(':scope > *') !== null && 
                                 text === '' &&
                                 li.innerHTML.trim().includes('ProseMirror-trailingBreak');
            
            // 如果文本为空，检查是否只包含空白标签
            if (text === '' || hasOnlyBreak) {
                const innerHTML = li.innerHTML.trim();
                // 移除所有 HTML 标签后检查
                const contentOnly = innerHTML.replace(/<[^>]*>/g, '').trim();
                this.logger.debug('[cleanEmptyListItems] 检查空 li - innerHTML:', innerHTML, 'contentOnly:', contentOnly, 'hasOnlyBreak:', hasOnlyBreak);
                if (contentOnly === '' || hasOnlyBreak) {
                    this.logger.debug('[cleanEmptyListItems] 移除空 li');
                    li.remove();
                }
            } else {
                this.logger.debug('[cleanEmptyListItems] 保留 li - text:', text.substring(0, 30));
            }
        }
        
        const remainingLis = container.querySelectorAll('li').length;
        this.logger.debug('[cleanEmptyListItems] 清理后 li 数量:', remainingLis);
    }

    // 处理单个图片的辅助函数
    async processImage(
        imagePath: string,
        file: TFile,
        metadata: any,
    ): Promise<string | null> {
        try {
            // 1. 处理 Base64 Data URL (通常是公式转换生成的)
            if (imagePath.startsWith('data:image/')) {
                const match = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);
                if (!match) return null;

                const ext = match[1];
                const base64Data = match[2];
                const fileName = `formula_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

                // 将 base64 转换为 ArrayBuffer
                const binaryString = window.atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const arrayBuffer = bytes.buffer;

                this.logger.debug(`上传生成的图片: ${fileName}`);
                const uploadResult = await this.uploadImageAndGetUrl(arrayBuffer, fileName);
                return uploadResult ? uploadResult.url : null;
            }

            // 2. 处理网络图片 (http/https)
            if (imagePath.startsWith('http')) {
                // 检查缓存
                let imageMetadata = isImageUploaded(metadata, imagePath);
                if (!imageMetadata) {
                    this.logger.debug(`下载并上传网络图片: ${imagePath}`);
                    try {
                        const response = await requestUrl({ url: imagePath });
                        if (response.status !== 200) {
                            this.logger.error(`下载图片失败: ${imagePath}, status: ${response.status}`);
                            return null;
                        }

                        const fileName = imagePath.split('/').pop()?.split('?')[0] || `web_image_${Date.now()}.png`;
                        const uploadResult = await this.uploadImageAndGetUrl(response.arrayBuffer, fileName);

                        if (!uploadResult) return null;

                        imageMetadata = {
                            fileName: imagePath, // 使用完整URL作为Key来缓存
                            url: uploadResult.url,
                            media_id: uploadResult.media_id,
                            uploadTime: Date.now()
                        };
                        addImageMetadata(metadata, imagePath, imageMetadata);
                        await updateMetadata(this.plugin, file, metadata);
                    } catch (e) {
                        this.logger.error(`处理网络图片异常: ${imagePath}`, e);
                        return null;
                    }
                }
                return imageMetadata.url;
            }

            // 3. 处理常规文件路径
            // 从路径中获取文件名
            let fileName = imagePath.split('/').pop();
            if (!fileName) return null;

            // 如果文件名包含查询参数，去除它们
            if (fileName.includes('?')) {
                fileName = fileName.split('?')[0];
            }

            // 检查图片是否已上传
            let imageMetadata = isImageUploaded(metadata, fileName);

            if (!imageMetadata) {
                // 将app://格式的URL转换为vault相对路径
                const linkedFile = this.plugin.app.metadataCache.getFirstLinkpathDest(fileName, file.path);
                if (!linkedFile || !(linkedFile instanceof TFile)) {
                    this.logger.error(`无法找到图片文件: ${fileName}`);
                    return null;
                }

                // 读取图片数据
                const arrayBuffer = await this.plugin.app.vault.readBinary(linkedFile);

                // 上传图片到微信
                const uploadResult = await this.uploadImageAndGetUrl(arrayBuffer, fileName);

                if (!uploadResult) return null;

                // 保存图片元数据
                imageMetadata = {
                    fileName,
                    url: uploadResult.url,
                    media_id: uploadResult.media_id,
                    uploadTime: Date.now()
                };
                addImageMetadata(metadata, fileName, imageMetadata);
                await updateMetadata(this.plugin, file, metadata);
            }

            return imageMetadata.url;
        } catch (error) {
            this.logger.error('处理图片时出错:', error);
            return null;
        }
    }

    // 发布到微信公众号
    async publishToWechat(
        title: string,
        content: string,
        thumb_media_id: string,
        file: TFile
    ): Promise<boolean> {
        try {
            // 获取进度指示器
            const progress = getProgressIndicator(this.app);
            
            // 使用 innerHTML 统计图片数量，避免 DOMParser 破坏已内联的样式结构
            const countDiv = document.createElement('div');
            countDiv.innerHTML = content;
            const imageCount = countDiv.querySelectorAll('img').length;
            
            // 显示进度指示器（图片数量 + 1 个发布步骤）
            const totalSteps = imageCount + 1;
            progress.show(totalSteps, '正在发布到微信公众号...');
            
            // 处理文档中的图片（上传到微信并替换 src）
            let processedCount = 0;
            let processedContent = await this.processDocumentImages(
                content, 
                file, 
                (current, total, imageName) => {
                    processedCount = current;
                    progress.updateProgress(
                        current, 
                        totalSteps, 
                        `正在上传图片 ${current + 1}/${total}: ${imageName || ''}`.trim()
                    );
                }
            );

            // 注意：不再调用 cleanHtmlForWechat，因为传入的 content 已经是
            // 通过 CopyManager.getInlinedHtml 生成的干净 HTML（已内联样式、已清理属性）

            // 获取元数据
            const metadata = getOrCreateMetadata(this.plugin, file);

            // 准备更新数据
            let updateData = {
                title,
                content: processedContent,
                media_id: metadata.draft?.media_id,
                item: metadata.draft?.item,
            };

            // 使用带重试机制的请求
            let response = await this.requestWithTokenRetry(async (token) => {
                if (metadata.draft?.media_id) {
                    // 更新现有草稿
                    return requestUrl({
                        url: `https://api.weixin.qq.com/cgi-bin/draft/update?access_token=${token}`,
                        method: 'POST',
                        body: JSON.stringify({
                            media_id: metadata.draft.media_id,
                            index: 0,
                            articles: {
                                title,
                                content: processedContent,
                                thumb_media_id,
                                author: '',
                                digest: '',
                                show_cover_pic: thumb_media_id ? 1 : 0,
                                content_source_url: '',
                                need_open_comment: 0,
                                only_fans_can_comment: 0
                            }
                        })
                    });
                } else {
                    // 创建新草稿
                    return requestUrl({
                        url: `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`,
                        method: 'POST',
                        body: JSON.stringify({
                            articles: [{
                                title,
                                content: processedContent,
                                thumb_media_id,
                                author: '',
                                digest: '',
                                show_cover_pic: thumb_media_id ? 1 : 0,
                                content_source_url: '',
                                need_open_comment: 0,
                                only_fans_can_comment: 0
                            }]
                        })
                    });
                }
            });

            this.logger.debug(`response: ${JSON.stringify(response)}`);

            // 如果是 40007 错误且我们之前尝试更新现有草稿，可能是草稿 ID 已失效，清除它并重试一次创建新草稿
            if (response.json && response.json.errcode === 40007 && metadata.draft?.media_id) {
                this.logger.warn('草稿 media_id 已失效，尝试重新创建新草稿');
                metadata.draft.media_id = ''; // 清除失效的 ID
                
                response = await this.requestWithTokenRetry(async (token) => {
                    return requestUrl({
                        url: `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`,
                        method: 'POST',
                        body: JSON.stringify({
                            articles: [{
                                title,
                                content: processedContent,
                                thumb_media_id,
                                author: '',
                                digest: '',
                                show_cover_pic: thumb_media_id ? 1 : 0,
                                content_source_url: '',
                                need_open_comment: 0,
                                only_fans_can_comment: 0
                            }]
                        })
                    });
                });
                this.logger.debug(`retry response: ${JSON.stringify(response)}`);
            }

            if (response.status === 200) {
                // 检查业务错误码
                if (response.json.errcode && response.json.errcode !== 0) {
                    this.handleWechatError(response.json);
                    return false;
                }

                // 成功，更新元数据
                if (response.json.media_id) {
                    updateData.media_id = response.json.media_id;
                }
                if (response.json.item) {
                    updateData.item = response.json.item;
                }

                updateDraftMetadata(metadata, updateData);
                await updateMetadata(this.plugin, file, metadata);

                // 显示成功状态
                progress.showSuccess('发布成功！');
                new Notice('成功发布到微信公众号草稿箱');
                return true;
            } else {
                throw new Error(`发布失败: HTTP ${response.status}`);
            }
        } catch (error: any) {
            this.logger.error('发布到微信时出错:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`发布到微信时出错: ${errorMessage}`);
            return false;
        }
    }

    // 辅助方法：执行带重试的请求
    private async requestWithTokenRetry(requestFn: (token: string) => Promise<any>): Promise<any> {
        const maxRetries = 2;
        const initialDelay = 1000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = initialDelay * Math.pow(2, attempt - 1);
                    this.logger.warn(`请求尝试第 ${attempt} 次重试，正在等待 ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const accessToken = await this.getAccessToken();
                if (!accessToken) throw new Error("无法获取 Access Token，请检查：1. AppID 和 AppSecret 是否正确；2. 当前 IP 是否已添加到微信公众平台白名单（设置与开发 → 基本配置 → IP 白名单）");

                let response = await requestFn(accessToken);

                // 处理 Token 失效
                if (response.json && [40001, 40014, 42001].includes(response.json.errcode)) {
                    this.logger.warn(`Token失效 (${response.json.errcode})，尝试刷新并重试...`);
                    const newToken = await this.getAccessToken(true);
                    if (newToken) {
                        response = await requestFn(newToken);
                    }
                }

                return response;
            } catch (error: any) {
                const errorMsg = error.message || String(error);
                const isNetworkError = errorMsg.includes('ERR_CONNECTION_CLOSED') || errorMsg.includes('net::');

                if (isNetworkError && attempt < maxRetries) {
                    this.logger.error(`微信接口网络错误 (尝试 ${attempt + 1}/${maxRetries + 1}):`, error);
                    continue; // 重试
                }

                this.logger.error(`微信接口请求失败:`, error);
                throw error;
            }
        }
    }

    // 统一处理微信API错误
    private handleWechatError(responseJson: any) {
        const errcode = responseJson.errcode;
        const errmsg = responseJson.errmsg;

        let message = `微信API错误 (${errcode}): ${errmsg}`;

        // 根据错误码提供更友好的提示
        switch (errcode) {
            case 40001:
            case 40014:
            case 42001:
                message = "Access Token 已过期或无效，请尝试重新登录或检查配置。";
                break;
            case 41002:
                message = "AppID 为空，请在插件设置中填写微信公众号的 AppID。";
                break;
            case 40013:
                message = "AppID 无效，请检查插件设置中的 AppID。";
                break;
            case 40007:
                message = "无效的媒体文件 ID (media_id)。这可能是因为素材已过期、被删除，或草稿 ID 已失效。如果是封面图问题，请尝试重新选择封面图。";
                break;
            case 40003:
                message = "OpenID 无效，请确保用户已关注公众号。";
                break;
            case 45009:
                message = "接口调用超过限额，请明天再试。";
                break;
            case 48001:
                message = "接口功能未授权，请确认公众号是否有相关权限。";
                break;
            case 40009:
                message = "图片尺寸太大，请压缩图片后重试。";
                break;
            case 41005:
                message = "缺少多媒体文件数据，请检查上传的图片是否有效。";
                break;
            case 40164:
                const ipMatch = errmsg?.match(/\d+\.\d+\.\d+\.\d+/);
                const ip = ipMatch ? ipMatch[0] : '当前IP';
                message = `IP 白名单错误：${ip} 不在微信公众平台白名单中。请登录微信公众平台 → 设置与开发 → 基本配置 → IP 白名单，添加此 IP 地址。`;
                break;
        }

        this.logger.error(message);
        new Notice(message, 5000); // 显示5秒
    }
}
