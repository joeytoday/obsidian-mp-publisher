import { Plugin, Notice, TFile, MarkdownView, MarkdownFileInfo } from 'obsidian';
import { MPView, VIEW_TYPE_MP } from './view';
import { ThemeManager } from './themeManager';
import { ThemeManagerView, VIEW_TYPE_THEME_MANAGER } from './themeManagerView';
import { ThemePreviewView, VIEW_TYPE_THEME_PREVIEW } from './themePreviewView';
import { ThemeCSSView, VIEW_TYPE_THEME_CSS } from './themeCSSView';
import { MarkdownDocView, VIEW_TYPE_GUIDE, VIEW_TYPE_CHANGELOG } from './guideView';
import { SettingsManager } from './settings/settings';
import { MPConverter } from './converter';
import { DonateManager } from './donateManager';
import { MPSettingTab } from './settings/MPSettingTab';
import { WechatPublisher } from './publisher/wechat';
import { showPublishModal } from './publisher';
import { Logger } from './utils/logger';

export default class MPPublisherPlugin extends Plugin {
  settingsManager!: SettingsManager;
  themeManager!: ThemeManager;
  wechatPublisher!: WechatPublisher;
  logger!: Logger;
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

    // 注册使用指南视图
    this.registerView(
      VIEW_TYPE_GUIDE,
      (leaf) => new MarkdownDocView(leaf, this.manifest.dir ?? '', VIEW_TYPE_GUIDE),
    );

    // 注册更新日志视图
    this.registerView(
      VIEW_TYPE_CHANGELOG,
      (leaf) => new MarkdownDocView(leaf, this.manifest.dir ?? '', VIEW_TYPE_CHANGELOG),
    );

    // 添加功能按钮
    this.addRibbonIcon('send', '打开公众号发布', () => {
      void this.activateView();
    });

    // 添加打开预览命令
    this.addCommand({
      id: 'open-preview',
      name: '打开公众号发布插件',
      callback: () => {
        void this.activateView();
      },
    });

    // 添加打开主题管理命令
    this.addCommand({
      id: 'theme-manager',
      name: '打开主题管理',
      callback: () => {
        void this.activateThemeManager();
      },
    });

    // 添加发布命令
    this.addCommand({
      id: 'publish',
      name: '发布到微信公众号',
      editorCheckCallback: (checking: boolean, _editor, ctx: MarkdownView | MarkdownFileInfo) => {
        if (checking) {
          return true;
        }
        if (ctx instanceof MarkdownView) {
          showPublishModal.call(this, ctx);
        }
        return true;
      },
    });

    // 添加设置面板
    this.addSettingTab(new MPSettingTab(this.app, this));

    this.logger.info('MP Publisher 插件加载完成');
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MP);
    if (leaves.length > 0) {
      void this.app.workspace.revealLeaf(leaves[0]);
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
      void this.app.workspace.revealLeaf(leaves[0]);
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
  async publishToWechat(title: string, content: string, thumbMediaId: string = '', file: TFile, accountId?: string, digest: string = '', author: string = ''): Promise<boolean> {
    return this.wechatPublisher.publishToWechat(title, content, thumbMediaId, file, accountId, digest, author);
  }

  onunload() {
    this.logger.info('卸载 MP Publisher 插件');
  }
}
