import { App, Plugin } from 'obsidian';
import { Logger } from '../utils/logger';

/**
 * 发布进度指示器
 * 显示在页面右上角，展示发布进度和状态
 */
export class ProgressIndicator {
    private container: HTMLElement | null = null;
    private progressBar: HTMLElement | null = null;
    private statusText: HTMLElement | null = null;
    private logger: Logger;
    private isVisible = false;
    private app: App;

    constructor(app: App) {
        this.app = app;
        this.logger = Logger.getInstance();
    }

    /**
     * 显示进度指示器
     * @param totalSteps 总步骤数（例如：图片数量 + 1 个发布步骤）
     */
    show(totalSteps: number = 3, title: string = '正在发布...'): void {
        if (this.isVisible) {
            this.hide();
        }

        // 创建容器
        this.container = document.createElement('div');
        this.container.className = 'mp-progress-indicator';
        this.container.setAttribute('aria-live', 'polite');

        // 标题
        const titleEl = document.createElement('div');
        titleEl.className = 'mp-progress-title';
        titleEl.textContent = title;
        this.container.appendChild(titleEl);

        // 进度条容器
        const progressContainer = document.createElement('div');
        progressContainer.className = 'mp-progress-bar-container';

        // 进度条
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'mp-progress-bar';
        this.progressBar.style.width = '0%';
        progressContainer.appendChild(this.progressBar);

        this.container.appendChild(progressContainer);

        // 状态文本
        this.statusText = document.createElement('div');
        this.statusText.className = 'mp-progress-status';
        this.statusText.textContent = '初始化...';
        this.container.appendChild(this.statusText);

        // 警告提示
        const warningEl = document.createElement('div');
        warningEl.className = 'mp-progress-warning';
        warningEl.innerHTML = '<span class="warning-icon">⚠️</span> 请勿关闭此页面';
        this.container.appendChild(warningEl);

        // 添加到页面
        document.body.appendChild(this.container);
        this.isVisible = true;

        // 初始化进度
        this.updateProgress(0, totalSteps);
    }

    /**
     * 更新进度
     * @param currentStep 当前步骤（从 0 开始）
     * @param totalSteps 总步骤数
     * @param statusText 状态文本（可选）
     */
    updateProgress(currentStep: number, totalSteps: number, statusText?: string): void {
        if (!this.container || !this.progressBar || !this.statusText) {
            return;
        }

        const percentage = Math.min(100, Math.round((currentStep / totalSteps) * 100));
        this.progressBar.style.width = `${percentage}%`;

        if (statusText) {
            this.statusText.textContent = statusText;
        } else {
            // 根据进度自动设置状态文本
            if (currentStep === 0) {
                this.statusText.textContent = '正在处理图片...';
            } else if (currentStep < totalSteps) {
                this.statusText.textContent = `处理中 ${currentStep}/${totalSteps}...`;
            } else {
                this.statusText.textContent = '正在发布到微信公众号...';
            }
        }

        this.logger.debug(`进度更新：${currentStep}/${totalSteps} (${percentage}%)`);
    }

    /**
     * 更新状态文本
     * @param text 状态文本
     */
    updateStatus(text: string): void {
        if (this.statusText) {
            this.statusText.textContent = text;
            this.logger.debug(`状态更新：${text}`);
        }
    }

    /**
     * 隐藏进度指示器
     */
    hide(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.progressBar = null;
            this.statusText = null;
            this.isVisible = false;
            this.logger.debug('进度指示器已隐藏');
        }
    }

    /**
     * 显示成功状态
     * @param message 成功消息
     */
    showSuccess(message: string = '发布成功！'): void {
        if (!this.container || !this.progressBar || !this.statusText) {
            return;
        }

        this.progressBar.style.width = '100%';
        this.progressBar.classList.add('success');
        this.statusText.textContent = message;
        this.statusText.classList.add('success');

        // 1.5 秒后自动隐藏
        setTimeout(() => this.hide(), 1500);
    }

    /**
     * 显示错误状态
     * @param message 错误消息
     */
    showError(message: string = '发布失败'): void {
        if (!this.container || !this.progressBar || !this.statusText) {
            return;
        }

        this.progressBar.classList.add('error');
        this.statusText.textContent = message;
        this.statusText.classList.add('error');

        // 错误时不自动隐藏，让用户看到
    }
}

// 单例实例
let progressIndicatorInstance: ProgressIndicator | null = null;

/**
 * 获取进度指示器单例
 */
export function getProgressIndicator(app: App): ProgressIndicator {
    if (!progressIndicatorInstance) {
        progressIndicatorInstance = new ProgressIndicator(app);
    }
    return progressIndicatorInstance;
}
