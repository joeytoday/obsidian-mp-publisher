import { Plugin, Notice, TFile, MarkdownView } from 'obsidian';
import { MPView, VIEW_TYPE_MP } from './view';
import { ThemeManager } from './themeManager';
import { ThemeManagerView, VIEW_TYPE_THEME_MANAGER } from './themeManagerView';
import { SettingsManager } from './settings/settings';
import { MPConverter } from './converter';
import { DonateManager } from './donateManager';
import { MPSettingTab } from './settings/MPSettingTab';
import { WechatPublisher } from './publisher/wechat';
import { showPublishModal } from './publisher';
import { Logger } from './utils/logger';

export default class MPPublisherPlugin extends Plugin {
  settingsManager: SettingsManager;
  themeManager: ThemeManager;
  wechatPublisher: WechatPublisher;
  logger: Logger;
  showPublishModal = showPublishModal;

  // 为了兼容性，添加 settings getter
  get settings() {
    return this.settingsManager.getSettings();
  }

  async onload() {
    // 初始化日志工具
    this.logger = Logger.getInstance();
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

    this.logger.info('MP Publisher 插件加载完成');
  }

  private async openOrCreateView(
    viewType: string,
    getLeaf: () => import('obsidian').WorkspaceLeaf | null,
    errorMessage: string,
  ) {
    const existingLeaves = this.app.workspace.getLeavesOfType(viewType);
    if (existingLeaves.length > 0) {
      this.app.workspace.revealLeaf(existingLeaves[0]);
      return;
    }

    const leaf = getLeaf();
    if (leaf) {
      await leaf.setViewState({ type: viewType, active: true });
    } else {
      new Notice(errorMessage);
    }
  }

  async activateView() {
    await this.openOrCreateView(
      VIEW_TYPE_MP,
      () => this.app.workspace.getRightLeaf(false),
      '无法创建视图面板',
    );
  }

  async activateThemeManager() {
    await this.openOrCreateView(
      VIEW_TYPE_THEME_MANAGER,
      () => this.app.workspace.getLeaf(true),
      '无法创建主题管理面板',
    );
  }

  // 包装微信发布功能供UI调用
  async publishToWechat(title: string, content: string, thumbMediaId: string = '', file: TFile): Promise<boolean> {
    return this.wechatPublisher.publishToWechat(title, content, thumbMediaId, file);
  }

  onunload() {
    this.logger.info('卸载 MP Publisher 插件');
  }
}
