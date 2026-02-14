import { App } from 'obsidian';
import { Logger } from './logger';
import { ThemeConfig, WechatThemeStyle } from '../types/wechat-theme';

/**
 * 微信样式应用工具
 * 将 CSS 样式内联到 HTML 中，优化微信公众号显示效果
 * 支持多种主题样式和颜色
 */
export class WechatStyler {
    private app: App;
    private logger: Logger;
    private themeConfig: ThemeConfig;
    private mathJaxPlaceholderMap: Map<string, string> = new Map();

    constructor(app: App, themeConfig?: ThemeConfig) {
        this.app = app;
        this.logger = Logger.getInstance(app);
        this.themeConfig = themeConfig || {
            style: WechatThemeStyle.MODERN_MINIMAL
        };
    }

    /**
     * 获取主题 CSS
     */
    private getThemeCSS(): string {
        let baseCSS = '';

        // 根据主题样式选择对应的 CSS
        switch (this.themeConfig.style) {
            case WechatThemeStyle.MODERN_MINIMAL:
                baseCSS = this.getModernMinimalCSS();
                break;
            case WechatThemeStyle.TECH_FUTURE:
                baseCSS = this.getTechFutureCSS();
                break;
            case WechatThemeStyle.WARM_ORANGE:
                baseCSS = this.getWarmOrangeCSS();
                break;
            case WechatThemeStyle.FRESH_GREEN:
                baseCSS = this.getFreshGreenCSS();
                break;
            case WechatThemeStyle.ELEGANT_VIOLET:
                baseCSS = this.getElegantVioletCSS();
                break;
            case WechatThemeStyle.CHINESE_STYLE:
                baseCSS = this.getChineseStyleCSS();
                break;
            default:
                baseCSS = this.getModernMinimalCSS();
        }

        // 添加 highlight.js 语法高亮样式
        return baseCSS + '\n' + this.getHighlightJSCSS();
    }

    /**
     * 获取 highlight.js 语法高亮 CSS
     */
    private getHighlightJSCSS(): string {
        return `
/* Highlight.js 语法高亮样式 */
.hljs { display: block; overflow-x: auto; }
.hljs-comment, .hljs-quote { color: #5c6370; font-style: italic; }
.hljs-doctag, .hljs-keyword, .hljs-formula { color: #c678dd; }
.hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst { color: #e06c75; }
.hljs-literal { color: #56b6c2; }
.hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta-string { color: #98c379; }
.hljs-built_in, .hljs-class .hljs-title { color: #e6c07b; }
.hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number { color: #d19a66; }
.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-title { color: #61aeee; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
.hljs-link { text-decoration: underline; }

/* Mermaid 图表样式 */
.mermaid { 
    display: block !important; 
    text-align: center !important; 
    margin: 20px 0 !important; 
    overflow-x: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
}
.mermaid svg, pre svg { 
    max-width: 100% !important; 
    height: auto !important; 
    display: inline-block !important;
    visibility: visible !important;
    opacity: 1 !important;
}
.mermaid foreignObject,
.mermaid foreignObject > div,
.mermaid foreignObject > div > p,
.mermaid foreignObject > div > span {
    overflow: visible !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 100% !important;
    line-height: 1.2 !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
}
.mermaid foreignObject > div {
    transform: translateY(-0.1em) !important;
    transform-origin: center !important;
}
pre.mermaid {
    background-color: transparent !important;
    border: none !important;
    padding: 0 !important;
}

/* 数学公式样式 */
.math, .math-inline, .math-block, mjx-container {
    display: inline-block !important;
    visibility: visible !important;
    opacity: 1 !important;
    color: inherit !important;
}
.math-block {
    display: block !important;
    text-align: center !important;
    margin: 1em 0 !important;
}

/* Ruby 注音样式 */
ruby {
    ruby-align: center;
    display: inline-flex;
    flex-direction: column-reverse;
}
rt {
    font-size: 0.6em;
    line-height: 1.2;
    text-align: center;
}
        `;
    }

    /**
     * 获取经典主题 CSS
     */
    /**
     * 获取现代简约主题 CSS
     */
    private getModernMinimalCSS(): string {
        return `
.wechat-content {
  font-size: 16px;
  color: #3f3f3f;
  line-height: 1.75;
  letter-spacing: 0.05em;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}
.wechat-content h1, .wechat-content h2, .wechat-content h3, .wechat-content h4, .wechat-content h5, .wechat-content h6 {
  margin-top: 30px; margin-bottom: 15px; padding: 0; font-weight: bold; color: #2b2b2b;
}
.wechat-content h1 { font-size: 24px; padding-bottom: 8px; border-bottom: 1px solid #3eaf7c; color: #2b2b2b; }
.wechat-content h2 { font-size: 22px; padding: 8px 12px; background-color: #f8f8f8; color: #3eaf7c; border: none; }
.wechat-content h3 { font-size: 20px; padding-left: 10px; border-left: 2px solid #3eaf7c; }
.wechat-content h4 { font-size: 18px; }
.wechat-content h5 { font-size: 16px; }
.wechat-content h6 { font-size: 16px; color: #777; }
.wechat-content p { margin: 15px 0; line-height: 1.75; }
.wechat-content a { color: #3eaf7c; text-decoration: none; border-bottom: 1px solid #3eaf7c; }
.wechat-content ul, .wechat-content ol { margin: 15px 0; padding-left: 30px; }
.wechat-content li { margin: 8px 0; line-height: 1.75; }
.wechat-content blockquote { margin: 20px 0; padding: 15px 20px; background-color: #f8f8f8; border-left: 3px solid #3eaf7c; color: #666; font-style: italic; }
.wechat-content blockquote p { margin: 0; }
.wechat-content pre { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 3px; overflow-x: auto; border: 1px solid #e0e0e0; }
.wechat-content code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 14px; background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; color: #d73a49; }
.wechat-content pre code { display: block; padding: 0; background-color: transparent; color: #333; line-height: 1.5; }
.wechat-content table { margin: 20px 0; border-collapse: collapse; width: 100%; font-size: 14px; }
.wechat-content table th, .wechat-content table td { padding: 10px 15px; border: 1px solid #dfe2e5; text-align: left; }
.wechat-content table th { background-color: #f6f8fa; font-weight: bold; color: #2b2b2b; }
.wechat-content table tr:nth-child(even) { background-color: #f8f8f8; }
.wechat-content hr { margin: 30px 0; border: none; border-top: 1px solid #eee; }
.wechat-content img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 3px; }
.wechat-content strong { font-weight: bold; color: #2b2b2b; }
.wechat-content em { font-style: italic; }
.wechat-content del { text-decoration: line-through; color: #999; }
.wechat-content mark { background-color: #3eaf7c; color: #ffffff; padding: 2px 4px; border-radius: 2px; }
        `;
    }

