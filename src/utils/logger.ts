import { App } from 'obsidian';

/**
 * 日志工具类 - 统一管理日志输出
 */
export class Logger {
    private static instance: Logger;
    private debugMode: boolean = false;
    private app: App;

    private constructor(app: App) {
        this.app = app;
    }

    public static getInstance(app: App): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(app);
        }
        return Logger.instance;
    }

    public setDebugMode(enabled: boolean) {
        this.debugMode = enabled;
    }

    public isDebugMode(): boolean {
        return this.debugMode;
    }

    public debug(...args: unknown[]): void {
        if (this.debugMode) {
            console.debug('[DEBUG]', ...args);
        }
    }

    public info(...args: unknown[]): void {
        console.info('[INFO]', ...args);
    }

    public warn(...args: unknown[]): void {
        console.warn('[WARN]', ...args);
    }

    public error(...args: unknown[]): void {
        console.error('[ERROR]', ...args);
    }
}
