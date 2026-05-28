const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'u',
  'ul',
]);

const BLOCK_TAGS = new Set(['blockquote', 'div', 'h1', 'h2', 'h3', 'li', 'ol', 'p', 'pre', 'ul']);
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const createDocument = () => new DOMParser().parseFromString('<!doctype html><html><body></body></html>', 'text/html');

const sanitizeUrl = (value: string) => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  try {
    const resolvedUrl = new URL(normalizedValue, window.location.origin);
    return SAFE_URL_PROTOCOLS.has(resolvedUrl.protocol) ? resolvedUrl.href : null;
  } catch {
    return null;
  }
};

const appendSanitizedNodes = (target: HTMLElement, sourceNodes: NodeListOf<ChildNode>, documentRef: Document) => {
  sourceNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(documentRef.createTextNode(node.textContent ?? ''));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      appendSanitizedNodes(target, element.childNodes, documentRef);
      return;
    }

    if (tagName === 'br') {
      target.appendChild(documentRef.createElement('br'));
      return;
    }

    const sanitizedElement = documentRef.createElement(tagName);

    if (tagName === 'a') {
      const href = sanitizeUrl(element.getAttribute('href') ?? '');
      if (!href) {
        appendSanitizedNodes(target, element.childNodes, documentRef);
        return;
      }

      sanitizedElement.setAttribute('href', href);
      sanitizedElement.setAttribute('target', '_blank');
      sanitizedElement.setAttribute('rel', 'noreferrer noopener');
    }

    if (tagName === 'span' && element.getAttribute('data-format') === 'uppercase') {
      sanitizedElement.setAttribute('data-format', 'uppercase');
    }

    appendSanitizedNodes(sanitizedElement, element.childNodes, documentRef);

    if (tagName === 'div') {
      if (sanitizedElement.textContent?.trim() || sanitizedElement.querySelector('*')) {
        const paragraph = documentRef.createElement('p');
        paragraph.innerHTML = sanitizedElement.innerHTML;
        target.appendChild(paragraph);
      } else {
        target.appendChild(documentRef.createElement('p'));
      }
      return;
    }

    target.appendChild(sanitizedElement);
  });
};

export const sanitizeRichTextHtml = (value: string) => {
  if (!value.trim()) return '';

  const documentRef = createDocument();
  const template = documentRef.createElement('template');
  template.innerHTML = value;

  const container = documentRef.createElement('div');
  appendSanitizedNodes(container, template.content.childNodes, documentRef);

  return container.innerHTML;
};

export const richTextHtmlToPlainText = (value: string) => {
  if (!value.trim()) return '';

  const documentRef = createDocument();
  const template = documentRef.createElement('template');
  template.innerHTML = sanitizeRichTextHtml(value);

  const parts: string[] = [];

  const appendNode = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '');
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'br') {
      parts.push('\n');
      return;
    }

    const isBlock = BLOCK_TAGS.has(tagName) || tagName === 'a' || tagName === 'span';

    if (isBlock && parts.length > 0 && parts[parts.length - 1] !== '\n') {
      parts.push('\n');
    }

    element.childNodes.forEach(appendNode);

    if (isBlock && parts[parts.length - 1] !== '\n') {
      parts.push('\n');
    }
  };

  template.content.childNodes.forEach(appendNode);

  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
};

export const isRichTextEmpty = (value: string) => richTextHtmlToPlainText(value).length === 0;

export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const plainTextToRichTextHtml = (value: string) => {
  if (!value.trim()) return '';

  return value
    .split(/\n\n+/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
};

export const detectHeadingShortcut = (value: string) => {
  const normalizedValue = value.trim();

  if (normalizedValue === '#') return 'h1';
  if (normalizedValue === '##') return 'h2';
  if (normalizedValue === '###') return 'h3';

  return null;
};

export type BlockShortcutType = 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'blockquote';

export const detectBlockShortcut = (value: string): BlockShortcutType | null => {
  const headingShortcut = detectHeadingShortcut(value);
  if (headingShortcut) return headingShortcut;

  const normalizedValue = value.trim();
  if (normalizedValue === '*' || normalizedValue === '-' || normalizedValue === '+') return 'ul';
  if (/^\d+\.$/.test(normalizedValue)) return 'ol';
  if (normalizedValue === '>') return 'blockquote';

  return null;
};
