/** Capture a private local page for the turning mesh. Nothing is uploaded. */
import {preparePaperImages} from './paperTexture';

// Finished snapshots, held only while the page object they were taken from still exists. Editing a page replaces
// its object, so a changed page is never served from here. The key carries what else the picture depends on.
const finished = new WeakMap<object, {key: string; canvas: HTMLCanvasElement}>();
export const peekSnapshot = (page: object, key: string) => {
  const found = finished.get(page);
  return found && found.key === key ? found.canvas : null;
};
export const rememberSnapshot = (page: object, key: string, canvas: HTMLCanvasElement) => {
  finished.set(page, {key, canvas});
};
const PSEUDO_COLOR_PROPERTIES = [
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'box-shadow',
  'color',
  'outline-color',
  'text-shadow',
];
export async function snapshotPage(page: HTMLElement, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  const deadline = Date.now() + 5000;
  const bounded = <T>(pending: Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const abort = () => {
        cleanup();
        reject(new Error('Page snapshot cancelled'));
      };
      const timer = window.setTimeout(
        () => {
          cleanup();
          reject(new Error('Page snapshot timed out'));
        },
        Math.max(1, deadline - Date.now()),
      );
      const cleanup = () => {
        window.clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      };
      signal?.addEventListener('abort', abort, {once: true});
      pending.then(
        value => {
          cleanup();
          resolve(value);
        },
        error => {
          cleanup();
          reject(error);
        },
      );
      if (signal?.aborted) abort();
    });
  await bounded(document.fonts.ready);
  await bounded(preparePaperImages(page));
  const {default: html2canvas} = await bounded(import('html2canvas'));
  const clone = page.cloneNode(true) as HTMLElement;
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const color = probe.getContext('2d', {willReadFrequently: true})!;
  const normalize = (value: string) =>
    value.replace(/(?:oklch|oklab|color)\([^)]*\)/g, token => {
      color.clearRect(0, 0, 1, 1);
      color.fillStyle = token;
      color.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = color.getImageData(0, 0, 1, 1).data;
      return `rgba(${r},${g},${b},${a / 255})`;
    });
  const originals = [page, ...page.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  originals.forEach((node, i) => {
    const style = getComputedStyle(node);
    const target = copies[i] as HTMLElement | SVGElement;
    for (const key of Array.from(style))
      target.style.setProperty(key, normalize(style.getPropertyValue(key)));
    if (target instanceof HTMLElement) {
      target.removeAttribute('id');
      target.removeAttribute('tabindex');
    }
  });
  // Pseudo-elements (tape, stamps...) take their colours from the stylesheet, where html2canvas meets oklab() and
  // color() values it cannot parse and gives up on the whole page. Bake each one's computed colours into a rule
  // the copy carries, in the same plain rgba() form as above.
  const pseudoRules: string[] = [];
  originals.forEach((node, i) => {
    for (const pseudo of ['::before', '::after'] as const) {
      const style = getComputedStyle(node, pseudo);
      if (style.content === 'none' || style.content === 'normal') continue;
      (copies[i] as HTMLElement).dataset.ksSnap = String(i);
      const declarations = PSEUDO_COLOR_PROPERTIES.map(
        property => `${property}:${normalize(style.getPropertyValue(property))} !important`,
      ).join(';');
      pseudoRules.push(`[data-ks-snap="${i}"]${pseudo}{${declarations}}`);
    }
  });
  if (pseudoRules.length) {
    const rules = document.createElement('style');
    rules.textContent = pseudoRules.join('\n');
    clone.append(rules);
  }
  // Descendants above have frozen pixel styles; preserve that layout and scale only the raster.
  const width = page.offsetWidth || 480,
    height = page.offsetHeight || 657;
  Object.assign(clone.style, {
    width: `${width}px`,
    height: `${height}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
    position: 'relative',
    transform: 'none',
    margin: '0',
    flex: 'none',
  });
  clone.querySelectorAll('[data-no-drag]').forEach(node => node.remove());
  clone.querySelectorAll<HTMLElement>('.ks-el').forEach(node => (node.style.outline = 'none'));
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: 'none',
  });
  host.append(clone);
  document.body.append(host);
  alignTextBaselines(clone);
  try {
    await bounded(
      Promise.all(Array.from(clone.querySelectorAll('img')).map(image => image.decode().catch(() => {}))),
    );
    return await bounded(
      html2canvas(clone, {
        scale: 960 / width,
        width,
        height,
        backgroundColor: '#eee5d3',
        useCORS: true,
        logging: false,
        imageTimeout: 4000,
        onclone: doc => {
          doc.body.style.backgroundColor = '#ffffff';
          doc.body.style.color = '#332b24';
        },
      }),
    );
  } finally {
    host.remove();
  }
}

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
/** The baseline html2canvas will use for a font: its own probe, appended to <body> exactly as html2canvas does. */
function html2canvasBaseline(fontFamily: string, fontSize: string) {
  const container = document.createElement('div'),
    img = document.createElement('img'),
    span = document.createElement('span');
  Object.assign(container.style, {
    visibility: 'hidden',
    fontFamily,
    fontSize,
    margin: '0',
    padding: '0',
    whiteSpace: 'nowrap',
  });
  Object.assign(img, {src: PIXEL, width: 1, height: 1});
  Object.assign(img.style, {margin: '0', padding: '0', verticalAlign: 'baseline'});
  Object.assign(span.style, {fontFamily, fontSize, margin: '0', padding: '0'});
  span.append('Hidden Text');
  container.append(span, img);
  document.body.append(container);
  const baseline = img.offsetTop - span.offsetTop + 2;
  container.remove();
  return baseline;
}
/**
 * html2canvas draws text at (top of the text box + its own baseline estimate). The base styles make its probe image
 * a block, so the estimate comes out near a full line height and captions land low in the picture, then visibly
 * jump when the turned page hands over to the live one. Measure each text run's real baseline in the laid-out copy
 * and nudge the run by the difference.
 */
function alignTextBaselines(root: HTMLElement) {
  const estimates = new Map<string, number>();
  for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    const nodes = Array.from(el.childNodes);
    const text = nodes.find((n): n is Text => n instanceof Text && !!n.data.trim());
    if (!text || nodes.some(n => n instanceof Element)) continue;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 1);
    const top = range.getClientRects()[0]?.top;
    if (top === undefined) continue;
    const probe = document.createElement('img');
    Object.assign(probe, {src: PIXEL, width: 1, height: 1});
    // Inline explicitly: the base styles make images blocks (which is also what skews html2canvas's own probe).
    Object.assign(probe.style, {display: 'inline', verticalAlign: 'baseline'});
    el.prepend(probe);
    const baseline = probe.getBoundingClientRect().bottom - top;
    probe.remove();
    const {fontFamily, fontSize} = el.style;
    const key = `${fontFamily} ${fontSize}`;
    if (!estimates.has(key)) estimates.set(key, html2canvasBaseline(fontFamily, fontSize));
    const shift = baseline - estimates.get(key)!;
    if (Math.abs(shift) < 0.5) continue;
    const position = el.style.position;
    if (position === 'absolute' || position === 'fixed')
      el.style.marginTop = `${(parseFloat(el.style.marginTop) || 0) + shift}px`;
    else {
      el.style.top = `${(position === 'relative' ? parseFloat(el.style.top) || 0 : 0) + shift}px`;
      el.style.position = 'relative';
    }
  }
}
