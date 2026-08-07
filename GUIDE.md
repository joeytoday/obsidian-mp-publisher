# MP Publisher 使用指南

写完 Markdown，想直接发到公众号？这个插件就是干这事的。

## 主要功能

### 预览和复制

打开一篇 Markdown 笔记，通过左侧边栏的发送图标（或命令面板搜索 `MP Publisher`）打开预览面板。右侧会实时显示公众号排版效果，点击「复制到公众号」，粘贴到微信编辑器就行。

<video src="https://github.com/user-attachments/assets/b62e82a0-9b3c-4406-8007-1bbb6b9b7bac"  controls></video>

### 主题切换

预览面板顶部的下拉菜单可以快速切换主题。内置了 8 个主题，也支持社区投稿和自定义主题。

想更精细地管理主题，在设置页点击「打开主题管理」，或者命令面板搜索「打开主题管理」。

<video src="https://github.com/user-attachments/assets/78e8df0e-ea0d-4902-bcb5-dd384e19fefe"  controls></video>


### 主题管理

在主题管理界面：
- **点击卡片**切换当前使用的主题
- **☑ 勾选框**控制该主题是否出现在预览界面的快速切换下拉列表中
- **👁 预览**在侧边栏预览主题效果
- **</> 代码**查看或编辑主题的 CSS 源码

### 自定义主题

两种方式：
1. 在主题管理界面底部新建主题，直接写 CSS
2. 把 `.css` 文件放到插件目录的 `custom/` 文件夹下，重启后自动加载

编写自定义主题前建议先看 [CSS 主题编写指南](https://github.com/joeytoday/obsidian-mp-publisher/blob/main/CSS_THEME_GUIDE.md)。

### 直接发布

如果配置了微信公众号的 AppID 和 AppSecret，可以直接从 Obsidian 发布草稿到公众号后台，不用手动复制粘贴。

配置步骤：
1. 登录[微信公众平台](https://mp.weixin.qq.com/) → 设置与开发 → 基本配置
2. 记录 AppID 和 AppSecret
3. 设置 IP 白名单：填入你当前的 IP 地址。家用宽带 IP 经常变？直接填 `0.0.0.0/0` 允许所有 IP，省去频繁更新的麻烦
4. 在插件设置中添加公众号，填入 AppID 和 AppSecret 即可

发布弹窗中的封面图为可选：不选时自动使用正文中第一张成功上传的图片作为封面；正文没有可用图片时会提示手动选择（微信图文消息的封面为必填）。

<video src="https://github.com/user-attachments/assets/24288345-b5c8-4613-956b-78b622317d95"  controls></video>

### 从属性提取标题、描述和作者

发布时可以从 Markdown frontmatter 中自动提取标题、描述和作者，填充到发布表单，省去手动填写。属性名支持自定义（默认 `title`、`description` 和 `author`）。

在设置中开启「从属性提取标题、描述和作者」即可使用。

<img width="818" height="249" alt="设置中开启从属性提取" src="https://github.com/user-attachments/assets/27f958a5-25d6-45c5-a3f9-ac7951268d82" />

<!-- obsidian -->
属性设置 | 效果
-- | --
<img width="376" height="207" alt="属性设置" src="https://github.com/user-attachments/assets/68af950d-eb53-4182-a39b-a59848224d4e" /> | <img width="539" height="265" alt="发布效果" src="https://github.com/user-attachments/assets/35474d7e-baa1-4914-99de-a3d648d10f71" />

发布弹窗中也新增了描述输入框，内容会同步到微信草稿的摘要字段（120 字以内），可选填。作者字段（16 字以内）会同步到微信草稿的作者字段，显示在公众号文章标题下方，支持从发布过的历史作者中选择，也可以直接输入新作者，输入过的作者会自动进入候选列表。

### 图片描述

开启后，图片下方的 alt 文字会以居中灰色小字显示在图片下方，复制/发布到公众号后样式保留。

在设置中开启「图片描述」即可使用。写法：`![这是图片描述](图片链接)`。

<img width="825" height="322" alt="图片描述设置" src="https://github.com/user-attachments/assets/716c8f31-b4d0-4bf2-9937-e6017e722bab" />

<!-- obsidian -->
Obsidian | 公众号预览
-- | --
<img width="694" height="432" alt="Obsidian 效果" src="https://github.com/user-attachments/assets/e4ebdc6b-e0a8-4d1e-8b70-921edf503db1" /> | <img width="635" height="406" alt="公众号预览效果" src="https://github.com/user-attachments/assets/ff550874-3fb9-4932-9c30-68840bdc57f9" />

### 脚注

支持 Markdown 脚注语法（`[^1]`）。正文中的脚注编号显示为 `[1]` 上标格式，文末脚注列表格式为 `[1] 文本：url`，方便阅读。

### 数学公式

支持 LaTeX 数学公式（`$...$` 行内，`$$...$$` 块级），发布时自动转为图片，微信公众号能正常显示。在设置里可以开关这个功能。

### 伪元素自动转换

CSS `::before`/`::after` 伪元素和计数器在复制/发布时会自动转为真实 DOM 元素，确保公众号编辑器完美兼容，无需手动处理。