    /**
     * 获取科技未来主题 CSS
     */
    private getTechFutureCSS(): string {
        return `
.wechat-content {
  font-size: 16px;
  color: #1a202c;
  line-height: 1.75;
  letter-spacing: 0.05em;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  background: linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%);
}
.wechat-content h1, .wechat-content h2, .wechat-content h3, .wechat-content h4, .wechat-content h5, .wechat-content h6 {
  margin-top: 30px; margin-bottom: 15px; padding: 0; font-weight: bold; color: #0f172a;
}
.wechat-content h1 { font-size: 24px; padding: 15px 25px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: #ffffff; border: none; border-radius: 8px; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5), 0 0 30px rgba(6, 182, 212, 0.4); text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }
.wechat-content h2 { font-size: 22px; padding: 12px 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%); border-left: 5px solid; border-image: linear-gradient(to bottom, #06b6d4, #8b5cf6) 1; border-radius: 0 6px 6px 0; box-shadow: 0 2px 15px rgba(139, 92, 246, 0.25); }
.wechat-content h3 { font-size: 20px; padding-left: 15px; border-left: 4px solid #06b6d4; box-shadow: -4px 0 12px rgba(6, 182, 212, 0.4); }
.wechat-content h4 { font-size: 18px; color: #0891b2; }
.wechat-content h5 { font-size: 16px; }
.wechat-content h6 { font-size: 16px; color: #777; }
.wechat-content p { margin: 15px 0; line-height: 1.75; }
.wechat-content a { color: #0891b2; text-decoration: none; border-bottom: 2px solid transparent; background: linear-gradient(to right, #06b6d4, #8b5cf6); background-size: 0% 2px; background-repeat: no-repeat; background-position: left bottom; transition: background-size 0.3s ease; }
.wechat-content ul, .wechat-content ol { margin: 15px 0; padding-left: 30px; }
.wechat-content li { margin: 8px 0; line-height: 1.75; }
.wechat-content blockquote { margin: 20px 0; padding: 15px 20px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%); border-left: 5px solid; border-image: linear-gradient(to bottom, #06b6d4, #8b5cf6) 1; color: #475569; font-style: italic; border-radius: 0 8px 8px 0; box-shadow: 0 2px 10px rgba(6, 182, 212, 0.15); }
.wechat-content blockquote p { margin: 0; }
.wechat-content pre { margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 8px; overflow-x: auto; border: 1px solid #06b6d4; box-shadow: 0 4px 25px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.3), inset 0 1px 0 rgba(6, 182, 212, 0.2); }
.wechat-content code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 14px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.15)); padding: 3px 8px; border-radius: 4px; color: #0891b2; border: 1px solid rgba(6, 182, 212, 0.3); }
.wechat-content pre code { display: block; padding: 0; background-color: transparent; color: #cbd5e1; line-height: 1.6; border: none; }
.wechat-content table { margin: 20px 0; border-collapse: collapse; width: 100%; font-size: 14px; }
.wechat-content table th, .wechat-content table td { padding: 10px 15px; border: 1px solid #dfe2e5; text-align: left; }
.wechat-content table th { background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); font-weight: bold; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4); }
.wechat-content table tr:nth-child(even) { background-color: #f8f8f8; }
.wechat-content hr { margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, transparent, #06b6d4, #8b5cf6, transparent); }
.wechat-content img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.25); border: 1px solid rgba(6, 182, 212, 0.2); }
.wechat-content strong { font-weight: bold; color: #0f172a; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1)); padding: 0 4px; border-radius: 2px; }
.wechat-content em { font-style: italic; }
.wechat-content del { text-decoration: line-through; color: #999; }
.wechat-content mark { background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: #ffffff; padding: 3px 8px; border-radius: 4px; box-shadow: 0 2px 12px rgba(139, 92, 246, 0.5), 0 0 20px rgba(6, 182, 212, 0.3); }
        `;
    }

    /**
     * 获取温暖橙光主题 CSS
     */
    private getWarmOrangeCSS(): string {
        return `
.wechat-content {
  font-size: 16px;
  color: #3f3f3f;
  line-height: 1.75;
  letter-spacing: 0.05em;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}
.wechat-content h1, .wechat-content h2, .wechat-content h3, .wechat-content h4, .wechat-content h5, .wechat-content h6 {
  margin-top: 30px; margin-bottom: 15px; padding: 0; font-weight: bold; color: #2b2b2b;
}
.wechat-content h1 { font-size: 24px; padding: 12px 20px; background-color: #ff6b35; color: #ffffff; border: none; }
.wechat-content h2 { font-size: 22px; padding: 10px 16px; padding-left: 20px; background-color: #fff3ed; border-left: 4px solid #ff6b35; color: #ff6b35; }
.wechat-content h3 { font-size: 20px; padding-left: 12px; border-left: 4px solid #ff6b35; }
.wechat-content h4 { font-size: 18px; }
.wechat-content h5 { font-size: 16px; }
.wechat-content h6 { font-size: 16px; color: #777; }
.wechat-content p { margin: 15px 0; line-height: 1.75; }
.wechat-content a { color: #ff6b35; text-decoration: none; border-bottom: 1px solid #ff6b35; }
.wechat-content ul, .wechat-content ol { margin: 15px 0; padding-left: 30px; }
.wechat-content li { margin: 8px 0; line-height: 1.75; }
.wechat-content blockquote { margin: 20px 0; padding: 15px 20px; background-color: #fff3ed; border-left: 4px solid #ff6b35; color: #666; font-style: italic; }
.wechat-content blockquote p { margin: 0; }
.wechat-content pre { margin: 20px 0; padding: 15px; background-color: #2c2c2c; border-radius: 5px; overflow-x: auto; border: none; }
.wechat-content code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 14px; background-color: #fff3ed; padding: 2px 6px; border-radius: 3px; color: #ff6b35; }
.wechat-content pre code { display: block; padding: 0; background-color: transparent; color: #abb2bf; line-height: 1.5; }
.wechat-content table { margin: 20px 0; border-collapse: collapse; width: 100%; font-size: 14px; }
.wechat-content table th, .wechat-content table td { padding: 10px 15px; border: 1px solid #dfe2e5; text-align: left; }
.wechat-content table th { background-color: #ff6b35; font-weight: bold; color: #ffffff; }
.wechat-content table tr:nth-child(even) { background-color: #fff3ed; }
.wechat-content hr { margin: 30px 0; border: none; border-top: 1px solid #eee; }
.wechat-content img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 5px; }
.wechat-content strong { font-weight: bold; color: #2b2b2b; }
.wechat-content em { font-style: italic; }
.wechat-content del { text-decoration: line-through; color: #999; }
.wechat-content mark { background-color: #ff6b35; color: #ffffff; padding: 2px 4px; border-radius: 2px; }
        `;
    }

