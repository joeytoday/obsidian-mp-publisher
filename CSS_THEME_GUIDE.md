# MP Publisher CSS 主题编写指南

> 本文档面向 AI 和开发者，说明如何为 MP Publisher 插件编写标准的 CSS 主题文件。

---

## 架构概述

### 渲染管线

Markdown 内容经过以下管线转换为公众号兼容的 HTML：

```
Markdown 源文本
  → Obsidian MarkdownRenderer 渲染为 DOM
  → html-cleaner 清理 Obsidian UI 元素
  → MPConverter.formatContent() 结构化处理
    ├── 列表 ul/ol/li → 纯 section 结构
    ├── 代码块 → 添加 macOS 窗口按钮
    ├── Callout → 内联样式的 section 结构
    ├── 图片 → 解析内部链接
    └── 图片描述（可选） → 在图片下方插入 .mp-image-caption 描述文字
  → ThemeManager.applyTheme() 注入 <style> 标签
  → prerenderPseudoElements() 将 ::before/::after 转为真实 <span> DOM
  → juice 将 CSS 内联到每个元素的 style 属性
  → CopyManager 后处理（代码高亮补全、属性清理）
  → 最终 HTML（复制到剪贴板 / 发布到草稿箱）
```

### 关键约束

**CSS 主题只控制视觉样式**，不控制 DOM 结构。DOM 结构由 `converter.ts` 在主题应用之前完成转换。

