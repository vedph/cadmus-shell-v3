import { FormControl } from '@angular/forms';

/**
 * Helper class to manage Monaco editor initialization and handle the race condition
 * where data may be set before the editor is created. This ensures the editor
 * receives the correct initial value regardless of initialization order.
 *
 * When using nge-monaco-editor, there's a race condition: component data may arrive
 * (via `onDataSet`) before the Monaco editor fires its `ready` event. Without this
 * helper, calling `model.setValue()` on an uninitialized editor fails silently.
 * This helper queues the value and applies it when the editor initializes.
 *
 * ## Migration Guide
 *
 * ### Step 1: Remove old Monaco-related fields
 *
 * Remove these fields from your component:
 * ```ts
 * // REMOVE these:
 * private readonly _disposables: monaco.IDisposable[] = [];
 * private _editorModel?: monaco.editor.ITextModel;
 * private _editor?: monaco.editor.IStandaloneCodeEditor;
 * ```
 *
 * ### Step 2: Add the helper field
 *
 * Add the helper instance field:
 * ```ts
 * private _textHelper!: MonacoEditorHelper;
 * ```
 *
 * ### Step 3: Initialize the helper in constructor
 *
 * After creating your form control, initialize the helper:
 * ```ts
 * constructor(...) {
 *   // ... form controls setup ...
 *   this.text = formBuilder.control(null, Validators.required);
 *
 *   // Initialize Monaco helper with form control and language
 *   this._textHelper = new MonacoEditorHelper(this.text, 'markdown');
 *   // Use 'txt' for plain text, 'markdown' for Markdown, etc.
 * }
 * ```
 *
 * ### Step 4: Simplify onCreateEditor
 *
 * Replace the complex editor setup with:
 * ```ts
 * public onCreateEditor(editor: monaco.editor.IEditor) {
 *   this._textHelper.initEditor(editor);
 *
 *   // Optional: add text editor plugin bindings
 *   if (this._editorBindings) {
 *     this._textHelper.addBindings(this._editorBindings, (selector) => {
 *       this.applyEdit(selector);
 *     });
 *   }
 * }
 * ```
 *
 * ### Step 5: Update applyEdit (if using text editor plugins)
 *
 * Change `this._editor` references to `this._textHelper.editor`:
 * ```ts
 * private async applyEdit(selector: string) {
 *   const editor = this._textHelper.editor;
 *   if (!editor) return;
 *
 *   const selection = editor.getSelection();
 *   const text = selection ? editor.getModel()!.getValueInRange(selection) : '';
 *   const result = await this._editService.edit({ selector, text });
 *
 *   editor.executeEdits('my-source', [{
 *     range: selection!,
 *     text: result.text,
 *     forceMoveMarkers: true,
 *   }]);
 * }
 * ```
 *
 * ### Step 6: Update updateForm method
 *
 * Replace direct model access with helper's setValue:
 * ```ts
 * private updateForm(part?: MyPart | null): void {
 *   if (!part) {
 *     this.form.reset();
 *     return;
 *   }
 *   this.text.setValue(part.text);
 *   this._textHelper.setValue(part.text || '');  // Use helper instead of _editorModel
 *   this.form.markAsPristine();
 * }
 * ```
 *
 * ### Step 7: Update ngOnDestroy
 *
 * Replace manual disposal with helper's dispose:
 * ```ts
 * public override ngOnDestroy() {
 *   super.ngOnDestroy();
 *   this._textHelper.dispose();  // Replaces _disposables.forEach(...)
 * }
 * ```
 *
 * ### Step 8: Update programmatic text changes (if any)
 *
 * If your component modifies text programmatically (e.g., transforms),
 * also update the helper so the editor displays the change:
 * ```ts
 * // When changing text programmatically:
 * this.text.setValue(newText);
 * this._textHelper.setValue(newText);  // Keep editor in sync
 * ```
 *
 * ## Template Example
 *
 * ```html
 * <div>
 *   <nge-monaco-editor
 *     style="--editor-height: 400px"
 *     (ready)="onCreateEditor($event)"
 *   />
 *   @if (text.hasError('required') && (text.touched || text.dirty)) {
 *     <mat-error>text required</mat-error>
 *   }
 *   @if (text.hasError('maxLength') && (text.touched || text.dirty)) {
 *     <mat-error>text too long</mat-error>
 *   }
 * </div>
 * ```
 *
 * ## Complete Example
 *
 * ```ts
 * export class MyEditorComponent implements OnInit, OnDestroy {
 *   private _textHelper!: MonacoEditorHelper;
 *   public text: FormControl<string | null>;
 *
 *   constructor(
 *     private _editService: CadmusTextEdService,
 *     @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN) @Optional()
 *     private _editorBindings?: CadmusTextEdBindings,
 *   ) {
 *     this.text = new FormControl(null, Validators.required);
 *     this._textHelper = new MonacoEditorHelper(this.text, 'markdown');
 *   }
 *
 *   ngOnDestroy() {
 *     this._textHelper.dispose();
 *   }
 *
 *   onCreateEditor(editor: monaco.editor.IEditor) {
 *     this._textHelper.initEditor(editor);
 *     if (this._editorBindings) {
 *       this._textHelper.addBindings(this._editorBindings, (selector) => {
 *         this.applyEdit(selector);
 *       });
 *     }
 *   }
 *
 *   private async applyEdit(selector: string) {
 *     const editor = this._textHelper.editor;
 *     if (!editor) return;
 *     // ... plugin edit logic ...
 *   }
 *
 *   updateForm(data: MyData) {
 *     this.text.setValue(data.text);
 *     this._textHelper.setValue(data.text || '');
 *   }
 * }
 * ```
 */
