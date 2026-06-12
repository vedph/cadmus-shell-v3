import {
  EditorInitializedEvent,
  StandaloneCodeEditor,
} from '@jean-merelis/ngx-monaco-editor';

/**
 * Helper to bind text editing plugin keyboard shortcuts (e.g. Ctrl+B for
 * bold) to a Monaco editor created via ngx-monaco-editor.
 *
 * Editor content is bound via `[formControl]`, so this helper only tracks
 * the editor instance and wires up the shortcut commands.
 */
export class MonacoEditorHelper {
  private _editor?: StandaloneCodeEditor;

  /**
   * Gets the Monaco editor instance.
   */
  get editor(): StandaloneCodeEditor | undefined {
    return this._editor;
  }

  /**
   * Call this from the component's editor initialized handler.
   * @param event The editor initialized event.
   */
  initEditor(event: EditorInitializedEvent): void {
    this._editor = event.editor;
    this._editor.focus();
  }

  /**
   * Adds key bindings for text editing plugins.
   * @param bindings Map of key codes (numbers) to selector strings.
   * @param applyEdit Function to apply the edit.
   */
  addBindings(
    bindings: Record<number, string>,
    applyEdit: (selector: string, editor: StandaloneCodeEditor) => void,
  ): void {
    if (!this._editor || !bindings) {
      return;
    }

    Object.keys(bindings).forEach((key) => {
      const keyCode = parseInt(key, 10);
      this._editor!.addCommand(keyCode, () => {
        applyEdit(bindings[keyCode], this._editor!);
      });
    });
  }
}
