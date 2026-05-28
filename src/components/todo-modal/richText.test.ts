import { describe, expect, it } from 'vitest';
import {
  detectBlockShortcut,
  detectHeadingShortcut,
  plainTextToRichTextHtml,
  richTextHtmlToPlainText,
  sanitizeRichTextHtml,
} from './richText';

describe('richText', () => {
  it('sanitizes formatting and strips unsafe markup', () => {
    const sanitized = sanitizeRichTextHtml(
      '<h1>Hello</h1><p><strong>Bold</strong> <em>Italic</em> <span data-format="uppercase">small</span> <a href="https://example.com">Link</a><script>alert(1)</script></p>'
    );

    expect(sanitized).toContain('<h1>Hello</h1>');
    expect(sanitized).toContain('<strong>Bold</strong>');
    expect(sanitized).toContain('<em>Italic</em>');
    expect(sanitized).toContain('data-format="uppercase"');
    expect(sanitized).toContain('https://example.com');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('javascript:');
  });

  it('converts rich text html to plain text for previews', () => {
    const plainText = richTextHtmlToPlainText('<h1>Hello</h1><p>World</p><p><strong>Again</strong></p>');

    expect(plainText).toContain('Hello');
    expect(plainText).toContain('World');
    expect(plainText).toContain('Again');
  });

  it('wraps plain text into paragraphs for paste fallback', () => {
    expect(plainTextToRichTextHtml('First paragraph\n\nSecond line')).toBe(
      '<p>First paragraph</p><p>Second line</p>'
    );
  });

  it('detects notion-style heading shortcuts', () => {
    expect(detectHeadingShortcut('#')).toBe('h1');
    expect(detectHeadingShortcut('##')).toBe('h2');
    expect(detectHeadingShortcut('###')).toBe('h3');
    expect(detectHeadingShortcut('####')).toBeNull();
  });

  it('detects list and quote shortcuts', () => {
    expect(detectBlockShortcut('*')).toBe('ul');
    expect(detectBlockShortcut('-')).toBe('ul');
    expect(detectBlockShortcut('+')).toBe('ul');
    expect(detectBlockShortcut('1.')).toBe('ol');
    expect(detectBlockShortcut('42.')).toBe('ol');
    expect(detectBlockShortcut('>')).toBe('blockquote');
    expect(detectBlockShortcut('abc')).toBeNull();
  });
});
