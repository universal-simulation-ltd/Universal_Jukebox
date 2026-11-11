/**
 * Focus a search box with all its text selected, so the next thing typed
 * replaces it (James, 2026-11-11: "When clicking the tab after typing something
 * in search then highlight all the text in the search box so they can easily
 * type and replace it").
 *
 * ⚠️ `setSelectionRange`, not `select()`: iOS Safari ignores `select()` on a
 * field it has just focused, and leaves the caret at the end. Call it INSIDE
 * the tap, too — iOS only raises the keyboard for a focus made during one.
 */
export function selectAllIn(field: HTMLInputElement | null | undefined): void {
  if (!field) return
  field.focus({ preventScroll: true })
  field.setSelectionRange(0, field.value.length)
}
