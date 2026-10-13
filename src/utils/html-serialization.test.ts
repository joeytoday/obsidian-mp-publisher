import { describe, expect, it } from 'vitest';
import { serializeChildNodes } from './html-serialization';

describe('serializeChildNodes', () => {
	it('omits the temporary wrapper around published content', () => {
		const container = document.createElement('div');
		container.innerHTML = '<section class="mp-content-section"><p>正文</p></section>';

		const html = serializeChildNodes(container);

		expect(html).toContain('class="mp-content-section"');
		expect(html).not.toMatch(/^<div/);
	});
});
