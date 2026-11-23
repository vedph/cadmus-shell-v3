import { InjectionToken } from '@angular/core';

/**
 * Injection token which, when provided with true, forces all the part and
 * fragment editors (derived from `ModelEditorComponentBase`) in its injector
 * subtree into read-only mode, and hides the save button of
 * `CloseSaveButtonsComponent`. This is used by hosts which display editors
 * for data which must not be changed, like the edit history view, without
 * requiring their wrapper components to bind any input.
 */
export const CADMUS_EDITOR_READONLY = new InjectionToken<boolean>(
  'CADMUS_EDITOR_READONLY',
);
