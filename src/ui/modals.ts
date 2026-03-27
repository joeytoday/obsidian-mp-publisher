import { App, MarkdownView, Modal, Notice, Setting, TFile } from 'obsidian';
import MPPlugin from '../main';
import { markdownToHtml } from '../converter';
import { WechatPublisher } from '../publisher/wechat';

/** 保存选中的素材信息到 sessionStorage */
function saveSelectedMaterial(material: { media_id: string; url?: string; name?: string; isLocal?: boolean }): void {
	sessionStorage.setItem('selected_material', JSON.stringify(material));
}

/** 获取选中的素材信息 */
function getSelectedMaterial(): { media_id: string; url?: string; name?: string } | null {
	const data = sessionStorage.getItem('selected_material');
	return data ? JSON.parse(data) : null;
}

/** 设置按钮为加载状态 */
function setButtonLoading(button: HTMLButtonElement, loadingText: string): void {
	button.disabled = true;
	button.textContent = loadingText;
}

/** 重置按钮状态 */
function resetButton(button: HTMLButtonElement, originalText: string): void {
	button.disabled = false;
	button.textContent = originalText;
}

// 封面图选择模态框
export class CoverImageModal extends Modal {
	plugin: MPPlugin;
	selectedMediaId: string = '';
	onImageSelected: (mediaId: string) => void;