主题 CSS 通过两种方式生效：
1. **预览时**：以 `<style>` 标签注入到 `.mp-content-section` 内部
2. **复制/发布时**：通过 [juice](https://github.com/Automattic/juice) 库将 CSS 内联到每个元素的 `style` 属性上

---

## 文件规范

### 存放位置

| 类型 | 路径 | 说明 |
|------|------|------|
| 内置主题 | `src/themes/builtin/*.css` | 需在 `src/themes/index.ts` 中注册 |
| 本地自定义主题 | `<插件目录>/custom/*.css` | 用户自行放置，自动加载 |

### 命名规范

- 文件名使用 **kebab-case**：`my-theme-name.css`
- 内置主题需在 `src/themes/index.ts` 中注册，提供 `id`、`name`、`description` 等元数据

---

## 选择器规范

### 根选择器

**所有样式必须以 `.mp-content-section` 作为前缀**，这是内容区域的根容器。

```css
/* ✅ 正确 */
.mp-content-section h1 { ... }
.mp-content-section .mp-list-item { ... }

/* ❌ 错误 - 缺少根选择器前缀 */
h1 { ... }
.mp-list-item { ... }
```

### 可用的 DOM 结构与选择器

以下是 `converter.ts` 输出的完整 DOM 结构，主题 CSS 只能针对这些元素编写样式：

#### 1. 根容器

```css
.mp-content-section {
  /* 全局字体、字号、颜色、行高、字间距 */
  /* 注意：font-family 和 font-size 会被 ThemeManager 的字体覆盖 CSS 以 !important 覆盖 */
}
```

#### 2. 标题（h1 ~ h6）

Obsidian 原生渲染，标签不做转换。

```css
.mp-content-section h1 { }
.mp-content-section h2 { }
.mp-content-section h3 { }
.mp-content-section h4,
.mp-content-section h5,
.mp-content-section h6 { }
```

#### 3. 段落

```css
.mp-content-section p { }
```

#### 4. 列表（⚠️ 特殊结构）

**列表已被 `converter.ts` 从 `ul/ol/li` 转换为纯 `section` 结构**，以避免微信公众号自动还原列表标签的默认样式。

转换后的 DOM 结构：

```html
<!-- 一级列表容器 -->
<section class="mp-list-section" data-list-type="unordered"
         style="margin: 1em 0 0 0; padding: 0;">
  <!-- 一级列表项（无缩进） -->
  <section class="mp-list-item"
           style="display: block; margin: 0; padding-left: 0; line-height: 1.8;">
    <section style="display: inline; margin-right: 0.25em;">• </section>
    <section style="display: inline;">内容文本</section>
  </section>
  <!-- 二级列表容器（嵌套） -->
  <section class="mp-list-section" data-list-type="ordered"
           style="margin: 0; padding: 0;">
    <!-- 二级列表项（有缩进） -->
    <section class="mp-list-item"
             style="display: block; margin: 0; padding-left: 2em; line-height: 1.8;">
      <section style="display: inline; margin-right: 0.25em;">1. </section>
      <section style="display: inline;">嵌套内容</section>
    </section>
  </section>
</section>
```

**CSS 选择器：**

```css
/* 列表容器 */
.mp-content-section .mp-list-section {
  margin: 1em 0 0 0;
  padding: 0;
  /* 仅设置 color 等继承属性，不要设置 padding-left（由内联样式控制缩进层级） */
}

/* 列表项 */
.mp-content-section .mp-list-item {
  line-height: 1.8;
  color: #333;
  /* 不要设置 margin、padding-left、display（由内联样式控制） */
}
```

**⛔ 禁止使用的选择器：**

```css
/* ❌ 这些元素在最终 DOM 中不存在 */
.mp-content-section ul { }
.mp-content-section ol { }
.mp-content-section li { }
```

#### 5. 引用

```css
.mp-content-section blockquote {
  /* border-left, padding, background, color, font-style, border-radius */
}

.mp-content-section blockquote p {
  margin: 0;
  line-height: inherit;
}
```

#### 6. 代码块

代码块保留原生 `<pre><code>` 结构，`converter.ts` 会在 `<pre>` 内部插入 macOS 风格的窗口按钮（3 个彩色圆点），使用 `<section>` + 内联样式实现。

```css
/* 代码块容器 */
.mp-content-section pre {
  /* background, border-radius, border, box-shadow, margin, padding, font-size, line-height */
  white-space: pre-wrap;  /* 必须，确保长代码自动换行 */
  overflow-x: auto;
}

/* 行内代码 */
.mp-content-section code:not(pre code) {
  /* background, padding, border-radius, color, font-size, border */
}
```

#### 7. 链接

```css
.mp-content-section a {
  /* color, text-decoration, border-bottom */
}
```

#### 8. 强调

```css
.mp-content-section strong { }
.mp-content-section em { }
.mp-content-section del { }
```

#### 9. 表格

```css
.mp-content-section table {
  width: 100%;
  border-collapse: collapse;
  /* border, margin */
}

.mp-content-section th {
  /* background, font-weight, color, border-bottom, padding */
}

.mp-content-section td {
  /* border, padding, color */
}
```

#### 10. 分隔线

```css
.mp-content-section hr {
  border: none;
  /* border-top, margin */
}
```

#### 11. 图片与图片描述

```css
.mp-content-section img {
  max-width: 100%;
  height: auto;
  display: block;
  /* margin, border-radius, box-shadow */
}

/* 图片描述（当用户在设置中开启「图片描述」时出现） */
/* 注意：复制/发布时样式由内联样式控制，此处仅影响预览 */
.mp-content-section .mp-image-caption {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #888;
  margin: 0 0 1em 0;
  padding: 0;
}
```

#### 12. 脚注

```css
.mp-content-section .footnote-ref { }
.mp-content-section .footnote-backref { }
```

#### 13. Callout 提示框（⚠️ 特殊结构）

Callout 已被 `converter.ts` 从 Obsidian 原生结构转换为带内联样式的 `section` 结构。**Callout 的核心样式（背景色、边框色）已通过内联 `style` 属性设置**，主题 CSS 中的 Callout 样式主要用于预览时的微调和覆盖。

```css
/* Callout 容器 */
.mp-content-section .mp-callout {
  border-radius: 6px;
  padding: 12px 16px;
  margin: 1em 0;
  /* border-left, background 由内联样式设置，CSS 中的值作为默认/预览用 */
}

/* Callout 标题行 */
.mp-content-section .mp-callout-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 1em;
  line-height: 1.5;
}

/* Callout 内容区 */
.mp-content-section .mp-callout-content {
  font-size: 0.95em;
  line-height: 1.7;
}

.mp-content-section .mp-callout-content p {
  margin: 4px 0;
  padding: 0;
  line-height: 1.7;
}
```

**Callout 类型变体**（每种类型需要 2 行 CSS）：

```css
.mp-content-section .mp-callout-note { border-left-color: #448aff; background: #e8f0fe; }
.mp-content-section .mp-callout-note .mp-callout-title { color: #448aff; }
```

支持的 Callout 类型：`note`、`info`、`tip`、`hint`、`important`、`warning`、`caution`、`attention`、`danger`、`error`、`bug`、`success`、`check`、`done`、`question`、`help`、`faq`、`failure`、`fail`、`missing`、`abstract`、`summary`、`tldr`、`example`、`todo`、`quote`、`cite`

#### 14. 伪元素自动转换（v2.7.4+）

`prerenderPseudoElements()` 会在 juice 内联之前，将主题 CSS 中的 `::before`/`::after` 规则自动转为真实 `<span>` DOM 元素，公众号编辑器可正常渲染。

**转换后的 class 命名规则：**

| CSS 规则 | 生成的 `<span>` class | 插入位置 |
|----------|----------------------|----------|
| `h1::after` | `h1-dot` | 作为最后一个子元素 |
| `h2::before` | `h2-num` | 作为第一个子元素 |
| `h3::after` | `h3-dot` | 作为最后一个子元素 |
| `blockquote::before` | `bq-mark` | 作为第一个子元素 |
| `.mp-callout::before` | `callout-mark` | 作为第一个子元素 |
| 其他 `tag::before/::after` | `{tag}-before` 或 `{tag}-after` | 根据伪类型决定 |

**计数器支持：**

CSS 计数器（`counter-reset`/`counter-increment`/`counter()`）会被自动计算并填入 `<span>` 文本内容。支持的计数器样式：`decimal`、`decimal-leading-zero`、`upper-roman`、`lower-roman`、`upper-alpha`/`upper-latin`、`lower-alpha`/`lower-latin`。

混合内容也支持：`"Chapter " counter(h2-counter) ": "` 会解析为如 `"Chapter 01: "`。

**注意事项：**
- 转换后的 `<span>` 样式由 juice 从原始 CSS 规则中提取并内联，主题作者无需额外编写样式
- 转换完成后，原始 CSS 中的伪元素规则会被自动移除，不会进入 juice 内联阶段

---

## 样式约束与注意事项

### ⛔ 绝对禁止

| 规则 | 原因 |
|------|------|
| 不要使用 `ul`、`ol`、`li` 选择器 | 列表已转换为 `section` 结构，这些元素在最终 DOM 中不存在 |
| 不要使用 `<p>` 作为列表项标签 | 公众号会将 `<p>` 解析为段落，产生多余空行 |
| 不要在 `.mp-list-item` 上设置 `padding-left` | 缩进由 `.mp-list-section` 容器的内联样式根据嵌套层级动态设置 |
| 不要在 `.mp-list-item` 上设置 `margin` 或 `display` | 这些属性由内联样式精确控制 |
| 不要在 `.mp-list-section` 上设置 `padding-left` | 容器的 `padding-left` 由内联样式根据层级动态设置（顶层 1em，嵌套层 1.5em） |
| 不要使用 `@media` 查询 | juice 内联时会被丢弃（`preserveMediaQueries: false`） |
| 不要使用 `@font-face` | juice 内联时会被丢弃（`preserveFontFaces: false`） |
| 不要使用 CSS 变量 `var(--xxx)` | juice 无法解析 CSS 变量，内联后值会丢失 |
| 不要使用伪元素 `::before`、`::after`（除非了解自动转换机制） | v2.7.4+ 会自动将伪元素转为真实 `<span>` DOM，但 juice 无法直接内联伪元素。详见下方「伪元素自动转换」章节 |
| 不要使用伪类 `:hover`、`:focus` 等 | 公众号不支持交互伪类 |
| 不要使用 `!important` | 会与 ThemeManager 的字体覆盖冲突 |
| 不要使用 `position: fixed/absolute` | 公众号编辑器不支持定位布局 |

### ⚠️ 需要注意

| 规则 | 说明 |
|------|------|
| `font-family` 和 `font-size` 会被覆盖 | ThemeManager 会生成 `!important` 的字体覆盖 CSS，用户在 UI 中选择的字体/字号优先级最高 |
| Callout 的背景色有内联样式，但 border-left 没有 | `converter.ts` 只在 Callout 元素上设置 `background` 的内联样式，`border-left` 不写入内联，由主题 CSS 通过 juice 内联控制 |
| `class` 属性在复制/发布后会被移除 | `CopyManager.cleanupAttributes()` 会移除所有 `class`、`id`、`data-*` 属性，CSS 的作用仅在 juice 内联阶段 |
| 代码块的语法高亮颜色来自 Obsidian | 代码块内 `<span>` 的 `color` 由 `CopyManager.applyComputedStylesToCodeBlocks()` 从 Obsidian 的 computed style 中提取并写入内联样式，主题 CSS 无法控制 |

### ✅ 推荐做法

| 做法 | 说明 |
|------|------|
| 使用具体的颜色值 | 如 `#333`、`rgba(0,0,0,0.5)`，不要用 CSS 变量 |
| 使用 `em` 或 `px` 单位 | 避免 `rem`（公众号根字号不可控） |
| 为 `blockquote p` 设置 `margin: 0` | 避免引用块内段落产生额外间距 |
| 为 `pre` 设置 `white-space: pre-wrap` | 确保长代码行自动换行 |
| 为 `img` 设置 `max-width: 100%` | 防止图片溢出 |
| 为 `table` 设置 `border-collapse: collapse` | 确保表格边框合并 |

---

## 完整模板

以下是一个可直接使用的主题 CSS 模板，包含所有必要的选择器：

```css
/* 主题名称 - 简短描述 */

/* ==================== 全局 ==================== */
.mp-content-section {
  font-size: 16px;
  color: #333;
  line-height: 1.8;
  letter-spacing: 0.03em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ==================== 标题 ==================== */
.mp-content-section h1 {
  margin: 32px 0 16px;
  font-size: 2em;
  font-weight: bold;
  color: #1a1a1a;
  line-height: 1.5;
}

.mp-content-section h2 {
  margin: 28px 0 14px;
  font-size: 1.5em;
  font-weight: bold;
  color: #2a2a2a;
  line-height: 1.5;
}

.mp-content-section h3 {
  margin: 24px 0 12px;
  font-size: 1.25em;
  font-weight: bold;
  color: #3a3a3a;
  line-height: 1.5;
}

.mp-content-section h4,
.mp-content-section h5,
.mp-content-section h6 {
  margin: 20px 0 10px;
  font-size: 1em;
  font-weight: bold;
  color: #4a4a4a;
  line-height: 1.5;
}

/* ==================== 段落 ==================== */
.mp-content-section p {
  margin: 1em 0;
  line-height: 1.8;
  font-size: 1em;
  color: #333;
}

/* ==================== 列表 ==================== */
/* 列表已转换为 section 结构，禁止使用 ul/ol/li 选择器 */
/* 缩进由 .mp-list-section 的内联样式控制：顶层 padding-left: 1em，嵌套层 padding-left: 1.5em */
.mp-content-section .mp-list-section {
  margin: 1em 0 0 0;
  color: #333;
}

.mp-content-section .mp-list-item {
  line-height: 1.8;
  color: #333;
  /* 禁止设置 margin、padding-left、display */
}

/* ==================== 引用 ==================== */
.mp-content-section blockquote {
  border-left: 4px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 16px;
  background: #f6f8fa;
  margin: 0.8em 0;
  color: #6a737d;
  font-style: italic;
}

.mp-content-section blockquote p {
  margin: 0;
  padding: 0;
  line-height: inherit;
}

/* ==================== 代码块 ==================== */
.mp-content-section pre {
  color: #333;
  background: #f8f8f8;
  border-radius: 8px;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin: 1.2em 0;
  padding: 1em;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-x: auto;
}

.mp-content-section code:not(pre code) {
  background: #f8f8f8;
  padding: 2px 6px;
  border-radius: 4px;
  color: #333;
  font-size: 14px;
  border: 1px solid #eee;
}

/* ==================== 链接 ==================== */
.mp-content-section a {
  color: #3498db;
  text-decoration: none;
  border-bottom: 1px solid #3498db;
}

/* ==================== 强调 ==================== */
.mp-content-section strong {
  font-weight: bold;
  color: #333;
}

.mp-content-section em {
  font-style: italic;
  color: #333;
}

.mp-content-section del {
  text-decoration: line-through;
  color: #999;
}

/* ==================== 表格 ==================== */
.mp-content-section table {
  width: 100%;
  margin: 1em 0;
  border-collapse: collapse;
  border: 1px solid #e1e4e8;
}

.mp-content-section th {
  background: #f6f8fa;
  font-weight: bold;
  color: #333;
  border-bottom: 2px solid #e1e4e8;
  padding: 8px;
  font-size: 1em;
}

.mp-content-section td {
  border: 1px solid #f0f0f0;
  padding: 8px;
  color: #333;
  font-size: 1em;
}

/* ==================== 分隔线 ==================== */
.mp-content-section hr {
  border: none;
  border-top: 1px solid #f0f0f0;
  margin: 20px 0;
}

/* ==================== 图片 ==================== */
.mp-content-section img {
  max-width: 100%;
  height: auto;
  margin: 1em auto;
  display: block;
}

/* 图片描述（设置中开启「图片描述」后生效） */
/* 复制/发布时由内联样式控制，此处仅影响预览 */
.mp-content-section .mp-image-caption {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #888;
  margin: 0 0 1em 0;
  padding: 0;
}

/* ==================== 脚注 ==================== */
.mp-content-section .footnote-ref {
  color: #3498db;
  text-decoration: none;
  font-size: 0.9em;
}

.mp-content-section .footnote-backref {
  color: #3498db;
  text-decoration: none;
  font-size: 0.9em;
}

/* ==================== Callout 提示框 ==================== */
.mp-content-section .mp-callout {
  border-radius: 6px;
  padding: 12px 16px;
  margin: 1em 0;
  border-left: 4px solid #448aff;
  background: #e8f0fe;
}

.mp-content-section .mp-callout-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 1em;
  line-height: 1.5;
}

.mp-content-section .mp-callout-content {
  font-size: 0.95em;
  line-height: 1.7;
  color: #333;
}

.mp-content-section .mp-callout-content p {
  margin: 4px 0;
  padding: 0;
  line-height: 1.7;
}

/* Callout 类型变体 */
.mp-content-section .mp-callout-note { border-left-color: #448aff; background: #e8f0fe; }
.mp-content-section .mp-callout-note .mp-callout-title { color: #448aff; }
.mp-content-section .mp-callout-info { border-left-color: #448aff; background: #e8f0fe; }
.mp-content-section .mp-callout-info .mp-callout-title { color: #448aff; }
.mp-content-section .mp-callout-tip { border-left-color: #00bfa5; background: #e6f7f2; }
.mp-content-section .mp-callout-tip .mp-callout-title { color: #00bfa5; }
.mp-content-section .mp-callout-hint { border-left-color: #00bfa5; background: #e6f7f2; }
.mp-content-section .mp-callout-hint .mp-callout-title { color: #00bfa5; }
.mp-content-section .mp-callout-important { border-left-color: #7c4dff; background: #f3e8fd; }
.mp-content-section .mp-callout-important .mp-callout-title { color: #7c4dff; }
.mp-content-section .mp-callout-warning { border-left-color: #ff9100; background: #fff8e1; }
.mp-content-section .mp-callout-warning .mp-callout-title { color: #ff9100; }
.mp-content-section .mp-callout-caution { border-left-color: #ff9100; background: #fff8e1; }
.mp-content-section .mp-callout-caution .mp-callout-title { color: #ff9100; }
.mp-content-section .mp-callout-attention { border-left-color: #ff9100; background: #fff8e1; }
.mp-content-section .mp-callout-attention .mp-callout-title { color: #ff9100; }
.mp-content-section .mp-callout-danger { border-left-color: #ff1744; background: #ffeef0; }
.mp-content-section .mp-callout-danger .mp-callout-title { color: #ff1744; }
.mp-content-section .mp-callout-error { border-left-color: #ff1744; background: #ffeef0; }
.mp-content-section .mp-callout-error .mp-callout-title { color: #ff1744; }
.mp-content-section .mp-callout-bug { border-left-color: #ff1744; background: #ffeef0; }
.mp-content-section .mp-callout-bug .mp-callout-title { color: #ff1744; }
.mp-content-section .mp-callout-success { border-left-color: #00c853; background: #e8f5e9; }
.mp-content-section .mp-callout-success .mp-callout-title { color: #00c853; }
.mp-content-section .mp-callout-check { border-left-color: #00c853; background: #e8f5e9; }
.mp-content-section .mp-callout-check .mp-callout-title { color: #00c853; }
.mp-content-section .mp-callout-done { border-left-color: #00c853; background: #e8f5e9; }
.mp-content-section .mp-callout-done .mp-callout-title { color: #00c853; }
.mp-content-section .mp-callout-question { border-left-color: #ff9100; background: #fff8e1; }
.mp-content-section .mp-callout-question .mp-callout-title { color: #ff9100; }
.mp-content-section .mp-callout-help { border-left-color: #ff9100; background: #fff8e1; }
.mp-content-section .mp-callout-help .mp-callout-title { color: #ff9100; }
.mp-content-section .mp-callout-faq { border-left-color: #ff9100; background: #fff8e1; }
.mp-content-section .mp-callout-faq .mp-callout-title { color: #ff9100; }
.mp-content-section .mp-callout-failure { border-left-color: #ff1744; background: #ffeef0; }
.mp-content-section .mp-callout-failure .mp-callout-title { color: #ff1744; }
.mp-content-section .mp-callout-fail { border-left-color: #ff1744; background: #ffeef0; }
.mp-content-section .mp-callout-fail .mp-callout-title { color: #ff1744; }
.mp-content-section .mp-callout-missing { border-left-color: #ff1744; background: #ffeef0; }
.mp-content-section .mp-callout-missing .mp-callout-title { color: #ff1744; }
.mp-content-section .mp-callout-abstract { border-left-color: #00b8d4; background: #e0f7fa; }
.mp-content-section .mp-callout-abstract .mp-callout-title { color: #00b8d4; }
.mp-content-section .mp-callout-summary { border-left-color: #00b8d4; background: #e0f7fa; }
.mp-content-section .mp-callout-summary .mp-callout-title { color: #00b8d4; }
.mp-content-section .mp-callout-tldr { border-left-color: #00b8d4; background: #e0f7fa; }
.mp-content-section .mp-callout-tldr .mp-callout-title { color: #00b8d4; }
.mp-content-section .mp-callout-example { border-left-color: #7c4dff; background: #f3e8fd; }
.mp-content-section .mp-callout-example .mp-callout-title { color: #7c4dff; }
.mp-content-section .mp-callout-todo { border-left-color: #448aff; background: #e8f0fe; }
.mp-content-section .mp-callout-todo .mp-callout-title { color: #448aff; }
.mp-content-section .mp-callout-quote { border-left-color: #9e9e9e; background: #f5f5f5; }
.mp-content-section .mp-callout-quote .mp-callout-title { color: #757575; }
.mp-content-section .mp-callout-cite { border-left-color: #9e9e9e; background: #f5f5f5; }
.mp-content-section .mp-callout-cite .mp-callout-title { color: #757575; }
```

---

## 投稿主题

欢迎社区贡献自定义主题！请通过 PR 投稿，流程如下：

### 投稿方式

**方式一：在插件内投稿（推荐）**

1. 在插件的「主题管理」界面编写好你的主题 CSS
2. 点击「📤 投稿主题」按钮，自动跳转到 GitHub Issue 页面
3. 填写主题名称、作者、描述
4. 粘贴你的 CSS 代码
5. 附上至少一张预览截图
6. 提交 Issue

**方式二：直接创建 Issue**

1. 前往 [GitHub Issue 页面](https://github.com/joeytoday/obsidian-mp-publisher/issues/new?labels=theme&template=theme_submission.yml)
2. 选择「🎨 主题投稿」模板
3. 按模板要求填写信息并提交

### 投稿要求

- **必须提供样式截图**，展示主题在公众号预览中的效果
- CSS 代码中建议包含作者信息注释：

```css
/**
 * Theme: 主题名称
 * Author: 你的名字或 GitHub ID
 * Source: https://github.com/你的GitHub用户名
 * Description: 简短描述主题风格
 */
```

- 遵守本指南中的所有样式约束和注意事项
- 通过下方的自查清单

---

## 自查清单

编写完主题 CSS 后，请逐项检查：

- [ ] 所有选择器以 `.mp-content-section` 开头
- [ ] 没有使用 `ul`、`ol`、`li` 选择器
- [ ] 没有使用 CSS 变量 `var(--xxx)`
- [ ] 没有使用 `@media`、`@font-face`
- [ ] 没有使用伪元素 `::before`、`::after`（除非已了解自动转换机制，见第 14 节）
- [ ] 没有使用 `!important`
- [ ] 列表样式仅使用 `.mp-list-section` 和 `.mp-list-item`
- [ ] `.mp-list-item` 没有设置 `padding-left`、`margin`、`display`
- [ ] `blockquote p` 设置了 `margin: 0`
- [ ] `pre` 设置了 `white-space: pre-wrap`
- [ ] `img` 设置了 `max-width: 100%`
- [ ] `table` 设置了 `border-collapse: collapse`
- [ ] 包含了所有 27 种 Callout 类型变体
- [ ] 颜色值使用具体值（hex/rgba），不使用 CSS 变量
- [ ] 尺寸单位使用 `em` 或 `px`，不使用 `rem`
