import { beforeAll, describe, expect, it } from 'vitest';
import { processLinksToFootnotes } from './footnotes';

beforeAll(() => {
	HTMLElement.prototype.setCssProps = function (props: Record<string, string>): void {
		Object.entries(props).forEach(([property, value]) => {
			this.style.setProperty(property, value);
		});
	};
});

function createContainer(html: string): HTMLElement {
	const container = document.createElement('div');
	container.innerHTML = html;
	return container;
}

describe('processLinksToFootnotes', () => {
	it('converts native Markdown footnotes to visible content without anchor links', () => {
		const container = createContainer(`
			<p>正文<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">[1]</a></sup></p>
			<section class="footnotes">
				<hr>
				<ol><li id="fn-1"><p>来源 <a href="https://example.com">示例</a> <a href="#fnref-1" class="footnote-backref">↩</a></p></li></ol>
			</section>
		`);

		processLinksToFootnotes(container);

		expect(container.querySelector('.footnote-ref')?.textContent).toBe('[1]');
		expect(container.querySelector('.mp-footnote-item')?.textContent).toContain(
			'[1] 来源 示例（https://example.com）',
		);
		expect(container.querySelectorAll('a')).toHaveLength(0);
		expect(container.querySelector('.footnotes')).toBeNull();
	});

	it('converts and deduplicates external Markdown links', () => {
		const container = createContainer(`
			<p><a href="https://example.com"><strong>示例</strong></a>与<a href="https://example.com">同一来源</a></p>
		`);

		processLinksToFootnotes(container);

		expect(Array.from(container.querySelectorAll('.footnote-ref')).map(el => el.textContent)).toEqual([
			'[1]',
			'[1]',
		]);
		expect(container.querySelectorAll('.mp-footnote-item')).toHaveLength(1);
		expect(container.querySelector('.mp-footnote-item')?.textContent).toBe(
			'[1] 示例：https://example.com',
		);
		expect(container.querySelector('strong')?.textContent).toBe('示例');
	});

	it('keeps one continuous sequence for links and native footnotes in document order', () => {
		const container = createContainer(`
			<p><a href="https://first.example">第一个链接</a></p>
			<p>原生脚注<sup class="footnote-ref"><a href="#fn-note">1</a></sup></p>
			<section class="footnotes"><ol><li id="fn-note"><p>脚注正文 <a href="#fnref-note" class="footnote-backref">↩</a></p></li></ol></section>
		`);

		processLinksToFootnotes(container);

		expect(Array.from(container.querySelectorAll('.footnote-ref')).map(el => el.textContent)).toEqual([
			'[1]',
			'[2]',
		]);
		expect(Array.from(container.querySelectorAll('.mp-footnote-item')).map(el => el.textContent)).toEqual([
			'[1] 第一个链接：https://first.example',
			'[2] 脚注正文',
		]);
		expect(container.querySelectorAll('.mp-footnotes')).toHaveLength(1);
	});

	it('turns internal links into text and leaves links inside code blocks unchanged', () => {
		const container = createContainer(`
			<p><a class="internal-link" data-href="笔记">显示文字</a></p>
			<pre><code><a href="https://example.com">代码链接</a></code></pre>
		`);

		processLinksToFootnotes(container);

		expect(container.querySelector('p')?.textContent).toBe('显示文字');
		expect(container.querySelector('pre a')?.getAttribute('href')).toBe('https://example.com');
		expect(container.querySelector('.mp-footnotes')).toBeNull();
	});
});
