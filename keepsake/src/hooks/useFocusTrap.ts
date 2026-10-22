import {useEffect, type RefObject} from 'react';
import {useEscapeClose} from './useEscapeClose';

const SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  "[tabindex]:not([tabindex='-1'])",
].join(',');

/** Keep Tab inside a dialog and restore focus on close. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEscapeClose(onClose);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const list = () =>
      [...root.querySelectorAll<HTMLElement>(SELECTOR)].filter(
        el =>
          !el.closest("[aria-hidden='true'], [hidden], [inert]") &&
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== 'hidden',
      );
    // Content can arrive after mount (lazy panels, loaded lists): until something
    // is focusable, watch the dialog and focus the first control once it appears.
    let watcher: MutationObserver | null = null;
    const first = list()[0];
    if (first) first.focus();
    else {
      watcher = new MutationObserver(() => {
        const late = list()[0];
        if (!late) return;
        if (!root.contains(document.activeElement)) late.focus();
        watcher?.disconnect();
        watcher = null;
      });
      watcher.observe(root, {childList: true, subtree: true, attributes: true});
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = list();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      watcher?.disconnect();
      prev?.focus();
    };
  }, [ref]);
}