    /**
     * 获取清新绿意主题 CSS
     */
    private getFreshGreenCSS(): string {
        return `
.wechat-content {
  font-size: 16px;
  color: #3f3f3f;
  line-height: 1.75;
  letter-spacing: 0.05em;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}
.wechat-content h1, .wechat-content h2, .wechat-content h3, .wechat-content h4, .wechat-content h5, .wechat-content h6 {
  margin-top: 30px; margin-bottom: 15px; padding: 0; font-weight: bold; color: #2b2b2b;
}
.wechat-content h1 { font-size: 24px; padding-bottom: 12px; border-bottom: 3px solid #42b983; color: #2b2b2b; text-align: center; }
.wechat-content h2 { font-size: 22px; padding: 10px 16px; background: linear-gradient(to right, #42b983 0%, #85d7b3 100%); color: #ffffff; border: none; border-radius: 4px; }
.wechat-content h3 { font-size: 20px; padding-left: 12px; border-left: 4px solid #42b983; }
.wechat-content h4 { font-size: 18px; }
.wechat-content h5 { font-size: 16px; }
.wechat-content h6 { font-size: 16px; color: #777; }
.wechat-content p { margin: 15px 0; line-height: 1.75; }
.wechat-content a { color: #42b983; text-decoration: none; border-bottom: 1px solid #42b983; }
.wechat-content ul, .wechat-content ol { margin: 15px 0; padding-left: 30px; }
.wechat-content li { margin: 8px 0; line-height: 1.75; }
.wechat-content blockquote { margin: 20px 0; padding: 15px 20px; background-color: #f0faf6; border-left: 4px solid #42b983; color: #666; font-style: italic; }
.wechat-content blockquote p { margin: 0; }
.wechat-content pre { margin: 20px 0; padding: 15px; background-color: #2c2c2c; border-radius: 5px; overflow-x: auto; border: none; }
.wechat-content code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 14px; background-color: #f0faf6; padding: 2px 6px; border-radius: 3px; color: #42b983; }
.wechat-content pre code { display: block; padding: 0; background-color: transparent; color: #abb2bf; line-height: 1.5; }
.wechat-content table { margin: 20px 0; border-collapse: collapse; width: 100%; font-size: 14px; }
.wechat-content table th, .wechat-content table td { padding: 10px 15px; border: 1px solid #dfe2e5; text-align: left; }
.wechat-content table th { background-color: #42b983; font-weight: bold; color: #ffffff; }
.wechat-content table tr:nth-child(even) { background-color: #f0faf6; }
.wechat-content hr { margin: 30px 0; border: none; border-top: 1px solid #eee; }
.wechat-content img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 5px; }
.wechat-content strong { font-weight: bold; color: #2b2b2b; }
.wechat-content em { font-style: italic; }
.wechat-content del { text-decoration: line-through; color: #999; }
.wechat-content mark { background-color: #42b983; color: #ffffff; padding: 2px 4px; border-radius: 2px; }
        `;
    }

    /**
     * 获取优雅紫罗兰主题 CSS
     */
    private getElegantVioletCSS(): string {
        return `
.wechat-content {
  font-size: 16px;
  color: #3f3f3f;
  line-height: 1.75;
  letter-spacing: 0.05em;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}
.wechat-content h1, .wechat-content h2, .wechat-content h3, .wechat-content h4, .wechat-content h5, .wechat-content h6 {
  margin-top: 30px; margin-bottom: 15px; padding: 0; font-weight: bold; color: #2b2b2b;
}
.wechat-content h1 { font-size: 24px; padding-bottom: 12px; border-bottom: 3px solid #9b59b6; color: #2b2b2b; text-align: center; font-weight: 600; }
.wechat-content h2 { font-size: 22px; padding: 10px 16px; background: linear-gradient(135deg, #9b59b6 0%, #c39bd3 100%); color: #ffffff; border: none; border-radius: 4px; box-shadow: 0 2px 8px rgba(155, 89, 182, 0.3); }
.wechat-content h3 { font-size: 20px; padding-left: 12px; border-left: 4px solid #9b59b6; }
.wechat-content h4 { font-size: 18px; }
.wechat-content h5 { font-size: 16px; }
.wechat-content h6 { font-size: 16px; color: #777; }
.wechat-content p { margin: 15px 0; line-height: 1.75; }
.wechat-content a { color: #9b59b6; text-decoration: none; border-bottom: 1px solid #9b59b6; }
.wechat-content ul, .wechat-content ol { margin: 15px 0; padding-left: 30px; }
.wechat-content li { margin: 8px 0; line-height: 1.75; }
.wechat-content blockquote { margin: 20px 0; padding: 15px 20px; background-color: #f8f5fb; border-left: 4px solid #9b59b6; color: #666; font-style: italic; }
.wechat-content blockquote p { margin: 0; }
.wechat-content pre { margin: 20px 0; padding: 15px; background-color: #2d2438; border-radius: 5px; overflow-x: auto; border: none; }
.wechat-content code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 14px; background-color: #f8f5fb; padding: 2px 6px; border-radius: 3px; color: #9b59b6; }
.wechat-content pre code { display: block; padding: 0; background-color: transparent; color: #c9a7d8; line-height: 1.5; }
.wechat-content table { margin: 20px 0; border-collapse: collapse; width: 100%; font-size: 14px; }
.wechat-content table th, .wechat-content table td { padding: 10px 15px; border: 1px solid #dfe2e5; text-align: left; }
.wechat-content table th { background-color: #9b59b6; font-weight: bold; color: #ffffff; }
.wechat-content table tr:nth-child(even) { background-color: #f8f5fb; }
.wechat-content hr { margin: 30px 0; border: none; border-top: 1px solid #eee; }
.wechat-content img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 5px; }
.wechat-content strong { font-weight: bold; color: #2b2b2b; }
.wechat-content em { font-style: italic; }
.wechat-content del { text-decoration: line-through; color: #999; }
.wechat-content mark { background-color: #9b59b6; color: #ffffff; padding: 2px 4px; border-radius: 2px; }
        `;
    }

