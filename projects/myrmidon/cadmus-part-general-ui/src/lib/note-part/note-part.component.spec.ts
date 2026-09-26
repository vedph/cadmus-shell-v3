import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { TitleCasePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

import {
  provideMockMonacoEditor,
  NgxMonacoEditorFakeComponent,
} from '@jean-merelis/ngx-monaco-editor/testing';
import type { StandaloneCodeEditor } from '@jean-merelis/ngx-monaco-editor';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';
import { CADMUS_TEXT_ED_BINDINGS_TOKEN } from '@myrmidon/cadmus-text-ed';

import { NotePartComponent } from './note-part.component';
import { NotePart, NOTE_PART_TYPEID } from '../note-part';
import { MonacoEditorHelper } from '../monaco-editor-helper';

function makePart(overrides?: Partial<NotePart>): NotePart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: NOTE_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    text: 'hello',
    ...overrides,
  };
}

function makeMockEditor(): StandaloneCodeEditor {
  return {
    focus: vi.fn(),
    addCommand: vi.fn(),
    getSelection: vi.fn(),
    getModel: vi.fn(),
    executeEdits: vi.fn(),
  } as unknown as StandaloneCodeEditor;
}

describe('NotePartComponent', () => {
  let component: NotePartComponent;
  let fixture: ComponentFixture<NotePartComponent>;
  let authUser$: BehaviorSubject<User | null>;
  let mockEditor: StandaloneCodeEditor;

  async function setup(bindings?: Record<number, string>): Promise<void> {
    // safe to call more than once per test (e.g. to reconfigure with
    // different providers) since it discards any existing testing module
    TestBed.resetTestingModule();
    authUser$ = new BehaviorSubject<User | null>(null);
    const authService = {
      currentUser$: authUser$,
      get currentUserValue() {
        return authUser$.value;
      },
    };
    const appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };
    mockEditor = makeMockEditor();

    await TestBed.configureTestingModule({
      imports: [NotePartComponent],
      providers: [
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        // avoid depending on DomSanitizer's private SafeHtml wrapper shape:
        // return a plainly-inspectable marker string instead
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustHtml: (html: string) => `SAFE(${html})`,
          },
        },
        provideMockMonacoEditor({
          initializedEvent: { editor: mockEditor, monaco: {} as any },
        }),
        ...(bindings
          ? [{ provide: CADMUS_TEXT_ED_BINDINGS_TOKEN, useValue: bindings }]
          : []),
      ],
    })
      // swap the real Monaco editor component for the library's fake one so
      // that tests don't need to load the actual Monaco editor bundle
      .overrideComponent(NotePartComponent, {
        set: {
          imports: [
            FormsModule,
            ReactiveFormsModule,
            MatCard,
            MatCardHeader,
            MatCardAvatar,
            MatIcon,
            MatCardTitle,
            MatCardContent,
            MatFormField,
            MatLabel,
            MatInput,
            MatError,
            MatSelect,
            MatOption,
            TitleCasePipe,
            NgxMonacoEditorFakeComponent,
            MatCardActions,
            CloseSaveButtonsComponent,
            HelpLinkComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NotePartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onEditorInit (fired by the fake Monaco editor on init)', () => {
    it('should store the editor instance in the MonacoEditorHelper', () => {
      const helper = (component as any)._textHelper as MonacoEditorHelper;
      expect(helper.editor).toBe(mockEditor);
    });

    it('should not add any key bindings when no CADMUS_TEXT_ED_BINDINGS_TOKEN is provided', () => {
      expect(mockEditor.addCommand).not.toHaveBeenCalled();
    });

    it('should register key bindings on the editor when CADMUS_TEXT_ED_BINDINGS_TOKEN is provided', async () => {
      await setup({ 66: 'md.bold' });
      expect(mockEditor.addCommand).toHaveBeenCalledTimes(1);
      expect(mockEditor.addCommand).toHaveBeenCalledWith(
        66,
        expect.any(Function),
      );
    });
  });

  describe('onDataSet / updateThesauri / updateForm', () => {
    it('should reset the form when data is undefined', () => {
      const data: EditedObject<NotePart> = {
        value: makePart({ tag: 't', text: 'some text' }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.tag.value).toBe('t');
      expect(component.text.value).toBe('some text');

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      expect(component.tag.value).toBeNull();
      expect(component.text.value).toBeNull();
    });

    it('should populate tag/text controls from the part', () => {
      const data: EditedObject<NotePart> = {
        value: makePart({ tag: 'important', text: 'the text' }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.tag.value).toBe('important');
      expect(component.text.value).toBe('the text');
      expect(component.form.pristine).toBe(true);
    });

    it('should default tag to null when the part has none', () => {
      const data: EditedObject<NotePart> = {
        value: makePart({ tag: undefined }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.tag.value).toBeNull();
    });

    it('should populate tagEntries when the note-tags thesaurus is present', () => {
      const thesauri: ThesauriSet = {
        'note-tags': {
          id: 'note-tags@en',
          entries: [{ id: 'important', value: 'Important' }],
        },
      };
      const data: EditedObject<NotePart> = { value: makePart(), thesauri };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.tagEntries()).toEqual(thesauri['note-tags'].entries);
    });

    it('should clear tagEntries when the note-tags thesaurus is absent', () => {
      const data: EditedObject<NotePart> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.tagEntries()).toBeUndefined();
    });
  });

  describe('preview (updatePreview via debounced text.valueChanges)', () => {
    it('should render markdown from the text control into previewHtml', async () => {
      component.text.setValue('**bold**');
      // wait out the 50ms debounce with real timers: rxjs's asyncScheduler
      // does not reliably observe fake timers installed after the
      // debounced subscription was already set up in ngOnInit
      await new Promise((resolve) => setTimeout(resolve, 60));
      // the mocked DomSanitizer wraps its input in "SAFE(...)" so we can
      // inspect the sanitized markdown output without depending on
      // Angular's private SafeHtml wrapper implementation
      const html = component.previewHtml() as unknown as string;
      expect(html).toContain('SAFE(');
      expect(html).toContain('<strong>bold</strong>');
    });
  });

  describe('getValue', () => {
    it('should build a NotePart trimming the text and defaulting empty tag to undefined', () => {
      const data: EditedObject<NotePart> = {
        value: makePart(),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      component.tag.setValue('');
      component.text.setValue('  some text  ');

      const part = (component as any).getValue() as NotePart;
      expect(part.text).toBe('some text');
      expect(part.tag).toBeUndefined();
      expect(part.typeId).toBe(NOTE_PART_TYPEID);
    });

    it('should keep a non-empty tag', () => {
      const data: EditedObject<NotePart> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      component.tag.setValue('important');
      component.text.setValue('text');

      const part = (component as any).getValue() as NotePart;
      expect(part.tag).toBe('important');
    });

    it('should return an empty string for text when the control value is null', () => {
      const data: EditedObject<NotePart> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      component.text.setValue(null);
      const part = (component as any).getValue() as NotePart;
      expect(part.text).toBe('');
    });
  });
});
