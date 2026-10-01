import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesaurusEntry } from '@myrmidon/cadmus-core';

import { OrthographyFragmentComponent } from './orthography-fragment.component';
import { OrthographyFragment } from '../orthography-fragment';
import { EditOperation, OperationType } from '../services/edit-operation';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function buildFragment(
  overrides: Partial<OrthographyFragment> = {},
): OrthographyFragment {
  return {
    location: '1.1',
    reference: 'std',
    ...overrides,
  };
}

describe('OrthographyFragmentComponent', () => {
  let component: OrthographyFragmentComponent;
  let fixture: ComponentFixture<OrthographyFragmentComponent>;
  let authService: {
    currentUser$: BehaviorSubject<User | null>;
    currentUserValue: User | null;
  };
  let appRepository: {
    getTypeThesaurus: ReturnType<typeof vi.fn>;
    getSettingFor: ReturnType<typeof vi.fn>;
  };
  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };
    clipboard = { copy: vi.fn() };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OrthographyFragmentComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: Clipboard, useValue: clipboard },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrthographyFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build a form with default values', () => {
    expect(plain(component.form.reference().value())).toBe('');
    expect(component.form.language().value()).toBe('');
    expect(plain(component.form.tags().value())).toEqual([]);
    expect(component.form.note().value()).toBe('');
    expect(plain(component.form.operations().value())).toEqual([]);
    expect(plain(component.form.textTarget().value())).toBe(false);
  });

  //#region onDataSet / updateForm
  it('should reset the form when data has no value', () => {
    component.form.reference().value.set('abc');
    component.form.tags().value.set([{ id: 't1', value: 'T1' }]);

    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(plain(component.form.reference().value())).toBe('');
    expect(plain(component.form.tags().value())).toEqual([]);
    expect(plain(component.form.operations().value())).toEqual([]);
  });

  it('should populate thesauri signals from data and clear missing ones', () => {
    const langs: ThesaurusEntry[] = [{ id: 'lat', value: 'Latin' }];
    const tags: ThesaurusEntry[] = [{ id: 'tag1', value: 'Tag 1' }];
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment(),
      thesauri: {
        'orthography-languages': { id: 'orthography-languages', entries: langs },
        'orthography-tags': { id: 'orthography-tags', entries: tags },
        // orthography-op-tags intentionally missing
      },
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.langEntries()).toEqual(langs);
    expect(component.tagEntries()).toEqual(tags);
    expect(component.opTagEntries()).toBeUndefined();
  });

  it('should map fragment tag ids to thesaurus entries, falling back to {id, value: id}', () => {
    const tags: ThesaurusEntry[] = [{ id: 'tag1', value: 'Tag 1' }];
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment({ tags: ['tag1', 'unknown'] }),
      thesauri: {
        'orthography-tags': { id: 'orthography-tags', entries: tags },
      },
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.tags().value())).toEqual([
      { id: 'tag1', value: 'Tag 1' },
      { id: 'unknown', value: 'unknown' },
    ]);
  });

  it('should populate reference, language, note and textTarget from the fragment', () => {
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment({
        reference: 'stdform',
        language: 'lat',
        note: 'a note',
        isTextTarget: true,
      }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.reference().value())).toBe('stdform');
    expect(plain(component.form.language().value())).toBe('lat');
    expect(plain(component.form.note().value())).toBe('a note');
    expect(plain(component.form.textTarget().value())).toBe(true);
    expect(component.form().dirty()).toBe(false);
  });

  it('should parse fragment.operations DSL strings into EditOperation instances and disable reference', () => {
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment({ operations: ['@1x2="ab"'] }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.form.operations().value().length).toBe(1);
    expect(component.form.operations().value()[0].type).toBe(OperationType.Replace);
    expect(component.form.operations().value()[0].at).toBe(1);
    expect(component.form.reference().disabled()).toBe(true);
  });

  it('should enable reference when the fragment has no operations', () => {
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment({ operations: [] }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.operations().value())).toEqual([]);
    expect(component.form.reference().disabled()).toBe(false);
  });

  it('should recover from an unparseable operations DSL string by clearing operations', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment({ operations: ['not a valid dsl string'] }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.operations().value())).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should compute frText from baseText and the fragment location', () => {
    const data: EditedObject<OrthographyFragment> = {
      baseText: 'alpha beta',
      value: buildFragment({ location: '1.1' }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.frText()).toBe('alpha');
  });
  //#endregion

  //#region reference auto disable effect (independent of updateForm)
  it('should disable the reference control whenever operations become non-empty, and re-enable it when cleared', () => {
    expect(component.form.reference().disabled()).toBe(false);

    const op = EditOperation.createOperation(OperationType.Replace);
    component.form.operations().value.set([op]);
    fixture.detectChanges();
    expect(component.form.reference().disabled()).toBe(true);

    component.form.operations().value.set([]);
    fixture.detectChanges();
    expect(component.form.reference().disabled()).toBe(false);
  });
  //#endregion

  //#region sourceText / targetText
  it('sourceText should be frText and targetText the reference when textTarget is false', () => {
    const data: EditedObject<OrthographyFragment> = {
      baseText: 'alpha beta',
      value: buildFragment({ location: '1.1', reference: 'ref-text' }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.sourceText()).toBe('alpha');
    expect(component.targetText()).toBe('ref-text');
  });

  it('sourceText should be the reference and targetText frText when textTarget is true', () => {
    const data: EditedObject<OrthographyFragment> = {
      baseText: 'alpha beta',
      value: buildFragment({
        location: '1.1',
        reference: 'ref-text',
        isTextTarget: true,
      }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.sourceText()).toBe('ref-text');
    expect(component.targetText()).toBe('alpha');
  });
  //#endregion

  //#region getValue
  it('getValue should build a fragment from the current form values', () => {
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment({ reference: 'orig' }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    component.form.reference().value.set('newref');
    component.form.language().value.set(' lat ');
    component.form.note().value.set(' a note ');
    component.form.tags().value.set([{ id: 't1', value: 'T1' }]);

    const value = (component as any).getValue() as OrthographyFragment;

    expect(value.reference).toBe('newref');
    expect(value.language).toBe('lat');
    expect(value.note).toBe('a note');
    expect(value.tags).toEqual(['t1']);
  });

  it('getValue should serialize operations back to their DSL string form', () => {
    const data: EditedObject<OrthographyFragment> = {
      value: buildFragment({ operations: ['@1x2="ab"'] }),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    const value = (component as any).getValue() as OrthographyFragment;

    expect(value.operations).toEqual(['@1x2="ab"']);
  });
  //#endregion

  //#region onOperationsChange / onTagEntriesChange
  it('onOperationsChange should update and dirty the operations control', () => {
    const op = EditOperation.createOperation(OperationType.Replace);
    component.onOperationsChange([op]);
    expect(plain(component.form.operations().value())).toEqual([op]);
    expect(component.form.operations().dirty()).toBe(true);
  });

  it('onTagEntriesChange should update and dirty the tags control', () => {
    const entries: ThesaurusEntry[] = [{ id: 't1', value: 'T1' }];
    component.onTagEntriesChange(entries);
    expect(plain(component.form.tags().value())).toEqual(entries);
    expect(component.form.tags().dirty()).toBe(true);
  });
  //#endregion

  it('renderLabel should delegate to renderLabelFromLastColon', () => {
    expect(component.renderLabel('a:b:c')).toBe('c');
    expect(component.renderLabel('noColon')).toBe('noColon');
  });

  it('onTagChange should copy the tag id to the clipboard and show a snackbar', () => {
    component.onTagChange({ id: 'tag-x', value: 'Tag X' });
    expect(clipboard.copy).toHaveBeenCalledWith('tag-x');
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should render its editor and buttons inside no <form>', () => {
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });

  it('should save the text target flag', () => {
    fixture.componentRef.setInput('data', {
      value: buildFragment({ isTextTarget: false }),
      thesauri: {},
    });
    fixture.detectChanges();
    const box: HTMLInputElement = fixture.nativeElement.querySelector(
      'mat-checkbox input',
    );
    box.click();
    fixture.detectChanges();
    expect(component.form.textTarget().value()).toBe(true);

    component.save();

    expect(component.data()!.value!.isTextTarget).toBe(true);
  });

  it('should show the reference length error', () => {
    component.form.reference().value.set('x'.repeat(101));
    component.form.reference().markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('reference too long');
  });
});
