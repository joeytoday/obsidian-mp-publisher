import { App } from 'obsidian';
import type { DocumentMetadata } from '../types/metadata';

export interface MetadataListItem {
    filePath: string;
    metadata: DocumentMetadata;
    lastUsedAt: number;
    imageCount: number;
    hasDraft: boolean;
}

export class DocumentMetadataStore {
    private app: App;
    private pluginId: string;
    private store: Record<string, DocumentMetadata> = {};
    private initialized = false;

    constructor(app: App, pluginId: string) {
        this.app = app;
        this.pluginId = pluginId;
    }

    get filePath(): string {
        return `${this.app.vault.configDir}/plugins/${this.pluginId}/document-metadata.json`;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        const adapter = this.app.vault.adapter;
        const pluginDir = `${this.app.vault.configDir}/plugins/${this.pluginId}`;

        if (!(await adapter.exists(pluginDir))) {
            await adapter.mkdir(pluginDir);
        }

        if (!(await adapter.exists(this.filePath))) {
            this.store = {};
            await this.persist();
            this.initialized = true;
            return;
        }

        try {
            const content = await adapter.read(this.filePath);
            const parsed = content ? JSON.parse(content) : {};
            this.store = this.normalizeStore(parsed);
        } catch (error) {
            console.error('读取 document metadata 文件失败，已回退为空数据:', error);
            this.store = {};
            await this.persist();
        }

        this.initialized = true;
    }

    get(filePath: string): DocumentMetadata | null {
        return this.store[filePath] || null;
    }

    getAll(): Record<string, DocumentMetadata> {
        return { ...this.store };
    }

    async set(filePath: string, metadata: DocumentMetadata): Promise<void> {
        this.store[filePath] = metadata;
        await this.persist();
    }

    async remove(filePath: string): Promise<boolean> {
        if (!this.store[filePath]) return false;
        delete this.store[filePath];
        await this.persist();
        return true;
    }

    async removeMany(filePaths: string[]): Promise<number> {
        let removed = 0;
        for (const filePath of filePaths) {
            if (!this.store[filePath]) continue;
            delete this.store[filePath];
            removed++;
        }
        if (removed > 0) {
            await this.persist();
        }
        return removed;
    }

    async importLegacy(legacyData: Record<string, DocumentMetadata>): Promise<number> {
        let imported = 0;
        for (const [filePath, rawMetadata] of Object.entries(legacyData || {})) {
            const metadata = this.normalizeMetadata(rawMetadata);
            if (Object.keys(metadata.images).length === 0 && !metadata.draft) {
                continue;
            }
            this.store[filePath] = metadata;
            imported++;
        }
        if (imported > 0) {
            await this.persist();
        }
        return imported;
    }

    listEntries(): MetadataListItem[] {
        return Object.entries(this.store)
            .map(([filePath, metadata]) => {
                const normalized = this.normalizeMetadata(metadata);
                return {
                    filePath,
                    metadata: normalized,
                    lastUsedAt: this.getLastUsedAt(normalized),
                    imageCount: Object.keys(normalized.images || {}).length,
                    hasDraft: !!normalized.draft,
                };
            })
            .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    }

    async cleanupExpired(retentionDays: number): Promise<number> {
        if (retentionDays <= 0) return 0;

        const now = Date.now();
        const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        const toDelete: string[] = [];

        for (const [filePath, metadata] of Object.entries(this.store)) {
            const lastUsedAt = this.getLastUsedAt(metadata);
            if (lastUsedAt <= 0 || now - lastUsedAt > retentionMs) {
                toDelete.push(filePath);
            }
        }

        if (toDelete.length > 0) {
            await this.removeMany(toDelete);
        }

        return toDelete.length;
    }

    private async persist(): Promise<void> {
        await this.app.vault.adapter.write(this.filePath, JSON.stringify(this.store, null, 2));
    }

    private normalizeStore(raw: unknown): Record<string, DocumentMetadata> {
        if (!raw || typeof raw !== 'object') return {};

        const normalized: Record<string, DocumentMetadata> = {};
        for (const [filePath, metadata] of Object.entries(raw as Record<string, DocumentMetadata>)) {
            normalized[filePath] = this.normalizeMetadata(metadata);
        }
        return normalized;
    }

    private normalizeMetadata(metadata: DocumentMetadata): DocumentMetadata {
        const normalized: DocumentMetadata = {
            images: metadata?.images || {},
            draft: metadata?.draft,
            lastUsedAt: metadata?.lastUsedAt,
        };

        if (!normalized.lastUsedAt || normalized.lastUsedAt <= 0) {
            normalized.lastUsedAt = this.deriveLastUsedAt(normalized);
        }

        return normalized;
    }

    private getLastUsedAt(metadata: DocumentMetadata): number {
        if (metadata.lastUsedAt && metadata.lastUsedAt > 0) {
            return metadata.lastUsedAt;
        }
        return this.deriveLastUsedAt(metadata);
    }

    private deriveLastUsedAt(metadata: DocumentMetadata): number {
        const draftTime = metadata.draft?.updateTime || 0;
        const imageTimes = Object.values(metadata.images || {}).map(item => item.uploadTime || 0);
        const maxImageTime = imageTimes.length > 0 ? Math.max(...imageTimes) : 0;
        const derived = Math.max(draftTime, maxImageTime, 0);
        return derived > 0 ? derived : Date.now();
    }
}