	constructor(app: App, plugin: MPPlugin, onImageSelected: (mediaId: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onImageSelected = onImageSelected;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('wechat-cover-image-modal');

		const modalEl = (this.containerEl.querySelector('.modal') as HTMLElement);
		if (modalEl) {
			modalEl.classList.add('mod-wechat-cover');
		}

		contentEl.createEl('h2', { text: '选择封面图' });

		// 创建标签页切换
		const tabsContainer = contentEl.createDiv({ cls: 'wechat-cover-tabs' });

		// 素材库标签
		const materialTab = tabsContainer.createDiv({ cls: 'wechat-cover-tab active' });
		materialTab.textContent = '素材库';

		// 本地图片标签
		const localTab = tabsContainer.createDiv({ cls: 'wechat-cover-tab' });
		localTab.textContent = '本地图片';

		// 内容容器
		const contentContainer = contentEl.createDiv({ cls: 'wechat-cover-content' });

		// 素材库内容
		const materialContent = contentContainer.createDiv({ cls: 'wechat-material-content' });

		// 加载中提示
		const loadingEl = materialContent.createEl('div', {
			text: '正在加载素材...',
			cls: 'wechat-material-loading'
		});

		// 创建素材网格容器
		const materialGrid = materialContent.createDiv({ cls: 'material-grid' });

		// 创建分页控制器
		const paginationContainer = materialContent.createDiv({ cls: 'pagination-container' });

		const prevButton = paginationContainer.createEl('button', { text: '上一页' });
		prevButton.disabled = true;

		const pageInfo = paginationContainer.createEl('span');
		pageInfo.textContent = '第1页';

		const nextButton = paginationContainer.createEl('button', { text: '下一页' });
		nextButton.disabled = true;

		// 本地上传内容
		const localContent = contentContainer.createDiv({ cls: 'wechat-local-content content-hidden' });

		// 创建文件选择按钮容器
		const fileInputContainer = localContent.createDiv({ cls: 'file-input-container' });
		const fileInput = fileInputContainer.createEl('input');
		fileInput.type = 'file';
		fileInput.accept = 'image/*';

		// 创建预览区域容器
		const imagePreviewContainer = localContent.createDiv({ cls: 'image-preview-container' });
		const imagePreview = imagePreviewContainer.createEl('div', { cls: 'image-preview' });
		imagePreview.textContent = '预览区域';

		// 底部按钮
		const buttonContainer = contentEl.createDiv({ cls: 'wechat-cover-buttons' });

		// 取消按钮
		const cancelButton = buttonContainer.createEl('button', { text: '取消' });

		// 素材库确认按钮
		const materialConfirmButton = buttonContainer.createEl('button', {
			text: '确认',
			cls: 'wechat-confirm-button'
		});
		materialConfirmButton.disabled = true;

		// 本地图片确认按钮
		const localConfirmButton = buttonContainer.createEl('button', {
			text: '确认',
			cls: 'wechat-confirm-button content-hidden'
		});
		localConfirmButton.disabled = true;

		cancelButton.addEventListener('click', () => this.close());

		// 添加分页相关变量
		let currentPage = 0;
		const pageSize = 20;
		let totalCount = 0;

		// 加载素材库函数
		const loadMaterialsPage = async (page: number) => {
			try {
				materialGrid.empty();
				loadingEl.classList.add('content-visible');
				loadingEl.classList.remove('content-hidden');

				const materials = await this.plugin.wechatPublisher.getWechatMaterials(page, pageSize);

				if (materials.items.length === 0 && page === 0) {
					materialGrid.createEl('div', { text: '没有找到素材，请上传新图片' });
					return;
				}

				// 更新分页信息
				totalCount = materials.totalCount;
				currentPage = page;
				pageInfo.textContent = `第${page + 1}页 / 共${Math.ceil(totalCount / pageSize)}页`;

				// 更新分页按钮状态
				prevButton.disabled = page === 0;
				nextButton.disabled = (page + 1) * pageSize >= totalCount;

				// 加载素材项
				loadingEl.classList.add('content-hidden');
				loadingEl.classList.remove('content-visible');

				for (const material of materials.items) {
					const materialItem = materialGrid.createDiv({
						cls: 'material-item material-item-unselected'
					});

					// 添加图片
					const img = materialItem.createEl('img');
					img.src = material.url;

					// 添加素材名称
					const nameEl = materialItem.createEl('div', {
						text: material.name || '未命名素材',
						cls: 'material-item-name'
					});

					// 点击选择素材
					materialItem.addEventListener('click', () => {
						// 移除其他选中项的样式
						const items = materialGrid.querySelectorAll('.material-item');
						items.forEach((item: HTMLElement) => {
							item.classList.remove('material-item-selected');
							item.classList.add('material-item-unselected');
						});

						// 设置当前选中项的样式
						materialItem.classList.remove('material-item-unselected');
						materialItem.classList.add('material-item-selected');

						// 设置选中的media_id
						this.selectedMediaId = material.media_id;

						// 存储当前选中的素材信息
						saveSelectedMaterial({
							media_id: material.media_id,
							url: material.url,
							name: material.name
						});

						// 启用素材库确认按钮
						materialConfirmButton.disabled = false;
					});
				}
			} catch (error) {
				console.error('加载素材库失败:', error);
				loadingEl.textContent = '加载素材库失败，请检查网络连接';
			}
		};

		// 标签切换事件
		materialTab.addEventListener('click', () => {
			materialTab.classList.add('active');
			localTab.classList.remove('active');

			materialContent.classList.add('content-visible');
			materialContent.classList.remove('content-hidden');
			localContent.classList.add('content-hidden');
			localContent.classList.remove('content-visible');

			// 切换确认按钮
			materialConfirmButton.classList.remove('content-hidden');
			localConfirmButton.classList.add('content-hidden');

			// 重置确认按钮状态
			materialConfirmButton.disabled = true;
		});

		localTab.addEventListener('click', () => {
			localTab.classList.add('active');
			materialTab.classList.remove('active');

			materialContent.classList.add('content-hidden');
			materialContent.classList.remove('content-visible');
			localContent.classList.add('content-visible');
			localContent.classList.remove('content-hidden');

			// 切换确认按钮
			materialConfirmButton.classList.add('content-hidden');
			localConfirmButton.classList.remove('content-hidden');

			// 重置确认按钮状态
			localConfirmButton.disabled = true;
		});

		// 文件选择事件
		let selectedFileData: ArrayBuffer | null = null;
		fileInput.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.files && target.files.length > 0) {
				const selectedFile = target.files[0];

				// 读取文件数据（用于上传）
				const dataReader = new FileReader();
				dataReader.onload = (e) => {
					if (e.target && e.target.result) {
						selectedFileData = e.target.result as ArrayBuffer;
					}
				};
				dataReader.readAsArrayBuffer(selectedFile);

				// 显示预览
				const previewReader = new FileReader();
				previewReader.onload = (e) => {
					if (e.target && e.target.result) {
						imagePreview.empty();
						const img = imagePreview.createEl('img', {
							cls: 'preview-image'
						});
						img.src = e.target.result as string;

						// 保存预览图URL
						sessionStorage.setItem('preview_image_url', e.target.result as string);
					}
				};
				previewReader.readAsDataURL(selectedFile);

				// 启用本地图片确认按钮
				localConfirmButton.disabled = false;

				// 保存选中的文件
				sessionStorage.setItem('selected_file', JSON.stringify({
					name: selectedFile.name,
					type: selectedFile.type,
					size: selectedFile.size
				}));
			} else {
				imagePreview.textContent = '预览区域';
				localConfirmButton.disabled = true;
				selectedFileData = null;
				sessionStorage.removeItem('preview_image_url');
				sessionStorage.removeItem('selected_file');
			}
		});

		// 素材库确认按钮事件
		materialConfirmButton.addEventListener('click', () => {
			const material = getSelectedMaterial();
			if (!material) {
				new Notice('请先选择图片');
				return;
			}
			this.onImageSelected(material.media_id);
			this.close();
		});

		// 本地图片确认按钮事件
		localConfirmButton.addEventListener('click', async () => {
			const selectedFileInfo = sessionStorage.getItem('selected_file');
			const previewImageUrl = sessionStorage.getItem('preview_image_url');

			if (!selectedFileInfo || !previewImageUrl || !selectedFileData) {
				new Notice('请先选择图片');
				return;
			}

			const fileInfo = JSON.parse(selectedFileInfo);

			// 立即上传图片到微信获取 media_id
			setButtonLoading(localConfirmButton, '正在上传...');

			try {
				const mediaId = await this.plugin.wechatPublisher.uploadImageToWechat(
					selectedFileData,
					fileInfo.name
				);

				if (!mediaId) {
					new Notice('上传封面图失败，请重试');
					resetButton(localConfirmButton, '确认');
					return;
				}

				saveSelectedMaterial({
					media_id: mediaId,
					url: previewImageUrl,
					name: fileInfo.name,
					isLocal: false,
				});

				this.onImageSelected(mediaId);
				new Notice('封面图上传成功');
				this.close();
			} catch (error) {
				console.error('上传封面图失败:', error);
				new Notice('上传封面图失败：' + (error.message || '未知错误'));
				resetButton(localConfirmButton, '确认');
			}
		});

		// 分页按钮事件
		prevButton.addEventListener('click', () => {
			if (currentPage > 0) {
				loadMaterialsPage(currentPage - 1);
			}
		});

		nextButton.addEventListener('click', () => {
			if ((currentPage + 1) * pageSize < totalCount) {
				loadMaterialsPage(currentPage + 1);
			}
		});

		// 初始化加载第一页
		await loadMaterialsPage(0);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 发布模态框
