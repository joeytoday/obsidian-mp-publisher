import { Plugin, Notice, TFile, MarkdownView } from 'obsidian';
import { MPView, VIEW_TYPE_MP } from './view';
import { ThemeManager } from './themeManager';
import { ThemeManagerView, VIEW_TYPE_THEME_MANAGER } from './themeManagerView';
import { ThemePreviewView, VIEW_TYPE_THEME_PREVIEW } from './themePreviewView';
import { ThemeCSSView, VIEW_TYPE_THEME_CSS } from './themeCSSView';
import { SettingsManager } from './settings/settings';
import { MPConverter } from './converter';
import { DonateManager } from './donateManager';
import { MPSettingTab } from './settings/MPSettingTab';
import { WechatPublisher } from './publisher/wechat';
import { showPublishModal } from './publisher';
import { Logger } from './utils/logger';
import { DocumentMetadataStore } from './storage/documentMetadataStore';

export default class MPPublisherPlugin extends Plugin {
  settingsManager!: SettingsManager;
  themeManager!: ThemeManager;
  wechatPublisher!: WechatPublisher;
  logger!: Logger;
  metadataStore!: DocumentMetadataStore;
  showPublishModal = showPublishModal;

  // 为了兼容性，添加 settings getter
  get settings() {
    return this.settingsManager.getSettings();
  }

  async onload() {
    // 初始化日志工具
    this.logger = Logger.getInstance(this.app);
    this.logger.info('加载 MP Publisher 插件');

    // 初始化设置管理器
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();

    // 初始化文档元数据存储并迁移旧数据
    await this.initializeMetadataStore();

    // 设置调试模式
    this.logger.setDebugMode(this.settings.debugMode);
    this.logger.debug('调试模式已启用:', this.settings.debugMode);

    // 初始化 CSS 主题管理器
    this.themeManager = new ThemeManager(this.app, this);
    await this.themeManager.initialize();

    // 初始化转换器
    MPConverter.initialize(this.app);

    // 初始化赞赏管理器
    DonateManager.initialize(this.app, this);

    // 初始化微信发布器
    this.wechatPublisher = new WechatPublisher(this.app, this);
    this.logger.debug('微信发布器已初始化');

    // 注册预览视图
    this.registerView(
      VIEW_TYPE_MP,
      (leaf) => new MPView(leaf, this.themeManager, this.settingsManager, this),
    );

    // 注册主题管理视图
    this.registerView(
      VIEW_TYPE_THEME_MANAGER,
      (leaf) => new ThemeManagerView(leaf, this.themeManager, this.settingsManager, this),
    );

    // 注册主题预览视图
    this.registerView(
      VIEW_TYPE_THEME_PREVIEW,
      (leaf) => new ThemePreviewView(leaf, this.themeManager),
    );

    // 注册 CSS 代码查看视图
    this.registerView(
      VIEW_TYPE_THEME_CSS,
      (leaf) => new ThemeCSSView(leaf, this.themeManager),
    );

    // 添加功能按钮
    this.addRibbonIcon('send', '打开公众号发布', () => {
      this.activateView();
    });

    // 添加打开预览命令
    this.addCommand({
      id: 'open-mp-publisher',
      name: '打开公众号发布插件',
      callback: async () => {
        await this.activateView();
      },
    });

    // 添加打开主题管理命令
    this.addCommand({
      id: 'open-theme-manager',
      name: '打开主题管理',
      callback: async () => {
        await this.activateThemeManager();
      },
    });

    // 添加发布命令
    this.addCommand({
      id: 'publish-to-wechat',
      name: '发布到微信公众号',
      editorCheckCallback: (checking: boolean, editor: any, view: MarkdownView) => {
        if (checking) {
          return true;
        }
        showPublishModal.call(this, view);
        return true;
      },
    });

    // 添加设置面板
    this.addSettingTab(new MPSettingTab(this.app, this));

    // 启动时自动清理一次
    await this.runAutoMetadataCleanup('startup');

    this.logger.info('MP Publisher 插件加载完成');
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MP);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }

    const rightLeaf = this.app.workspace.getRightLeaf(false);
    if (rightLeaf) {
      await rightLeaf.setViewState({
        type: VIEW_TYPE_MP,
        active: true,
      });
    } else {
      new Notice('无法创建视图面板');
    }
  }

  async activateThemeManager() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_THEME_MANAGER);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_THEME_MANAGER,
        active: true,
      });
    } else {
      new Notice('无法创建主题管理面板');
    }
  }

  // 包装微信发布功能供UI调用
  async publishToWechat(title: string, content: string, thumbMediaId: string = '', file: TFile): Promise<boolean> {
    await this.runAutoMetadataCleanup('publish');
    return this.wechatPublisher.publishToWechat(title, content, thumbMediaId, file);
  }

  getMetadataRetentionDays(): number {
    const settings = this.settingsManager.getSettings();
    if (settings.cacheRetentionMode === '3') return 3;
    if (settings.cacheRetentionMode === '7') return 7;
    return Math.max(1, Number(settings.cacheRetentionDays) || 7);
  }

  async runAutoMetadataCleanup(trigger: 'startup' | 'publish'): Promise<number> {
    const settings = this.settingsManager.getSettings();
    if (!settings.cacheCleanupEnabled) return 0;

    const days = this.getMetadataRetentionDays();
    const removed = await this.metadataStore.cleanupExpired(days);
    if (removed > 0) {
      this.logger.info(`已自动清理 ${removed} 条过期元数据（${days} 天，触发: ${trigger}）`);
    }
    return removed;
  }

  private async initializeMetadataStore(): Promise<void> {
    this.metadataStore = new DocumentMetadataStore(this.app, this.manifest.id);
    await this.metadataStore.initialize();

    const legacyData = this.settingsManager.getSettings().documentMetadata || {};
    const legacyCount = Object.keys(legacyData).length;
    if (legacyCount <= 0) return;

    const imported = await this.metadataStore.importLegacy(legacyData);
    await this.settingsManager.updateSettings({ documentMetadata: {} });

    this.logger.info(`已迁移 ${imported}/${legacyCount} 条旧 documentMetadata 到独立文件存储`);
    if (imported > 0) {
      new Notice(`已迁移 ${imported} 条文档元数据到独立文件存储`);
    }
  }

  onunload() {
    this.logger.info('卸载 MP Publisher 插件');
  }
}