export class MonacoEditorHelper {
  private _model?: monaco.editor.ITextModel;
  private _editor?: monaco.editor.IStandaloneCodeEditor;
  private _pendingValue?: string;
  private _settingValue = false;
  private readonly _disposables: monaco.IDisposable[] = [];

  constructor(
    private readonly _formControl: FormControl<string | null>,
    private readonly _language: string = 'markdown',
  ) {}

  /**
   * Gets the Monaco text model.
   */
  get model(): monaco.editor.ITextModel | undefined {
    return this._model;
  }

  /**
   * Gets the Monaco editor instance.
   */
  get editor(): monaco.editor.IStandaloneCodeEditor | undefined {
    return this._editor;
  }

  /**
   * Sets the value in the Monaco model. If the model hasn't been created yet,
   * stores the value to be applied when the editor is initialized.
   * @param value The value to set
   */
  setValue(value: string): void {
    if (this._model) {
      this._settingValue = true;
      try {
        this._model.setValue(value);
      } finally {
        this._settingValue = false;
      }
    } else {
      this._pendingValue = value;
    }
  }

  /**
   * Call this from the component's onCreateEditor callback.
   * Initializes the model, sets up change tracking, and applies any pending value.
   * @param editor The Monaco editor instance
   * @param options Optional editor options
   */
  initEditor(
    editor: monaco.editor.IEditor,
    options?: monaco.editor.IEditorOptions,
  ): void {
    // Apply default and custom options
    editor.updateOptions({
      minimap: { side: 'right' },
      wordWrap: 'on',
      automaticLayout: true,
      ...options,
    });

    // Create model with pending value or form control value
    const initialValue = this._pendingValue ?? this._formControl?.value ?? '';
    this._model = monaco.editor.createModel(initialValue, this._language);
    this._pendingValue = undefined;

    editor.setModel(this._model);
    this._editor = editor as monaco.editor.IStandaloneCodeEditor;

    // Sync model changes to form control.
    // _settingValue guards against marking the form dirty when the value is
    // set programmatically (e.g. during data loading in updateForm).
    this._disposables.push(
      this._model.onDidChangeContent(() => {
        this._formControl.setValue(this._model!.getValue());
        if (!this._settingValue) {
          this._formControl.markAsDirty();
        }
        this._formControl.updateValueAndValidity();
      }),
    );
  }

  /**
   * Adds key bindings for text editing plugins.
   * @param bindings Map of key codes (numbers) to selector strings
   * @param applyEdit Function to apply the edit
   */
  addBindings(
    bindings: Record<number, string>,
    applyEdit: (
      selector: string,
      editor: monaco.editor.IStandaloneCodeEditor,
    ) => void,
  ): void {
    if (!this._editor || !bindings) return;

    Object.keys(bindings).forEach((key) => {
      const keyCode = parseInt(key, 10);
      console.log('Binding ' + keyCode + ' to ' + bindings[keyCode]);
      this._editor!.addCommand(keyCode, () => {
        applyEdit(bindings[keyCode], this._editor!);
      });
    });
  }

  /**
   * Disposes of all Monaco resources. Call this from ngOnDestroy.
   */
  dispose(): void {
    this._disposables.forEach((d) => d.dispose());
    this._model?.dispose();
  }
}
