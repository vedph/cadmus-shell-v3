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
export function setFieldFromEditor(field: EditableTextField, value: string): void {
  const state = field();
  if (state.value() === (value ?? '')) {
    return;
  }
  state.value.set(value ?? '');
  state.markAsDirty();
}