    /**
     * 获取中国风主题 CSS
     */
    private getChineseStyleCSS(): string {
        return `
.wechat-content {
  font-size: 16px;
  color: #2c2c2c;
  line-height: 1.8;
  letter-spacing: 0.05em;
  font-family: "STSong", "SimSun", "Songti SC", "NSimSun", serif, -apple-system, BlinkMacSystemFont;
}
.wechat-content h1, .wechat-content h2, .wechat-content h3, .wechat-content h4, .wechat-content h5, .wechat-content h6 {
  margin-top: 30px; margin-bottom: 15px; padding: 0; font-weight: bold; color: #2c2c2c;
}
.wechat-content h1 { font-size: 24px; padding: 16px 30px; background: linear-gradient(to bottom, #f5e6d3 0%, #efe0c8 50%, #f5e6d3 100%); color: #c8161d; border: none; text-align: center; letter-spacing: 0.15em; position: relative; border-top: 2px solid #c8161d; border-bottom: 2px solid #c8161d; box-shadow: inset 0 1px 0 rgba(200, 22, 29, 0.3), inset 0 -1px 0 rgba(200, 22, 29, 0.3); }
.wechat-content h1::before, .wechat-content h1::after { content: '◈'; position: absolute; top: 50%; transform: translateY(-50%); color: #c8161d; font-size: 18px; }
.wechat-content h1::before { left: 8px; }
.wechat-content h1::after { right: 8px; }
.wechat-content h2 { font-size: 22px; padding: 10px 20px; border-left: 4px solid #c8161d; color: #c8161d; position: relative; background: linear-gradient(to right, rgba(200, 22, 29, 0.05) 0%, transparent 100%); }
.wechat-content h3 { font-size: 20px; padding-left: 12px; border-left: 3px solid #c8161d; }
.wechat-content h4 { font-size: 18px; }
.wechat-content h5 { font-size: 16px; }
.wechat-content h6 { font-size: 16px; color: #777; }
.wechat-content p { margin: 15px 0; line-height: 1.8; }
.wechat-content a { color: #c8161d; text-decoration: none; border-bottom: 1px solid #c8161d; }
.wechat-content ul, .wechat-content ol { margin: 15px 0; padding-left: 30px; }
.wechat-content li { margin: 8px 0; line-height: 1.8; }
.wechat-content blockquote { margin: 20px 0; padding: 15px 20px; background: linear-gradient(to right, #faf8f3 0%, #f5f0e8 100%); border-left: 4px solid #c8161d; border-right: 4px solid #c8161d; color: #666; font-style: normal; position: relative; }
.wechat-content blockquote::before { content: '"'; position: absolute; left: 8px; top: 5px; font-size: 32px; color: rgba(200, 22, 29, 0.2); font-family: Georgia, serif; line-height: 1; }
.wechat-content blockquote::after { content: '"'; position: absolute; right: 8px; bottom: 5px; font-size: 32px; color: rgba(200, 22, 29, 0.2); font-family: Georgia, serif; line-height: 1; }
.wechat-content blockquote p { margin: 0; }
.wechat-content pre { margin: 20px 0; padding: 15px; background-color: #2c2c2c; border-radius: 3px; overflow-x: auto; border: 1px solid #c8161d; }
.wechat-content code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 14px; background-color: #faf8f3; padding: 2px 6px; border-radius: 3px; color: #c8161d; }
.wechat-content pre code { display: block; padding: 0; background-color: transparent; color: #abb2bf; line-height: 1.5; }
.wechat-content table { margin: 20px 0; border-collapse: collapse; width: 100%; font-size: 14px; }
.wechat-content table th, .wechat-content table td { padding: 10px 15px; border: 1px solid #dfe2e5; text-align: left; }
.wechat-content table th { background-color: #c8161d; font-weight: bold; color: #ffffff; }
.wechat-content table tr:nth-child(even) { background-color: #faf8f3; }
.wechat-content hr { margin: 30px 0; border: none; height: 1px; background: linear-gradient(to right, transparent, #c8161d, transparent); position: relative; }
.wechat-content hr::after { content: '❖'; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background-color: #ffffff; color: #c8161d; padding: 0 10px; font-size: 14px; }
.wechat-content img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 3px; }
.wechat-content strong { font-weight: bold; color: #c8161d; position: relative; padding: 0 2px; }
.wechat-content strong::after { content: ''; position: absolute; bottom: 2px; left: 0; right: 0; height: 3px; background: linear-gradient(to right, transparent, rgba(200, 22, 29, 0.2), transparent); }
.wechat-content em { font-style: italic; }
.wechat-content del { text-decoration: line-through; color: #999; }
.wechat-content mark { background-color: #c8161d; color: #ffffff; padding: 2px 4px; border-radius: 2px; }
        `;
    }

    /**
     * 应用代码高亮
     */
    private async applyCodeHighlighting(html: string): Promise<string> {
        try {
            // 动态导入 highlight.js 以减小打包体积
            const hljs = await import('highlight.js/lib/core');
            
            // 按需注册常用语言（这些语言覆盖大部分使用场景）
            const commonLanguages = [
                'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
                'bash', 'json', 'yaml', 'markdown', 'html', 'css', 'sql',
                'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'
            ];
            
            await Promise.all(commonLanguages.map(async (lang) => {
                try {
                    const module = await import(`highlight.js/lib/languages/${lang}`);
                    hljs.default.registerLanguage(lang, module.default);
                } catch (e) {
                    // 忽略加载失败的语言
                }
            }));

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 查找所有代码块
            const codeBlocks = doc.querySelectorAll('pre code');

            codeBlocks.forEach(block => {
                const codeElement = block as HTMLElement;
                const preElement = codeElement.parentElement;

                // 跳过包含图表或 SVG 的代码块
                if (preElement) {
                    const hasSVG = preElement.querySelector('svg') !== null;
                    const isDiagram = preElement.classList.contains('mermaid') ||
                        preElement.classList.contains('plantuml') ||
                        preElement.querySelector('.mermaid') !== null ||
                        preElement.querySelector('.plantuml') !== null;

                    if (hasSVG || isDiagram) {
                        return; // 跳过这个代码块
                    }
                }

                const code = codeElement.textContent || '';

                // 尝试自动检测语言并高亮
                try {
                    const result = hljs.default.highlightAuto(code);
                    codeElement.innerHTML = result.value;
                    codeElement.classList.add('hljs');
                } catch (error) {
                    this.logger.debug('代码高亮失败:', error);
                }
            });

            return doc.body.innerHTML;
        } catch (error) {
            this.logger.error('应用代码高亮时出错:', error);
            return html;
        }
    }

    /**
     * 为中国风主题添加装饰元素
     * 因为 CSS 伪元素无法被 juice 内联化，所以需要插入真实的 HTML 元素
     */
    private addChineseStyleDecorations(htmlContent: string): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // 1. H1 标题 - 添加左右装饰符号
        doc.querySelectorAll('.wechat-content h1').forEach(h1 => {
            const leftDecor = doc.createElement('span');
            leftDecor.textContent = '◈';
            leftDecor.style.cssText = 'position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #c8161d; font-size: 18px;';

            const rightDecor = doc.createElement('span');
            rightDecor.textContent = '◈';
            rightDecor.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #c8161d; font-size: 18px;';

            h1.insertBefore(leftDecor, h1.firstChild);
            h1.appendChild(rightDecor);
        });

        // 3. Blockquote - 添加引号
        doc.querySelectorAll('.wechat-content blockquote').forEach(bq => {
            const leftQuote = doc.createElement('span');
            leftQuote.textContent = '"';
            leftQuote.style.cssText = 'position: absolute; left: 8px; top: 5px; font-size: 32px; color: rgba(200, 22, 29, 0.2); font-family: Georgia, serif; line-height: 1;';

            const rightQuote = doc.createElement('span');
            rightQuote.textContent = '"';
            rightQuote.style.cssText = 'position: absolute; right: 8px; bottom: 5px; font-size: 32px; color: rgba(200, 22, 29, 0.2); font-family: Georgia, serif; line-height: 1;';

            bq.insertBefore(leftQuote, bq.firstChild);
            bq.appendChild(rightQuote);
        });

        // 4. HR - 添加中心装饰（HR 是自闭合标签，需要用包装器）
        doc.querySelectorAll('.wechat-content hr').forEach(hr => {
            const wrapper = doc.createElement('div');
            wrapper.style.cssText = 'position: relative; margin: 30px 0; text-align: center;';

            const decor = doc.createElement('span');
            decor.textContent = '❖';
            decor.style.cssText = 'display: inline-block; background-color: #ffffff; color: #c8161d; padding: 0 10px; font-size: 14px; position: relative; z-index: 1;';

            // 将 hr 的样式移到包装器中的伪线条
            const line = doc.createElement('div');
            line.style.cssText = 'position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: linear-gradient(to right, transparent, #c8161d, transparent);';

            if (hr.parentElement) {
                hr.parentElement.insertBefore(wrapper, hr);
                wrapper.appendChild(line);
                wrapper.appendChild(decor);
                hr.remove();
            }
        });

