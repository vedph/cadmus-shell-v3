import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EditedObject } from '@myrmidon/cadmus-core';
import { NgxMonacoEditorComponent } from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

import { TokenTextPartComponent } from './token-text-part.component';
import { TokenTextPart, TokenTextLine } from '../token-text-part';

function buildPart(lines: TokenTextLine[]): TokenTextPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.token-text',
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    citation: 'cit',
    lines,
  };
}

describe('TokenTextPartComponent', () => {
  let component: TokenTextPartComponent;
  let fixture: ComponentFixture<TokenTextPartComponent>;
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };
  let appRepository: { getTypeThesaurus: ReturnType<typeof vi.fn>; getSettingFor: ReturnType<typeof vi.fn> };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };
    dialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, TokenTextPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: DialogService, useValue: dialogService },
        provideMockMonacoEditor({
          initializedEvent: { editor: { focus: vi.fn() } as any, monaco: {} as any },
        }),
      ],
    })
      .overrideComponent(TokenTextPartComponent, {
        remove: { imports: [NgxMonacoEditorComponent] },
        add: { imports: [NgxMonacoEditorFakeComponent] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TokenTextPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region form validators
  it('should require text', () => {
    component.text.setValue(null);
    expect(component.text.hasError('required')).toBe(true);
    component.text.setValue('hello');
    expect(component.text.valid).toBe(true);
  });
  //#endregion

  //#region onDataSet / updateForm / getTextFromModel
  it('should reset the form when data has no value', () => {
    component.citation.setValue('x');
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.citation.value).toBeNull();
  });

  it('should join model lines with LF to populate the text control', () => {
    const part = buildPart([
      { y: 1, text: 'line one' },
      { y: 2, text: 'line two' },
      { y: 3, text: 'line three' },
    ]);
    const data: EditedObject<TokenTextPart> = { value: part, thesauri: {} };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.citation.value).toBe('cit');
    expect(component.text.value).toBe('line one\nline two\nline three');
    expect(component.form.pristine).toBe(true);
  });

  it('should set text to null when the model has no lines', () => {
    const part = buildPart([]);
    (part as any).lines = undefined;
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();
    expect(component.text.value).toBeNull();
  });
  //#endregion

  //#region getValue / getLinesFromText
  it('getValue should split the text into numbered lines starting at 1', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.text.setValue('alpha\nbeta\ngamma');

    const value = (component as any).getValue() as TokenTextPart;
    expect(value.lines).toEqual([
      { y: 1, text: 'alpha' },
      { y: 2, text: 'beta' },
      { y: 3, text: 'gamma' },
    ]);
  });

  it('getValue should return an empty lines array for empty text', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.text.setValue('');

    const value = (component as any).getValue() as TokenTextPart;
    expect(value.lines).toEqual([]);
  });

  it('getValue should trim the citation and set it undefined when blank', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.text.setValue('x');
    component.citation.setValue('  my citation  ');

    let value = (component as any).getValue() as TokenTextPart;
    expect(value.citation).toBe('my citation');

    component.citation.setValue('   ');
    value = (component as any).getValue() as TokenTextPart;
    expect(value.citation).toBeUndefined();
  });

  // Regression test: getLinesFromText() used to normalize CRLF via
  // text.replace('\r\n', '\n') -- a plain string pattern with no /g flag,
  // which only replaces the FIRST match. With more than one CRLF sequence,
  // every line after the first kept a trailing stray '\r' character. Fixed
  // to use a global regex (/\r\n/g). This test would have failed against
  // the pre-fix implementation (it would have produced 'beta\r' etc.).
  it('getValue should normalize ALL CRLF sequences, not just the first one', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.text.setValue('alpha\r\nbeta\r\ngamma\r\ndelta');

    const value = (component as any).getValue() as TokenTextPart;
    expect(value.lines).toEqual([
      { y: 1, text: 'alpha' },
      { y: 2, text: 'beta' },
      { y: 3, text: 'gamma' },
      { y: 4, text: 'delta' },
    ]);
    // in particular, no line should retain a stray '\r'
    for (const line of value.lines) {
      expect(line.text.includes('\r')).toBe(false);
    }
  });
  //#endregion

  //#region applyTransform - whitespace normalization
  it('applyTransform("ws") should collapse runs of spaces/tabs and trim edges', () => {
    dialogService.confirm.mockReturnValue(of(true));
    component.transform.setValue('ws');
    component.text.setValue('  a   b  \n  c  ');

    component.applyTransform();

    expect(dialogService.confirm).toHaveBeenCalledWith(
      'Transform Text',
      'Apply whitespace normalization?',
    );
    expect(component.text.value).toBe('a b\nc');
    expect(component.text.dirty).toBe(true);
  });

  it('applyTransform("ws") should not change the text when not confirmed', () => {
    dialogService.confirm.mockReturnValue(of(false));
    component.transform.setValue('ws');
    component.text.setValue('  a   b  ');

    component.applyTransform();

    expect(component.text.value).toBe('  a   b  ');
    expect(component.text.dirty).toBe(false);
  });
  //#endregion

  //#region applyTransform - split at stops
  it('applyTransform("split") should break text into one line per sentence (LF join)', () => {
    dialogService.confirm.mockReturnValue(of(true));
    component.transform.setValue('split');
    component.text.setValue('Hi. Bye! Ok.');

    component.applyTransform();

    expect(dialogService.confirm).toHaveBeenCalledWith(
      'Transform Text',
      'Apply text splitting?',
    );
    expect(component.text.value).toBe('Hi.\nBye!\nOk.');
  });

  it('applyTransform("split") should keep runs of punctuation together', () => {
    dialogService.confirm.mockReturnValue(of(true));
    component.transform.setValue('split');
    component.text.setValue('Wait... What?');

    component.applyTransform();

    expect(component.text.value).toBe('Wait...\nWhat?');
  });

  it('applyTransform("split") should join with CRLF when the original text contains CRLF', () => {
    dialogService.confirm.mockReturnValue(of(true));
    component.transform.setValue('split');
    component.text.setValue('Hi.\r\nBye! Ok.');

    component.applyTransform();

    expect(component.text.value).toBe('Hi.\r\nBye!\r\nOk.');
  });

  it('applyTransform("split") should leave text with no stop punctuation as a single line', () => {
    dialogService.confirm.mockReturnValue(of(true));
    component.transform.setValue('split');
    component.text.setValue('Just plain text');

    component.applyTransform();

    expect(component.text.value).toBe('Just plain text');
  });
  //#endregion

  it('applyTransform should do nothing for an unknown transform value', () => {
    component.transform.setValue('unknown' as any);
    component.text.setValue('a b');
    component.applyTransform();
    expect(dialogService.confirm).not.toHaveBeenCalled();
    expect(component.text.value).toBe('a b');
  });
});
