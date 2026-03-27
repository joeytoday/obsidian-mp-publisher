/**
 * 日志工具 - 统一管理日志输出
 */
export class Logger {
    private static instance: Logger;
    private debugMode: boolean = false;

    private constructor() {}

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setDebugMode(enabled: boolean) {
        this.debugMode = enabled;
    }

    public isDebugMode(): boolean {
        return this.debugMode;
    }

    public debug(...args: any[]): void {
        if (this.debugMode) {
            console.debug('[MP-DEBUG]', ...args);
        }
    }

    public info(...args: any[]): void {
        console.log('[MP-INFO]', ...args);
    }

    public warn(...args: any[]): void {
        console.warn('[MP-WARN]', ...args);
    }

    public error(...args: any[]): void {
        console.error('[MP-ERROR]', ...args);
    }
}
