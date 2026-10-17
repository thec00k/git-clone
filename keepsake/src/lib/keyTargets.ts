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

/** Marks the welcome tour's speech bubble: still a modal dialog, but it steers the camera. */
export const TOUR_BUBBLE_ATTR = 'data-tour-bubble';

/**
 * Open dialogs that freeze the room camera. The tour bubble is left out so each
 * step can turn the room toward the place it names; walking stays blocked by the tour itself.
 */
export const CAMERA_PAUSING_DIALOG = `[aria-modal='true']:not([${TOUR_BUBBLE_ATTR}])`;

/**
 * True when a window-level shortcut should ignore this key press: a control
 * already handled it, focus is in a field or arrow-key widget, or a dialog is open.
 */
export function ignorePageKey(e: KeyboardEvent) {
  return e.defaultPrevented || keyOwnedElsewhere(e);
}

/** Like ignorePageKey, but for listeners that only react alongside another (footstep sounds follow the walking
 * camera, which itself calls preventDefault), so an already-handled key still counts. */
export function keyOwnedElsewhere(e: KeyboardEvent) {
  if (dialogOpen()) return true;
  return e.target instanceof Element && !!e.target.closest(KEY_OWNING_TARGETS);
}
