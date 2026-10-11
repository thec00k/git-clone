/**
 * Controls that use arrow keys (or typing) themselves: page-wide shortcuts
 * must leave key presses on these alone.
 */
export const KEY_OWNING_TARGETS = [
  'input',
  'textarea',
  'select',
  "[contenteditable='true']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='tab']",
  "[role='listbox']",
  "[role='menu']",
  "[role='radiogroup']",
].join(', ');

/** True when a dialog is open, so the room or book behind it should not react to keys. */
export function dialogOpen() {
  return !!document.querySelector("[aria-modal='true']");
}

/**
 * True when a window-level shortcut should ignore this key press: a control
 * already handled it, focus is in a field or arrow-key widget, or a dialog is open.
 */
export function ignorePageKey(e: KeyboardEvent) {
  if (e.defaultPrevented || dialogOpen()) return true;
  return e.target instanceof Element && !!e.target.closest(KEY_OWNING_TARGETS);
}
