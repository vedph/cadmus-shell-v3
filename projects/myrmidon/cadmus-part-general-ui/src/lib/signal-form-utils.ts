/**
 * Get a deep copy of a value read from or written to a signal form.
 * A signal form tags the objects in its arrays with an identity Symbol:
 * copying them (structured clone ignores Symbol keys) keeps the form from
 * adopting the objects of the bound model or of child components, and
 * keeps its tags out of the model it emits.
 *
 * @param value The value to copy.
 * @returns The copy.
 */
export function copyFormValue<T>(value: T): T {
  return value === undefined || value === null ? value : structuredClone(value);
}

// the input types whose Enter key submits their form in a browser
const SUBMITTING_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);

/**
 * True if the specified Enter keydown event would submit the form its
 * target belongs to, when that is a native form (implicit submission): the
 * target is a text-like input, and no other handler (e.g. an autocomplete
 * picking an option) already consumed the event. Use it in editors which
 * render no form element, to keep their Enter-to-save behavior.
 *
 * @param event The keydown event.
 */
export function isImplicitSubmission(event: Event): boolean {
  const target = event.target;
  return (
    !event.defaultPrevented &&
    !(event as KeyboardEvent).isComposing &&
    target instanceof HTMLInputElement &&
    SUBMITTING_INPUT_TYPES.has(target.type)
  );
}

/**
 * A field whose value can be set from an editor component.
 */
interface EditableTextField {
  (): {
    value: { (): string; set(value: string): void };
    markAsDirty(): void;
  };
}

/**
 * Set a text field from the value emitted by an editor component, when it
 * differs from the field's value, marking the field as dirty. Use this
 * instead of binding the field with `[formField]` to editors which emit
 * their value also when it is set programmatically, like the Monaco
 * editor: binding them with `[formField]` makes any programmatic change
 * (e.g. new data bound after save) look like a user edit, so the form
 * gets dirty. Bind such editors with `[value]="field().value()"` and
 * `(valueChange)="setFieldFromEditor(field, $event)"`.
 *
 * @param field The field to set.
 * @param value The value emitted by the editor.
 */
export function setFieldFromEditor(
  field: EditableTextField,
  value: string,
): void {
  const state = field();
  if (state.value() === (value ?? '')) {
    return;
  }
  state.value.set(value ?? '');
  state.markAsDirty();
}

// true for the values which stand for "no value" in a model
function isEmptyFormValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * True if the two values are equal as model values: they are deeply
 * equal, except that null, undefined, an empty string and a missing
 * property all count as the same empty value. Child editors often
 * normalize the model they emit, e.g. turning a null into undefined or
 * dropping an empty property, so their output can differ from the bound
 * value in form only.
 *
 * @param a The first value.
 * @param b The second value.
 */
export function sameFormValue(a: unknown, b: unknown): boolean {
  if (isEmptyFormValue(a) || isEmptyFormValue(b)) {
    return isEmptyFormValue(a) && isEmptyFormValue(b);
  }
  if (a === b) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => sameFormValue(item, b[i]))
    );
  }
  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const key of keys) {
    if (!sameFormValue(ra[key], rb[key])) {
      return false;
    }
  }
  return true;
}

/**
 * A field whose value can be set from a child editor component.
 */
interface EditableField<T> {
  (): {
    value: { (): T; set(value: T): void };
    markAsDirty(): void;
  };
}

/**
 * Set a field from the value emitted by a child editor component, unless
 * it is the same model value as the field's (see `sameFormValue`); in
 * that case the field is left untouched. Else, the value is set and the
 * field marked as dirty. Use this in the handlers of child editors whose
 * value is bound to a field, like `(referencesChange)`: many of them
 * (e.g. those which autosave after a debounce) emit also when they just
 * received new data, a normalized copy of what they got; marking the
 * field as dirty in this case makes the editor look edited right after
 * loading.
 *
 * @param field The field to set.
 * @param value The value emitted by the child editor.
 */
export function setFieldFromChild<T>(field: EditableField<T>, value: T): void {
  const state = field();
  if (sameFormValue(state.value(), value)) {
    return;
  }
  state.value.set(value);
  state.markAsDirty();
}