        // 5. Strong - 添加底部装饰线
        doc.querySelectorAll('.wechat-content strong').forEach(strong => {
            const underline = doc.createElement('span');
            underline.style.cssText = 'position: absolute; bottom: 2px; left: 0; right: 0; height: 3px; background: linear-gradient(to right, transparent, rgba(200, 22, 29, 0.2), transparent); display: block;';

            strong.appendChild(underline);
        });

        return doc.body.innerHTML;
    }

    /**
     * 将 SVG 内部的样式内联到元素属性中，解决微信过滤 <style> 标签的问题
     */
    private inlineSvgStyles(root: Element): void {
        try {
            const styleElements = root.querySelectorAll('style');
            if (styleElements.length === 0) {
                // 如果根节点本身就是 style，也处理它（虽然通常不是）
                if (root.tagName.toLowerCase() === 'style') {
                    // 这种情况比较少见，先按 querySelectorAll 处理
                } else {
                    return;
                }
            }

            let cssText = '';
            styleElements.forEach(style => {
                cssText += style.textContent + '\n';
                // 移除 style 标签，因为在微信中无效且可能干扰
                style.remove();
            });

            // 改进的 CSS 规则提取（支持更复杂的 CSS）
            const rules: Array<{ selector: string, declaration: string }> = [];

            // 匹配所有 selector { declaration }
            const blocks = cssText.split('}');
            blocks.forEach(block => {
                const parts = block.split('{');
                if (parts.length === 2) {
                    const selector = parts[0].trim();
                    const declaration = parts[1].trim();
                    if (selector && declaration && !selector.startsWith('@')) {
                        selector.split(',').forEach(s => {
                            rules.push({ selector: s.trim(), declaration });
                        });
                    }
                }
            });

            rules.forEach(rule => {
                const selector = rule.selector;
                const declaration = rule.declaration;

                // 排除伪类
                if (selector.includes(':')) return;

                try {
                    // 支持属性选择器，如 [stroke="currentColor"]
                    // 修正：也要匹配根元素本身，确保 root svg 的样式也被内联
                    const elements = Array.from(root.querySelectorAll(selector));
                    if (root.matches && root.matches(selector)) {
                        elements.push(root);
                    }
                    elements.forEach(el => {
                        const element = el as SVGElement;
                        const existingStyle = element.getAttribute('style') || '';

                        // 将声明拆分为单独的属性，避免重复或覆盖
                        const newStyles = declaration.split(';').map(s => s.trim()).filter(s => s);
                        let finalStyle = existingStyle;

                        newStyles.forEach(styleRule => {
                            const colonIndex = styleRule.indexOf(':');
                            if (colonIndex > 0) {
                                const propName = styleRule.substring(0, colonIndex).trim();
                                const propValue = styleRule.substring(colonIndex + 1).trim();

                                // 改进的正则：匹配起始位或分号，确保是完整的属性名
                                const regex = new RegExp(`(^|;)\\s*${propName}\\s*:[^;]+(;|$)`, 'i');
                                if (regex.test(finalStyle)) {
                                    finalStyle = finalStyle.replace(regex, (m, p1, p2) => {
                                        return `${p1}${propName}: ${propValue}${p2}`;
                                    });
                                } else {
                                    const separator = finalStyle && !finalStyle.endsWith(';') ? ';' : '';
                                    finalStyle += separator + propName + ': ' + propValue + (propValue.endsWith(';') ? '' : ';');
                                }
                            }
                        });

                        element.setAttribute('style', finalStyle);
                    });
                } catch (e) {
                    // 忽略无效的选择器
                }
            });
        } catch (error) {
            console.error('[MathJax] Style inlining failed:', error);
        }
    }

    /**
     * 将 SVG 转换为 PNG Data URL
     */
    private async svgToPng(svgElement: SVGElement, isBlock: boolean): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                // 1. 深度克隆 SVG 以便修改而不影响原图
                const clonedSvg = svgElement.cloneNode(true) as SVGElement;
                this.cleanMermaidSvgTextArtifacts(clonedSvg);
                this.fixMermaidSvgClipping(clonedSvg, 16, 8);
                this.expandMermaidForeignObjects(clonedSvg, 10, 8);
                const hasForeignObject = clonedSvg.querySelector('foreignObject') !== null;

                // 2. 增强文本渲染精度并统一字体，防止计算偏差
                // 关键修正：采取激进策略减小字号、间距并强制窄字体 (Arial)，确保在所有系统下均不溢出
                clonedSvg.style.textRendering = 'geometricPrecision';
                clonedSvg.querySelectorAll('*').forEach(el => {
                    const element = el as HTMLElement | SVGElement;
                    // 强制所有元素溢出可见，防止内部容器（如 rect）截导出文字
                    element.style.setProperty('overflow', 'visible', 'important');

                    if (element instanceof SVGElement || element instanceof HTMLElement) {
                        // 强制使用 Arial，它通常比系统默认的 sans-serif 更窄且渲染更一致
                        element.style.fontFamily = 'Arial, sans-serif';

                        // 针对文本节点进行缩放处理
                        const tagName = element.tagName.toLowerCase();
                        if (tagName === 'text' || tagName === 'tspan' || (element as HTMLElement).innerText?.length > 0) {
                            element.style.setProperty('text-rendering', 'geometricPrecision', 'important');
                            // Mermaid foreignObject 场景下不强制缩放字体，避免垂直居中偏移
                            if (!hasForeignObject) {
                                element.style.setProperty('font-size', '90%', 'important');
                                element.style.setProperty('letter-spacing', '-0.8px', 'important');
                            } else {
                                element.style.setProperty('dominant-baseline', 'middle', 'important');
                                element.style.setProperty('alignment-baseline', 'middle', 'important');
                            }
                        }
                    }
                });

                // 3. 确保 SVG 有明确的尺寸 (防止 0x0 渲染)
                // 优先使用 SVG 自身的边界框，避免布局影响导致裁剪
                const bbox = (svgElement as SVGGraphicsElement).getBBox();
                const originalWidth = parseFloat(svgElement.getAttribute('width') || bbox.width.toString());
                const originalHeight = parseFloat(svgElement.getAttribute('height') || bbox.height.toString());

                // 为防止边缘字符被截断，增加少量内边距 (Padding)
                const paddingX = Math.max(20, bbox.width * 0.12);
                const paddingY = Math.max(20, bbox.height * 0.06);
                const finalWidth = originalWidth + paddingX * 2;
                const finalHeight = originalHeight + paddingY * 2;

                clonedSvg.setAttribute('width', finalWidth.toString());
                clonedSvg.setAttribute('height', finalHeight.toString());
                clonedSvg.style.overflow = 'visible';

                // 调整 viewBox 以适应 padding，如果原先没有则基于 original 建立
                const originalViewBox = svgElement.getAttribute('viewBox');
                if (originalViewBox) {
                    const [vx, vy, vw, vh] = originalViewBox.split(/[ ,]+/).map(parseFloat);
                    clonedSvg.setAttribute('viewBox', `${vx - paddingX} ${vy - paddingY} ${vw + paddingX * 2} ${vh + paddingY * 2}`);
                } else {
                    clonedSvg.setAttribute('viewBox', `-${paddingX} -${paddingY} ${finalWidth} ${finalHeight}`);
                }
                clonedSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

                // 确保命名空间 (关键)
                clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

                const svgData = new XMLSerializer().serializeToString(clonedSvg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                const img = new Image();
                const base64Data = btoa(unescape(encodeURIComponent(svgData)));
                const dataUrl = `data:image/svg+xml;base64,${base64Data}`;

                img.onload = () => {
                    try {
                        // 增加缩放倍数以提高清晰度 (3倍)
                        const scale = 3;
                        canvas.width = finalWidth * scale;
                        canvas.height = finalHeight * scale;
                        ctx.fillStyle = 'white'; // 微信背景通常是白色的
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.scale(scale, scale);
                        ctx.drawImage(img, 0, 0);

                        const pngData = canvas.toDataURL('image/png');
                        resolve(pngData);
                    } catch (e) {
                        console.error('Canvas export failed (Tainted):', e);
                        reject(e);
                    }
                };

                img.onerror = (err) => {
                    console.error('Image load failed:', err);
                    reject(new Error('Image load failed'));
                };

                img.src = dataUrl;
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 修复 Mermaid SVG 文本被裁剪的问题（clipPath / textLength）
     */
    private fixMermaidSvgClipping(svg: SVGElement, padX: number, padY: number): void {
        try {
            const clipRects = svg.querySelectorAll('clipPath rect');
            clipRects.forEach(rect => {
                const x = parseFloat(rect.getAttribute('x') || '0');
                const y = parseFloat(rect.getAttribute('y') || '0');
                const width = parseFloat(rect.getAttribute('width') || '0');
                const height = parseFloat(rect.getAttribute('height') || '0');

                if (isFinite(width) && width > 0) {
                    rect.setAttribute('x', (x - padX).toString());
                    rect.setAttribute('width', (width + padX * 2).toString());
                }
                if (isFinite(height) && height > 0) {
                    rect.setAttribute('y', (y - padY).toString());
                    rect.setAttribute('height', (height + padY * 2).toString());
                }
            });

            svg.querySelectorAll('text, tspan').forEach(el => {
                el.removeAttribute('textLength');
                el.removeAttribute('lengthAdjust');
            });

            // 兜底：移除 clipPath 及其引用，彻底避免裁剪
            svg.querySelectorAll('[clip-path]').forEach(el => {
                el.removeAttribute('clip-path');
            });
            svg.querySelectorAll('clipPath').forEach(el => el.remove());
        } catch (error) {
            // ignore
        }
    }

    /**
     * 扩展 Mermaid foreignObject，避免文字宽度被低估导致裁剪
     */
    private expandMermaidForeignObjects(svg: SVGElement, padX: number, padY: number): void {
        try {
            const foreignObjects = svg.querySelectorAll('foreignObject');
            foreignObjects.forEach(fo => {
                const widthAttr = fo.getAttribute('width');
                const heightAttr = fo.getAttribute('height');
                const width = widthAttr ? parseFloat(widthAttr) : NaN;
                const height = heightAttr ? parseFloat(heightAttr) : NaN;

                const text = (fo.textContent || '').trim();
                if (!text || !isFinite(width)) return;

                const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
                const otherCount = text.length - cjkCount;
                const fontSize = 16;
                const extra = Math.max(padX, cjkCount * fontSize * 0.6 + otherCount * fontSize * 0.2);

                const xAttr = fo.getAttribute('x');
                const x = xAttr ? parseFloat(xAttr) : 0;
                const newWidth = width + extra;
                fo.setAttribute('width', newWidth.toString());
                fo.setAttribute('x', (x - extra / 2).toString());

                if (isFinite(height)) {
                    const yAttr = fo.getAttribute('y');
                    const y = yAttr ? parseFloat(yAttr) : 0;
                    const newHeight = height + padY * 2;
                    fo.setAttribute('height', newHeight.toString());
                    fo.setAttribute('y', (y - padY).toString());
                }

                const div = fo.querySelector('div') as HTMLElement | null;
                if (div) {
                    div.style.overflow = 'visible';
                    div.style.width = '100%';
                    div.style.maxWidth = 'none';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.justifyContent = 'center';
                    div.style.whiteSpace = 'nowrap';
                    div.style.height = '100%';
                    div.style.lineHeight = '1.2';
                    div.style.padding = '0';
                    div.style.boxSizing = 'border-box';
                    div.style.transform = 'translateY(-0.1em)';
                    div.style.transformOrigin = 'center';

                    div.querySelectorAll('p, span').forEach(child => {
                        const childEl = child as HTMLElement;
                        childEl.style.margin = '0';
                        childEl.style.padding = '0';
                        childEl.style.lineHeight = '1.2';
                    });
                }
            });
        } catch (error) {
            // ignore
        }
    }

    /**
     * 清理 Mermaid SVG 中的编辑器残留节点，避免文本偏下和裁剪
     */
    private cleanMermaidSvgTextArtifacts(svg: SVGElement): void {
        try {
            // 移除 ProseMirror 的 trailingBreak
            svg.querySelectorAll('br.ProseMirror-trailingBreak').forEach(br => br.remove());

            // 清理 foreignObject 内空段落与空 span
            svg.querySelectorAll('foreignObject').forEach(fo => {
                fo.querySelectorAll('p').forEach(p => {
                    const text = (p.textContent || '').replace(/\u00a0/g, ' ').trim();
                    const hasOnlyBr = p.querySelectorAll('br').length > 0 && p.querySelectorAll('br').length === p.querySelectorAll('*').length;
                    if (text.length === 0 || hasOnlyBr) {
                        p.remove();
                    }
                });

                // 将 span.nodeLabel 内的 <p> 扁平化，避免 block 元素影响垂直居中
                fo.querySelectorAll('span.nodeLabel > p').forEach(p => {
                    const span = p.parentElement as HTMLElement | null;
                    if (!span) return;
                    const text = (p.textContent || '').replace(/\u00a0/g, ' ').trim();
                    if (text.length > 0) {
                        span.textContent = text;
                    } else {
                        p.remove();
                    }
                });

                // 清理空 span
                fo.querySelectorAll('span').forEach(span => {
                    const text = (span.textContent || '').replace(/\u00a0/g, ' ').trim();
                    if (text.length === 0) {
                        span.remove();
                    }
                });
            });
        } catch (error) {
            // ignore
        }
    }

    /**
     * 将 MathJax 公式转换为内联 SVG
     * @param htmlContent HTML 内容
     * @param markdown 原始 Markdown 内容（用于提取 TeX 源码）
     */
    private async convertMathToSVG(htmlContent: string, markdown?: string): Promise<string> {
        if (!markdown) return htmlContent;

        try {
            // 动态导入 MathJax
            const { mathjax } = await import('mathjax-full/js/mathjax.js');
            const { TeX } = await import('mathjax-full/js/input/tex.js');
            const { SVG } = await import('mathjax-full/js/output/svg.js');
            const { liteAdaptor } = await import('mathjax-full/js/adaptors/liteAdaptor.js');
            const { RegisterHTMLHandler } = await import('mathjax-full/js/handlers/html.js');
            const { AllPackages } = await import('mathjax-full/js/input/tex/AllPackages.js');

            const adaptor = liteAdaptor();
            RegisterHTMLHandler(adaptor);

            const tex = new TeX({ packages: AllPackages });
            const svg = new SVG({ fontCache: 'none' });
            const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

            // 0. 在提取前先保护代码块和行内代码
            const codeBlocks: Map<string, string> = new Map();
            let codeBlockId = 0;
            let protectedMarkdown = markdown;

            protectedMarkdown = protectedMarkdown.replace(/```[\s\S]*?```/g, (match) => {
                const id = `__MATH_PROTECTED_${codeBlockId++}__`;
                codeBlocks.set(id, match);
                return id;
            });

            protectedMarkdown = protectedMarkdown.replace(/`[^`\n]*?`/g, (match) => {
                const id = `__MATH_PROTECTED_${codeBlockId++}__`;
                codeBlocks.set(id, match);
                return id;
            });

            // 1. 提取所有公式
            const formulas: Array<{ tex: string; isBlock: boolean; pos: number }> = [];

            // 块公式 ($$...$$) 和 \begin{...}...\end{...}
            const blockRegex = /\$\$([\s\S]+?)\$\$/g;
            let match: RegExpExecArray | null;
            while ((match = blockRegex.exec(protectedMarkdown)) !== null) {
                const currentMatch = match;
                formulas.push({ tex: currentMatch[1].trim(), isBlock: true, pos: currentMatch.index });
            }

            const envRegex = /\\begin\{([a-z*]+)\}[\s\S]+?\\end\{\1\}/gi;
            while ((match = envRegex.exec(protectedMarkdown)) !== null) {
                const currentMatch = match;
                const isInside = formulas.some(f => currentMatch.index >= f.pos && currentMatch.index < (f.pos + f.tex.length + 4));
                if (!isInside) {
                    formulas.push({ tex: currentMatch[0], isBlock: true, pos: currentMatch.index });
                }
            }

            // 2. 提取行内公式 ($...$)
            const inlineRegex = /(?<!\$)\$((?:[^\$\n\\]|\\.)+?)\$(?!\$)/g;
            while ((match = inlineRegex.exec(protectedMarkdown)) !== null) {
                const currentMatch = match;
                const texStr = currentMatch[1].trim();
                if (texStr) {
                    formulas.push({ tex: texStr, isBlock: false, pos: currentMatch.index });
                }
            }
            formulas.sort((a, b) => a.pos - b.pos);

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const placeholderMap = new Map<string, string>();

            // 查找所有顶层 mjx-container
            const containers = Array.from(doc.querySelectorAll('mjx-container')).filter(el => {
                return !el.parentElement?.closest('mjx-container');
            });

            this.mathJaxPlaceholderMap.clear();
            // debug log removed

            for (let i = 0; i < containers.length; i++) {
                if (i >= formulas.length) break;

                const container = containers[i];
                const formula = formulas[i];
                try {
                    // 转换 TeX 为 LiteNode (mjx-container)
                    const containerNode = html.convert(formula.tex, { display: formula.isBlock });
                    const svgNode = adaptor.firstChild(containerNode);
                    const styleNode = adaptor.lastChild(containerNode);

                    if (!svgNode) continue;

                    // 获取容器属性和对齐信息
                    const containerStyle = adaptor.getAttribute(containerNode, 'style') || '';
                    const vaMatch = containerStyle.match(/vertical-align:\s*([^;]+)/);
                    const mathJaxVA = vaMatch ? vaMatch[1] : 'middle';

                    // 序列化 SVG 和样式
                    const svgHtml = adaptor.outerHTML(svgNode as any);
                    const styleHtml = styleNode && (adaptor as any).kind(styleNode) === 'style'
                        ? adaptor.outerHTML(styleNode as any)
                        : '';

                    // 直接解析 SVG，避免在 mjx-container 中反复包装导致结构异常
                    const svgSource = svgHtml.includes('xmlns=') ? svgHtml : svgHtml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                    const svgDoc = parser.parseFromString(svgSource, 'image/svg+xml');
                    const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;

                    if (svgElement && svgElement.tagName.toLowerCase() === 'svg') {
                        // 如果有样式节点，附加到 svg 内部
                        if (styleHtml) {
                            const styleDoc = parser.parseFromString(styleHtml, 'text/html');
                            const styleEl = styleDoc.querySelector('style');
                            if (styleEl) {
                                const styleNode = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
                                styleNode.textContent = styleEl.textContent || '';
                                svgElement.insertBefore(styleNode, svgElement.firstChild);
                            }
                        }

                        // 内联样式
                        this.inlineSvgStyles(svgElement);

                        // 最终布局调整
                        svgElement.setAttribute('data-formula', formula.tex);
                        svgElement.setAttribute('aria-hidden', 'true');

                        // 从容器中获取更多有用样式
                        const containerColor = adaptor.getStyle(containerNode, 'color') || 'inherit';
                        const containerFontSize = adaptor.getStyle(containerNode, 'font-size') || 'inherit';

                        Object.assign(svgElement.style, {
                            display: 'initial',
                            verticalAlign: mathJaxVA,
                            flexShrink: '0',
                            height: 'auto',
                            maxWidth: '300% !important',
                            color: containerColor,
                            fontSize: containerFontSize
                        });

                        const serializer = new XMLSerializer();
                        const svgString = serializer.serializeToString(svgElement);

                        // 创建占位符元素 (使用更独特的标记)
                        const placeholderId = `@@@MATH_SVG_PLACEHOLDER_${i}@@@`;
                        const placeholder = doc.createElement(formula.isBlock ? 'section' : 'span');
                        placeholder.textContent = placeholderId;

                        if (formula.isBlock) {
                            Object.assign((placeholder as HTMLElement).style, {
                                textAlign: 'center',
                                margin: '1em 0',
                                maxWidth: '100%',
                                overflowX: 'auto',
                                display: 'block',
                                lineHeight: '1.75',
                                color: containerColor,
                                fontSize: containerFontSize
                            });
                            ((placeholder as HTMLElement).style as any).webkitOverflowScrolling = 'touch';
                        } else {
                            (placeholder as HTMLElement).style.display = 'inline-block';
                            (placeholder as HTMLElement).style.verticalAlign = 'middle';
                        }

                        container.replaceWith(placeholder);
                        this.mathJaxPlaceholderMap.set(placeholderId, svgString);
                        // debug log removed
                    }
                } catch (e) {
                    console.error(`[MathJax] Error formula ${i}:`, e);
                }
            }

            // 序列化 HTML 并返回 (保留占位符以便后续在最终字符串级别恢复)
            return doc.body.innerHTML;
        } catch (error) {
            console.error('[MathJax] Conversion failed:', error);
            return htmlContent;
        }
    }


    /**
     * 将 Mermaid 图表转换为 PNG 图片
     */
    private async convertMermaidToPng(htmlContent: string): Promise<string> {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const mermaidContainers = doc.querySelectorAll('.mermaid');

        if (mermaidContainers.length === 0) return htmlContent;

        // debug log removed

        // 使用 for...of 循环处理异步操作
        for (let i = 0; i < mermaidContainers.length; i++) {
            const container = mermaidContainers[i];
            const svg = container.querySelector('svg');

            if (svg) {
                try {
                    this.inlineSvgStyles(svg as SVGSVGElement);
                    const pngData = await this.svgToPng(svg as SVGElement, true); // Treat as block

                    const img = doc.createElement('img');
                    img.src = pngData;
                    img.style.maxWidth = '100%';
                    img.style.display = 'block';
                    img.style.margin = '20px auto';

                    // 清空容器并插入图片
                    container.innerHTML = '';
                    container.appendChild(img);
                    // debug log removed
                } catch (err) {
                    console.error(`[Mermaid] Failed to convert diagram ${i} to PNG:`, err);
                }
            }
        }

        const serializer = new XMLSerializer();
        return serializer.serializeToString(doc.body);
    }

    /**
     * 应用微信样式到 HTML 内容
     * @param htmlContent 原始 HTML 内容
     * @param markdown 原始 Markdown 内容（可选，用于公式转换）
     * @param convertMath 是否转换公式为 SVG（默认 false，仅发布时需要）
     * @returns 应用样式后的 HTML 内容
     */
    public async applyWechatStyle(htmlContent: string, markdown?: string, convertMath: boolean = false, convertMermaid: boolean = false): Promise<string> {
        try {
            // 1. 获取主题 CSS
            const themeCSS = this.getThemeCSS();

            // 2. 包装内容到 wechat-content 容器中
            const wrappedContent = `<div class="wechat-content">${htmlContent}</div>`;

            // 3. 应用代码高亮
            const highlightedContent = await this.applyCodeHighlighting(wrappedContent);

            // 3.5. 转换 MathJax 公式为 SVG（仅在发布时）
            const mathConvertedContent = convertMath
                ? await this.convertMathToSVG(highlightedContent, markdown)
                : highlightedContent;

            // 4. 为中国风主题添加装饰元素（必须在 juice 之前）
            const decoratedContent = this.themeConfig.style === WechatThemeStyle.CHINESE_STYLE
                ? this.addChineseStyleDecorations(mathConvertedContent)
                : mathConvertedContent;

            // 3.6. 转换 Mermaid 为 PNG (仅在明确请求时，例如复制到剪贴板)
            let processedContent = decoratedContent;
            if (convertMermaid) {
                processedContent = await this.convertMermaidToPng(processedContent);
            }

            // 保护特殊元素（Mermaid, SVG, Math等）不被 juice 处理
            const protectedMap = new Map<string, string>();
            let protectionId = 0;

            const protectContent = (html: string): string => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // 查找所有需要保护的元素
                let elementsToProtect: Element[] = [];

                // 1. SVG (同时执行样式内联)
                doc.querySelectorAll('svg').forEach(el => {
                    // Mermaid SVG 文本残留清理
                    if (el.querySelector('foreignObject')) {
                        this.cleanMermaidSvgTextArtifacts(el as SVGElement);
                    }
                    this.inlineSvgStyles(el as any);
                    elementsToProtect.push(el);
                });

                // 2. Mermaid divs
                doc.querySelectorAll('.mermaid, [class*="mermaid"]').forEach(el => elementsToProtect.push(el));

                // 3. Math elements
                doc.querySelectorAll('.math, .math-inline, .math-block, mjx-container').forEach(el => elementsToProtect.push(el));

                // 4. Diagram pre blocks
                doc.querySelectorAll('pre').forEach(pre => {
                    if (pre.querySelector('svg') ||
                        pre.classList.contains('mermaid')) {
                        elementsToProtect.push(pre);
                    }
                });

                // 关键一步：过滤掉嵌套的元素，只保留最外层的元素
                elementsToProtect = elementsToProtect.filter((elA) => {
                    const isNested = elementsToProtect.some((elB) => {
                        return elA !== elB && elB.contains(elA);
                    });
                    return !isNested;
                });

                // 替换为占位符
                const serializer = new XMLSerializer();
                elementsToProtect.forEach(el => {
                    if (!el.parentElement) return;

                    const id = `__WECHAT_PROTECTED_${protectionId++}__`;
                    const content = serializer.serializeToString(el);
                    protectedMap.set(id, content);

                    const placeholder = doc.createElement('div');
                    placeholder.id = id;
                    placeholder.className = 'wechat-protected-placeholder';
                    placeholder.setAttribute('style', 'display: none;');

                    el.parentElement.replaceChild(placeholder, el);
                });

                return serializer.serializeToString(doc.body);
            };

            const contentToInline = protectContent(decoratedContent);

            // 4. 动态导入并使用 juice 将 CSS 内联到 HTML 中
            const { inlineContent } = await import('juice');
            const inlineResult = inlineContent(contentToInline, themeCSS, {
                applyStyleTags: true,
                removeStyleTags: true,
                preserveMediaQueries: false,
                preserveFontFaces: false,
            });

            // 还原受保护的内容
            let styledContent = inlineResult;

            protectedMap.forEach((content, id) => {
                const regex = new RegExp(`<div[^>]*id="${id}"[^>]*></div>|<div[^>]*id="${id}"[^>]*/>`, 'g');

                if (!regex.test(styledContent)) {
                    const idRegex = new RegExp(`<div[^>]*id="${id}"[^>]*>.*?</div>`, 's');
                    if (idRegex.test(styledContent)) {
                        // 使用函数式替换防止 content 中的特殊符号被误解析
                        styledContent = styledContent.replace(idRegex, () => content);
                    }
                } else {
                    styledContent = styledContent.replace(regex, () => content);
                }
            });

            // 移除外层的 wechat-content div
            let finalContent = styledContent;
            this.mathJaxPlaceholderMap.forEach((svgString, id) => {
                // 关键修正：使用 split/join 确保字面量替换，防止 SVG 中的 $ 或 & 符号被特殊处理
                finalContent = finalContent.split(id).join(svgString);
            });
            this.mathJaxPlaceholderMap.clear();

            const outerDivRegex = /^<div class="wechat-content">([\s\S]*)<\/div>$/;
            const match = finalContent.match(outerDivRegex);
            if (match) {
                return match[1];
            }

            return finalContent;
        } catch (error) {
            this.logger.error('应用微信样式时出错:', error);
            return htmlContent;
        }
    }
}

/**
 * 应用微信样式的便捷函数
 */
export async function applyWechatStyle(htmlContent: string, app: App, themeConfig?: ThemeConfig, markdown?: string, convertMath: boolean = false, convertMermaid: boolean = false): Promise<string> {
    const styler = new WechatStyler(app, themeConfig);
    return await styler.applyWechatStyle(htmlContent, markdown, convertMath, convertMermaid);
}