export class PublishModal extends Modal {
	plugin: MPPlugin;
	markdownView: MarkdownView;
	titleInput: HTMLInputElement;
	platformSelect: HTMLSelectElement;
	coverImagePreview: HTMLElement;
	selectedCoverMediaId: string = '';

	constructor(app: App, plugin: MPPlugin, markdownView: MarkdownView) {
		super(app);
		this.plugin = plugin;
		this.markdownView = markdownView;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 添加相同的处理
		const modalEl = (this.containerEl.querySelector('.modal') as HTMLElement);
		if (modalEl) {
			modalEl.classList.add('mod-publish');
		}

		contentEl.createEl('h2', { text: '发布到内容平台' });

		// 标题输入
		const titleSetting = new Setting(contentEl)
			.setName('标题')
			.setDesc('文章标题');

		this.titleInput = document.createElement('input');
		this.titleInput.type = 'text';
		this.titleInput.value = this.markdownView.file?.basename || '';
		this.titleInput.className = 'full-width-input';

		titleSetting.controlEl.appendChild(this.titleInput);

		// 平台选择
		const platformSetting = new Setting(contentEl)
			.setName('平台')
			.setDesc('选择发布平台');

		this.platformSelect = document.createElement('select');
		this.platformSelect.className = 'enhanced-publisher-platform-selector';

		const wechatOption = document.createElement('option');
		wechatOption.value = 'wechat';
		wechatOption.text = '微信公众号';
		this.platformSelect.appendChild(wechatOption);

		// 未来可以添加更多平台选项

		platformSetting.controlEl.appendChild(this.platformSelect);

		// 添加草稿复选框
		const draftSetting = new Setting(contentEl)
			.setName('草稿')
			.setDesc('当前仅支持保存到草稿箱，后续将支持直接发布');

		const draftCheckbox = document.createElement('input');
		draftCheckbox.type = 'checkbox';
		draftCheckbox.checked = true;
		draftCheckbox.disabled = true;
		draftSetting.controlEl.appendChild(draftCheckbox);

		// 封面图选择（仅对微信公众号显示）
		const coverImageSetting = new Setting(contentEl)
			.setName('封面图')
			.setDesc('选择文章封面图');

		// 创建封面图选择区域的容器
		const coverImageContainer = document.createElement('div');
		coverImageContainer.className = 'cover-container';

		// 封面图预览区域
		this.coverImagePreview = document.createElement('div');
		this.coverImagePreview.className = 'cover-preview';
		this.coverImagePreview.textContent = '无封面图';

		// 选择按钮
		const selectCoverButton = document.createElement('button');
		selectCoverButton.className = 'mod-cta';
		selectCoverButton.textContent = '选择封面图';
		selectCoverButton.addEventListener('click', () => {
			// 打开封面图选择模态框
			const coverImageModal = new CoverImageModal(this.app, this.plugin, (mediaId) => {
				this.selectedCoverMediaId = mediaId;

				// 更新预览区域
				this.coverImagePreview.empty();
				const img = document.createElement('img') as HTMLImageElement;
				img.className = 'preview-image';

				const material = getSelectedMaterial();
				if (material?.url) {
					img.src = material.url;
					this.coverImagePreview.appendChild(img);
				} else {
					this.coverImagePreview.textContent = '已选择封面图';
				}
			});
			coverImageModal.open();
		});

		coverImageContainer.appendChild(this.coverImagePreview);
		coverImageContainer.appendChild(selectCoverButton);

		coverImageSetting.controlEl.appendChild(coverImageContainer);

		// 创建发布按钮容器并居中
		const publishButtonContainer = contentEl.createDiv({
			cls: 'publish-button-container'
		});

		// 发布按钮
		const publishButton = publishButtonContainer.createEl('button', {
			text: '发布',
			cls: 'enhanced-publisher-publish-button'
		});

		publishButton.addEventListener('click', async () => {
			const title = this.titleInput.value;
			const platform = this.platformSelect.value;

			if (!title) {
				new Notice('请输入标题');
				return;
			}

			if (platform === 'wechat' && !this.coverImagePreview.querySelector('img')) {
				new Notice('请选择封面图');
				return;
			}

			if (!this.markdownView.file) {
				new Notice('无法获取当前文件');
				return;
			}

			// 使用 markdownToHtml 渲染内容（通过 juice 内联 CSS，确保样式在公众号后台正确显示）
			const content = this.markdownView.getViewData();
			const htmlContent = await markdownToHtml(
				this.app,
				content,
				this.markdownView.file?.path || '',
				this.plugin.themeManager,
				this.plugin.settings.convertMathToSVG,
			);

			if (platform === 'wechat') {
				if (!this.plugin.settings.wechatAppId || !this.plugin.settings.wechatAppSecret) {
					new Notice('请先在设置中配置微信公众号的AppID和AppSecret');
					return;
				}

				// 检查是否选择了封面图
				if (!this.selectedCoverMediaId) {
					new Notice('请先选择封面图');
					return;
				}

				try {
					// 获取选中的封面图 media_id
					const selectedMaterial = sessionStorage.getItem('selected_material');
					if (selectedMaterial) {
						const material = JSON.parse(selectedMaterial);
						this.selectedCoverMediaId = material.media_id;
					}

					// 再次检查 media_id 是否有效
					if (!this.selectedCoverMediaId) {
						new Notice('封面图 media_id 无效，请重新选择封面图');
						return;
					}

					publishButton.textContent = '正在发布...';
					const success = await this.plugin.publishToWechat(
						title,
						htmlContent,
						this.selectedCoverMediaId,
						this.markdownView.file
					);

					if (success) {
						this.close();
					}
				} catch (error) {
					console.error('发布失败:', error);
					new Notice('发布失败：' + (error.message || '未知错误'));
					publishButton.disabled = false;
					publishButton.textContent = '发布';
				}
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
} 