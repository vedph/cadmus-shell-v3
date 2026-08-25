import { MonacoEditorHelper } from './monaco-editor-helper';
import type {
  EditorInitializedEvent,
  StandaloneCodeEditor,
} from '@jean-merelis/ngx-monaco-editor';

function makeMockEditor(): StandaloneCodeEditor {
  return {
    focus: vi.fn(),
    addCommand: vi.fn(),
  } as unknown as StandaloneCodeEditor;
}

describe('MonacoEditorHelper', () => {
  describe('editor getter', () => {
    it('should be undefined before initEditor is called', () => {
      const helper = new MonacoEditorHelper();
      expect(helper.editor).toBeUndefined();
    });
  });

  describe('initEditor', () => {
    it('should store the editor instance and focus it', () => {
      const helper = new MonacoEditorHelper();
      const mockEditor = makeMockEditor();
      const event = { editor: mockEditor } as EditorInitializedEvent;

      helper.initEditor(event);

      expect(helper.editor).toBe(mockEditor);
      expect(mockEditor.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe('addBindings', () => {
    it('should do nothing when the editor is not yet initialized', () => {
      const helper = new MonacoEditorHelper();
      const applyEdit = vi.fn();

      // no error should be thrown, and applyEdit must never be invoked
      expect(() =>
        helper.addBindings({ 66: 'md.bold' }, applyEdit),
      ).not.toThrow();
      expect(applyEdit).not.toHaveBeenCalled();
    });

    it('should do nothing when bindings is empty/falsy even if editor is set', () => {
      const helper = new MonacoEditorHelper();
      const mockEditor = makeMockEditor();
      helper.initEditor({ editor: mockEditor } as EditorInitializedEvent);
      const applyEdit = vi.fn();

      helper.addBindings(
        undefined as unknown as Record<number, string>,
        applyEdit,
      );

      expect(mockEditor.addCommand).not.toHaveBeenCalled();
    });

    it('should register one addCommand call per binding entry with the correct numeric key', () => {
      const helper = new MonacoEditorHelper();
      const mockEditor = makeMockEditor();
      helper.initEditor({ editor: mockEditor } as EditorInitializedEvent);
      const applyEdit = vi.fn();

      const bindings = {
        66: 'md.bold', // Ctrl+B
        73: 'md.italic', // Ctrl+I
      };
      helper.addBindings(bindings, applyEdit);

      expect(mockEditor.addCommand).toHaveBeenCalledTimes(2);
      const calls = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock
        .calls;
      const keyCodesUsed = calls.map((c: any[]) => c[0]).sort((a, b) => a - b);
      expect(keyCodesUsed).toEqual([66, 73]);
    });

    it('should invoke applyEdit with the bound selector and editor when the registered command callback fires', () => {
      const helper = new MonacoEditorHelper();
      const mockEditor = makeMockEditor();
      helper.initEditor({ editor: mockEditor } as EditorInitializedEvent);
      const applyEdit = vi.fn();

      const bindings = {
        66: 'md.bold',
        73: 'md.italic',
      };
      helper.addBindings(bindings, applyEdit);

      const calls = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock
        .calls;
      // find the callback registered for key 66 and invoke it
      const boldCall = calls.find((c: any[]) => c[0] === 66)!;
      const boldCallback = boldCall[1] as () => void;
      boldCallback();

      expect(applyEdit).toHaveBeenCalledTimes(1);
      expect(applyEdit).toHaveBeenCalledWith('md.bold', mockEditor);

      // and the callback for key 73
      const italicCall = calls.find((c: any[]) => c[0] === 73)!;
      const italicCallback = italicCall[1] as () => void;
      italicCallback();

      expect(applyEdit).toHaveBeenCalledTimes(2);
      expect(applyEdit).toHaveBeenLastCalledWith('md.italic', mockEditor);
    });
  });
});
