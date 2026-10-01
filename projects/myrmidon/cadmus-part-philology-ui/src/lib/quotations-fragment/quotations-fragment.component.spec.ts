import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EditedObject, FragmentIdentity, ThesaurusEntry } from '@myrmidon/cadmus-core';

import { QuotationsFragmentComponent } from './quotations-fragment.component';
import { QuotationsFragment, QuotationEntry } from '../quotations-fragment';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function buildFragment(entries: QuotationEntry[]): QuotationsFragment {
  return {
    location: '1.1',
    entries,
  };
}

describe('QuotationsFragmentComponent', () => {
  let component: QuotationsFragmentComponent;
  let fixture: ComponentFixture<QuotationsFragmentComponent>;
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };
  let appRepository: { getTypeThesaurus: ReturnType<typeof vi.fn>; getSettingFor: ReturnType<typeof vi.fn> };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  const IDENTITY: FragmentIdentity = {
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    partId: 'part1',
    roleId: null,
    frTypeId: 'fr.it.vedph.quotations',
    frRoleId: null,
    loc: '1.1',
  };

  const ENTRY_A: QuotationEntry = {
    author: 'Verg',
    work: 'ecl',
    citation: '1.1',
  };
  const ENTRY_B: QuotationEntry = {
    author: 'Ov',
    work: 'met',
    citation: '1.2',
  };

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
      imports: [QuotationsFragmentComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotationsFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region buildForm
  it('should build an initially invalid form (entries array empty)', () => {
    expect(plain(component.form.entries().value())).toEqual([]);
    expect(!!component.form.entries().getError('strictMinLength')).toBe(true);
    expect(component.form().invalid()).toBe(true);
  });

  it('should become valid once at least one entry is present', () => {
    component.form.entries().value.set(plain([ENTRY_A]));
    expect(component.form.entries().valid()).toBe(true);
  });
  //#endregion

  //#region onDataSet / updateForm
  it('should reset entries when the data has no value', () => {
    component.form.entries().value.set(plain([ENTRY_A]));
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(plain(component.form.entries().value())).toEqual([]);
  });

  it('should populate entries from the fragment and mark the form pristine', () => {
    const data: EditedObject<QuotationsFragment> = {
      value: buildFragment([ENTRY_A, ENTRY_B]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_A, ENTRY_B]));
    expect(component.form().dirty()).toBe(false);
  });

  it('should compute frText from baseText and the fragment location', () => {
    const data: EditedObject<QuotationsFragment> = {
      value: { ...buildFragment([]), location: '1.1' },
      thesauri: {},
      baseText: 'hello world',
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.frText()).toBe('hello');
  });

  it('should populate workEntries/tagEntries when their thesauri are present', () => {
    const workEntries: ThesaurusEntry[] = [
      { id: 'Verg.', value: 'Vergilius' },
      { id: 'Verg.ecl.', value: 'Eclogae' },
    ];
    const tagEntries: ThesaurusEntry[] = [{ id: 'poetry', value: 'Poetry' }];
    const data: EditedObject<QuotationsFragment> = {
      value: buildFragment([]),
      thesauri: {
        'quotation-works': { id: 'quotation-works@en', entries: workEntries },
        'quotation-tags': { id: 'quotation-tags@en', entries: tagEntries },
      },
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.workEntries()).toEqual(workEntries);
    expect(component.tagEntries()).toEqual(tagEntries);
    // workDictionary is derived from workEntries via QuotationWorksService
    expect(component.workDictionary()).toEqual({
      Verg: [workEntries[0], workEntries[1]],
    });
  });

  it('should clear workEntries/tagEntries when their thesauri are absent', () => {
    const data: EditedObject<QuotationsFragment> = {
      value: buildFragment([]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.workEntries()).toBeUndefined();
    expect(component.tagEntries()).toBeUndefined();
    expect(component.workDictionary()).toEqual({});
  });
  //#endregion

  //#region getNameFromId
  it('getNameFromId should resolve a work entry display value, falling back to the id', () => {
    const data: EditedObject<QuotationsFragment> = {
      value: buildFragment([]),
      thesauri: {
        'quotation-works': {
          id: 'quotation-works@en',
          entries: [{ id: 'Verg', value: 'Vergilius' }],
        },
      },
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.getNameFromId('Verg')).toBe('Vergilius');
    expect(component.getNameFromId('unknown')).toBe('unknown');
  });
  //#endregion

  //#region getValue
  it('getValue should build a fragment carrying the current entries', () => {
    fixture.componentRef.setInput('identity', IDENTITY);
    const data: EditedObject<QuotationsFragment> = {
      value: buildFragment([ENTRY_A]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));

    const value = (component as any).getValue() as QuotationsFragment;
    expect(value.entries).toEqual(plain([ENTRY_A, ENTRY_B]));
    expect(value.location).toBe('1.1');
  });
  //#endregion

  //#region addEntry / editEntry / saveEntry / closeEntry
  it('addEntry should open the editor for a new blank entry at index -1', () => {
    component.addEntry();
    expect(component.editedEntryIndex()).toBe(-1);
    expect(component.editedEntry()).toEqual({ author: '', work: '', citation: '' });
  });

  it('editEntry should open the editor with a deep copy of the given entry', () => {
    component.editEntry(ENTRY_A, 0);
    expect(component.editedEntryIndex()).toBe(0);
    expect(component.editedEntry()).toEqual(plain(ENTRY_A));
    expect(component.editedEntry()).not.toBe(ENTRY_A); // structuredClone: distinct reference
  });

  it('saveEntry should append a new entry when editedEntryIndex is -1', () => {
    component.form.entries().value.set(plain([ENTRY_A]));
    component.addEntry();

    component.saveEntry(ENTRY_B);

    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_A, ENTRY_B]));
    expect(component.form.entries().dirty()).toBe(true);
    // the editor closes after saving
    expect(component.editedEntryIndex()).toBe(-1);
    expect(component.editedEntry()).toBeUndefined();
  });

  it('saveEntry should replace the entry at editedEntryIndex when editing an existing one', () => {
    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));
    component.editEntry(ENTRY_A, 0);

    const updated: QuotationEntry = { ...ENTRY_A, citation: '2.2' };
    component.saveEntry(updated);

    expect(plain(component.form.entries().value())).toEqual(plain([updated, ENTRY_B]));
  });

  it('closeEntry should clear the edited entry state', () => {
    component.editEntry(ENTRY_A, 0);
    component.closeEntry();
    expect(component.editedEntryIndex()).toBe(-1);
    expect(component.editedEntry()).toBeUndefined();
  });
  //#endregion

  //#region removeEntry
  it('removeEntry should remove the entry at the given index when confirmed', () => {
    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));
    dialogService.confirm.mockReturnValue(of(true));

    component.removeEntry(0);

    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_B]));
    expect(component.form.entries().dirty()).toBe(true);
  });

  it('removeEntry should not remove the entry when the user cancels', () => {
    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));
    dialogService.confirm.mockReturnValue(of(false));

    component.removeEntry(0);

    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_A, ENTRY_B]));
  });
  //#endregion

  //#region moveEntryUp / moveEntryDown
  it('moveEntryUp should swap the entry with its predecessor', () => {
    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));
    component.moveEntryUp(1);
    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_B, ENTRY_A]));
  });

  it('moveEntryUp should do nothing for the first entry', () => {
    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));
    component.moveEntryUp(0);
    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_A, ENTRY_B]));
  });

  it('moveEntryDown should swap the entry with its successor', () => {
    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));
    component.moveEntryDown(0);
    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_B, ENTRY_A]));
  });

  it('moveEntryDown should do nothing for the last entry', () => {
    component.form.entries().value.set(plain([ENTRY_A, ENTRY_B]));
    component.moveEntryDown(1);
    expect(plain(component.form.entries().value())).toEqual(plain([ENTRY_A, ENTRY_B]));
  });
  //#endregion

  it('should render its editor and buttons inside no <form>', () => {
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });
});
