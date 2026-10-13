import { beforeAll, describe, expect, it } from 'vitest';
import { convertCodeBlockLines } from './code-blocks';

beforeAll(() => {
	HTMLElement.prototype.setCssProps = function (props: Record<string, string>): void {
		Object.entries(props).forEach(([property, value]) => {
			this.style.setProperty(property, value);
		});
	};
	HTMLElement.prototype.empty = function (): void {
		this.replaceChildren();
	};
});

describe('convertCodeBlockLines', () => {
	it('preserves interior blank lines with an explicit br placeholder', () => {
		const container = document.createElement('div');
		container.innerHTML = '<pre><code>first\n\n  third\n</code></pre>';

		convertCodeBlockLines(container);

		const lines = Array.from(container.querySelectorAll('pre code > section'));
		expect(lines).toHaveLength(3);
		expect(lines[0].textContent).toBe('first');
		expect(lines[1].innerHTML).toBe('<br>');
		expect(lines[2].textContent).toBe('third');
		expect((lines[2] as HTMLElement).style.paddingLeft).toBe('1em');
	});

	it('does not create an extra line for the renderer trailing newline', () => {
		const container = document.createElement('div');
		container.innerHTML = '<pre><code>first\nsecond\n</code></pre>';

		convertCodeBlockLines(container);

		expect(container.querySelectorAll('pre code > section')).toHaveLength(2);
	});

	it('preserves whitespace-only lines after indentation is converted to padding', () => {
		const container = document.createElement('div');
		container.innerHTML = '<pre><code>first\n  \nthird\n</code></pre>';

		convertCodeBlockLines(container);

		const lines = Array.from(container.querySelectorAll('pre code > section'));
		expect(lines).toHaveLength(3);
		expect(lines[1].innerHTML).toBe('<br>');
	});
});
