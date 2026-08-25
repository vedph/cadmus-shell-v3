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
import { EditedObject, FragmentIdentity, ThesauriSet } from '@myrmidon/cadmus-core';

import { ApparatusFragmentComponent } from './apparatus-fragment.component';
import {
  ApparatusEntry,
  ApparatusEntryType,
  ApparatusFragment,
} from '../apparatus-fragment';

function buildEntry(partial?: Partial<ApparatusEntry>): ApparatusEntry {
  return {
    type: ApparatusEntryType.replacement,
    value: 'lectio',
    ...partial,
  };
}

function buildFragment(
  entries: ApparatusEntry[],
  extra?: Partial<ApparatusFragment>,
): ApparatusFragment {
  return {
    location: '1.1',
    entries,
    ...extra,
  };
}

describe('ApparatusFragmentComponent', () => {
  let component: ApparatusFragmentComponent;
  let fixture: ComponentFixture<ApparatusFragmentComponent>;
  let currentUser$: BehaviorSubject<User | null>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  const identity: FragmentIdentity = {
    itemId: 'item1',
    typeId: 'it.vedph.token-text',
    partId: 'part1',
    roleId: null,
    frTypeId: 'fr.it.vedph.apparatus',
    frRoleId: null,
    loc: '1.1',
  };

  beforeEach(async () => {
    currentUser$ = new BehaviorSubject<User | null>(null);
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ApparatusFragmentComponent,
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: AuthJwtService,
          useValue: { currentUser$, currentUserValue: null },
        },
        {
          provide: AppRepository,
          useValue: {
            getTypeThesaurus: vi.fn(),
            getSettingFor: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApparatusFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region buildForm
  it('should build a form with entries requiring at least 1 item', () => {
    expect(component.entries.value).toEqual([]);
    expect(component.entries.hasError('minlength')).toBe(true);
    component.entries.setValue([buildEntry()]);
    expect(component.entries.valid).toBe(true);
  });

  it('tag control should reject values over 50 characters', () => {
    component.tag.setValue('a'.repeat(51));
    expect(component.tag.hasError('maxlength')).toBe(true);
  });
  //#endregion

  //#region onDataSet / updateForm / updateThesauri
  it('should reset the form and clear the summary when data has no value', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment([buildEntry()]),
      thesauri: {},
    });
    fixture.detectChanges();
    expect(component.entries.value.length).toBe(1);

    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(component.entries.value).toEqual([]);
    expect(component.summary()).toBeUndefined();
  });

  it('should populate tag/entries and mark the form pristine from a fragment', () => {
    const fragment = buildFragment([buildEntry({ value: 'a' })], {
      tag: 'crux',
    });
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: fragment, thesauri: {} });
    fixture.detectChanges();

    expect(component.tag.value).toBe('crux');
    expect(component.entries.value).toEqual(fragment.entries);
    expect(component.form.pristine).toBe(true);
  });

  it('should build and set the summary from the fragment', () => {
    const fragment = buildFragment([buildEntry({ value: 'a' })]);
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: fragment, thesauri: {} });
    fixture.detectChanges();

    expect(component.summary()).toContain('adpar-value');
    expect(component.summary()).toContain('a');
  });

  it('should compute frText from baseText and location when both are present', () => {
    const fragment = buildFragment([buildEntry({ value: 'a' })], {
      location: '1.1',
    });
    const data: EditedObject<ApparatusFragment> = {
      value: fragment,
      baseText: 'alpha beta\r\ngamma\r\ndelta epsilon',
      thesauri: {},
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.frText()).toBe('alpha');
  });

  it('should populate each thesaurus entries signal when present in the data', () => {
    const thesauri: ThesauriSet = {
      'apparatus-tags': { id: 'apparatus-tags', entries: [{ id: 't1', value: 'T1' }] },
      'apparatus-witnesses': {
        id: 'apparatus-witnesses',
        entries: [{ id: 'w1', value: 'W1' }],
      },
      'apparatus-authors': {
        id: 'apparatus-authors',
        entries: [{ id: 'a1', value: 'A1' }],
      },
      'apparatus-author-tags': {
        id: 'apparatus-author-tags',
        entries: [{ id: 'at1', value: 'AT1' }],
      },
      'author-works': {
        id: 'author-works',
        entries: [{ id: 'wk1', value: 'WK1' }],
      },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment([buildEntry()]),
      thesauri,
    });
    fixture.detectChanges();

    expect(component.tagEntries()).toEqual(thesauri['apparatus-tags'].entries);
    expect(component.witEntries()).toEqual(
      thesauri['apparatus-witnesses'].entries,
    );
    expect(component.authEntries()).toEqual(
      thesauri['apparatus-authors'].entries,
    );
    expect(component.authTagEntries()).toEqual(
      thesauri['apparatus-author-tags'].entries,
    );
    expect(component.workEntries()).toEqual(thesauri['author-works'].entries);
  });

  it('should clear thesaurus entries signals when a later update omits them', () => {
    const thesauri: ThesauriSet = {
      'apparatus-tags': { id: 'apparatus-tags', entries: [{ id: 't1', value: 'T1' }] },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment([buildEntry()]),
      thesauri,
    });
    fixture.detectChanges();
    expect(component.tagEntries()).toEqual(thesauri['apparatus-tags'].entries);

    fixture.componentRef.setInput('data', {
      value: buildFragment([buildEntry()]),
      thesauri: {},
    });
    fixture.detectChanges();
    expect(component.tagEntries()).toBeUndefined();
  });
  //#endregion

  //#region getValue
  it('getValue should build a fragment from the identity/form with a trimmed tag', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    component.tag.setValue('  crux  ');
    component.entries.setValue([buildEntry({ value: 'a' })]);

    const value = (component as any).getValue() as ApparatusFragment;
    expect(value.location).toBe(identity.loc);
    expect(value.tag).toBe('crux');
    expect(value.entries).toEqual([buildEntry({ value: 'a' })]);
  });
  //#endregion

  //#region getEntryTypeDsc / getEntryTypeIcon
  it('getEntryTypeDsc should describe each entry type, defaulting to replacement', () => {
    expect(component.getEntryTypeDsc(ApparatusEntryType.replacement)).toBe(
      'Replacement',
    );
    expect(
      component.getEntryTypeDsc(ApparatusEntryType.additionBefore),
    ).toBe('Addition before');
    expect(component.getEntryTypeDsc(ApparatusEntryType.additionAfter)).toBe(
      'Addition after',
    );
    expect(component.getEntryTypeDsc(ApparatusEntryType.note)).toBe('Note');
    expect(component.getEntryTypeDsc(999)).toBe('Replacement');
  });

  it('getEntryTypeIcon should return an icon name for each entry type, defaulting to content_copy', () => {
    expect(component.getEntryTypeIcon(ApparatusEntryType.replacement)).toBe(
      'content_copy',
    );
    expect(
      component.getEntryTypeIcon(ApparatusEntryType.additionBefore),
    ).toBe('skip_next');
    expect(
      component.getEntryTypeIcon(ApparatusEntryType.additionAfter),
    ).toBe('skip_previous');
    expect(component.getEntryTypeIcon(ApparatusEntryType.note)).toBe('chat');
    expect(component.getEntryTypeIcon(999)).toBe('content_copy');
  });
  //#endregion

  //#region addEntry / editEntry / closeEntry
  it('addEntry should start editing a new replacement entry at index -1', () => {
    component.addEntry();
    expect(component.editedEntryIndex()).toBe(-1);
    expect(component.editedEntry()).toEqual({
      type: ApparatusEntryType.replacement,
    });
  });

  it('editEntry should set the index and a deep clone of the entry (mutation-safe)', () => {
    const entry = buildEntry({ value: 'x', witnesses: [{ value: 'w1' }] });
    component.editEntry(entry, 2);

    expect(component.editedEntryIndex()).toBe(2);
    expect(component.editedEntry()).toEqual(entry);
    expect(component.editedEntry()).not.toBe(entry);

    // mutating the original should not affect the cloned signal value
    entry.value = 'mutated';
    expect(component.editedEntry()!.value).toBe('x');
  });

  it('closeEntry should reset index/entry when an entry is being edited', () => {
    component.editEntry(buildEntry(), 0);
    component.closeEntry();
    expect(component.editedEntryIndex()).toBe(-1);
    expect(component.editedEntry()).toBeUndefined();
  });

  it('closeEntry should be a no-op when no entry is being edited (bug fix)', () => {
    // before the fix, `if (!this.editedEntry)` checked the signal function
    // itself (always truthy) instead of its value, so this guard never
    // triggered; verify it now actually guards.
    expect(component.editedEntry()).toBeUndefined();
    expect(component.editedEntryIndex()).toBe(-1);
    component.closeEntry();
    expect(component.editedEntryIndex()).toBe(-1);
    expect(component.editedEntry()).toBeUndefined();
  });
  //#endregion

  //#region saveEntry
  it('saveEntry should append a new entry when editedEntryIndex is -1', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment([]),
      thesauri: {},
    });
    fixture.detectChanges();

    component.addEntry();
    const newEntry = buildEntry({ value: 'new' });
    component.saveEntry(newEntry);

    expect(component.entries.value).toEqual([newEntry]);
    expect(component.entries.dirty).toBe(true);
  });

  it('saveEntry should replace the entry at editedEntryIndex when editing an existing one', () => {
    const original = [buildEntry({ value: 'a' }), buildEntry({ value: 'b' })];
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment(original),
      thesauri: {},
    });
    fixture.detectChanges();

    component.editEntry(original[1], 1);
    const edited = buildEntry({ value: 'b-edited' });
    component.saveEntry(edited);

    expect(component.entries.value).toEqual([original[0], edited]);
  });

  it('saveEntry should update the summary and close the entry editor', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment([]),
      thesauri: {},
    });
    fixture.detectChanges();

    component.addEntry();
    component.saveEntry(buildEntry({ value: 'x' }));

    expect(component.summary()).toContain('x');
    expect(component.editedEntry()).toBeUndefined();
    expect(component.editedEntryIndex()).toBe(-1);
  });

  it('saveEntry should be a no-op when no entry is being edited (bug fix)', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment([buildEntry({ value: 'kept' })]),
      thesauri: {},
    });
    fixture.detectChanges();

    // no addEntry()/editEntry() call: editedEntry() is undefined
    component.saveEntry(buildEntry({ value: 'should-not-be-saved' }));

    expect(component.entries.value).toEqual([buildEntry({ value: 'kept' })]);
  });
  //#endregion

  //#region removeEntry
  it('removeEntry should remove the entry at index after confirming', () => {
    const entries = [buildEntry({ value: 'a' }), buildEntry({ value: 'b' })];
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment(entries),
      thesauri: {},
    });
    fixture.detectChanges();

    component.removeEntry(0);

    expect(dialogService.confirm).toHaveBeenCalled();
    expect(component.entries.value).toEqual([entries[1]]);
    expect(component.entries.dirty).toBe(true);
  });

  it('removeEntry should do nothing when the user cancels the confirmation', () => {
    dialogService.confirm.mockReturnValue(of(false));
    const entries = [buildEntry({ value: 'a' })];
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment(entries),
      thesauri: {},
    });
    fixture.detectChanges();

    component.removeEntry(0);

    expect(component.entries.value).toEqual(entries);
  });
  //#endregion

  //#region moveEntryUp / moveEntryDown
  it('moveEntryUp should swap with the previous entry, and no-op at index 0', () => {
    const entries = [buildEntry({ value: 'a' }), buildEntry({ value: 'b' })];
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment(entries),
      thesauri: {},
    });
    fixture.detectChanges();

    component.moveEntryUp(0);
    expect(component.entries.value.map((e: ApparatusEntry) => e.value)).toEqual([
      'a',
      'b',
    ]);

    component.moveEntryUp(1);
    expect(component.entries.value.map((e: ApparatusEntry) => e.value)).toEqual([
      'b',
      'a',
    ]);
  });

  it('moveEntryDown should swap with the next entry, and no-op at the last index', () => {
    const entries = [buildEntry({ value: 'a' }), buildEntry({ value: 'b' })];
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', {
      value: buildFragment(entries),
      thesauri: {},
    });
    fixture.detectChanges();

    component.moveEntryDown(1);
    expect(component.entries.value.map((e: ApparatusEntry) => e.value)).toEqual([
      'a',
      'b',
    ]);

    component.moveEntryDown(0);
    expect(component.entries.value.map((e: ApparatusEntry) => e.value)).toEqual([
      'b',
      'a',
    ]);
  });
  //#endregion
});
