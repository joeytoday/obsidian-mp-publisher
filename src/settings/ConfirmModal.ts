import { App, Modal, Setting } from 'obsidian';

export class ConfirmModal extends Modal {
    private message: string;
    private onConfirm: () => void | Promise<void>;

    constructor(app: App, title: string, message: string, onConfirm: () => void | Promise<void>) {
        super(app);
        this.titleEl.setText(title);
        this.message = message;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('p', { text: this.message });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('确认')
                .setCta()
                .onClick(() => {
                    void this.onConfirm();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('取消')
                .onClick(() => this.close()));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}