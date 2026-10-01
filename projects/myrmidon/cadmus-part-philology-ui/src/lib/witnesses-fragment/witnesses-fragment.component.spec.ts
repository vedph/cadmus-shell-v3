import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, FragmentIdentity } from '@myrmidon/cadmus-core';

import {
  NgxMonacoEditorComponent,
} from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

import { WitnessesFragmentComponent } from './witnesses-fragment.component';
import { WitnessesFragment, Witness } from '../witnesses-fragment';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function buildFragment(witnesses: Witness[]): WitnessesFragment {
  return {
    location: '1.1',
    witnesses,
  };
}

describe('WitnessesFragmentComponent', () => {
  let component: WitnessesFragmentComponent;
  let fixture: ComponentFixture<WitnessesFragmentComponent>;
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };
  let appRepository: { getTypeThesaurus: ReturnType<typeof vi.fn>; getSettingFor: ReturnType<typeof vi.fn> };

  const IDENTITY: FragmentIdentity = {
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    partId: 'part1',
    roleId: null,
    frTypeId: 'fr.it.vedph.witnesses',
    frRoleId: null,
    loc: '1.1',
  };

  const WITNESS_A: Witness = { id: 'A', citation: 'cod. A', text: 'lorem' };
  const WITNESS_B: Witness = { id: 'B', citation: 'cod. B', text: 'ipsum' };

  beforeEach(async () => {
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [WitnessesFragmentComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
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
          initializedEvent: { editor: { focus: vi.fn() } as any, monaco: {} as any },
        }),
      ],
    })
      // swap the real Monaco editor component for the library's fake one so
      // tests don't need to load the actual Monaco editor bundle
      .overrideComponent(WitnessesFragmentComponent, {
        remove: { imports: [NgxMonacoEditorComponent] },
        add: { imports: [NgxMonacoEditorFakeComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(WitnessesFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region buildForm
  it('should build an initially invalid form (witnesses required)', () => {
    expect(plain(component.form.witnesses().value())).toEqual([]);
    expect(!!component.form.witnesses().getError('strictMinLength')).toBe(true);
    expect(component.form().invalid()).toBe(true);
  });
  //#endregion

  //#region onDataSet / updateForm
  it('should reset the form when the data has no value', () => {
    component.form.witnesses().value.set(plain([WITNESS_A]));
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(plain(component.form.witnesses().value())).toEqual([]);
  });

  it('should populate witnesses from the fragment', () => {
    const data: EditedObject<WitnessesFragment> = {
      value: buildFragment([WITNESS_A, WITNESS_B]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.witnesses().value())).toEqual(plain([WITNESS_A, WITNESS_B]));
  });

  it('should compute frText from baseText and the fragment location', () => {
    const data: EditedObject<WitnessesFragment> = {
      value: { ...buildFragment([]), location: '1.1' },
      thesauri: {},
      baseText: 'hello world',
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.frText()).toBe('hello');
  });

  it('should reset the form when data becomes undefined after having had a value', () => {
    // must first set a real value: a signal input starting at undefined and
    // then set to undefined again is a no-op that would not re-trigger the
    // effect watching it
    const data: EditedObject<WitnessesFragment> = {
      value: buildFragment([WITNESS_A]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(plain(component.form.witnesses().value())).toEqual(plain([WITNESS_A]));

    fixture.componentRef.setInput('data', undefined);
    fixture.detectChanges();

    expect(plain(component.form.witnesses().value())).toEqual([]);
  });
  //#endregion

  //#region getValue
  it('getValue should build a fragment carrying the current witnesses', () => {
    fixture.componentRef.setInput('identity', IDENTITY);
    const data: EditedObject<WitnessesFragment> = {
      value: buildFragment([WITNESS_A]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    component.form.witnesses().value.set(plain([WITNESS_A, WITNESS_B]));

    const value = (component as any).getValue() as WitnessesFragment;
    expect(value.witnesses).toEqual(plain([WITNESS_A, WITNESS_B]));
    expect(value.location).toBe('1.1');
  });
  //#endregion

  //#region openCurrentWitness / closeCurrentWitness
  it('openCurrentWitness() with no argument should open a blank witness form', () => {
    component.openCurrentWitness();
    expect(component.currentWitnessOpen()).toBe(true);
    expect(component.currentWitnessId()).toBeUndefined();
    expect(component.witness.id().value()).toBe('');
  });

  it('openCurrentWitness(witness) should populate the witness form and mark it pristine', () => {
    component.openCurrentWitness(WITNESS_A);
    expect(component.currentWitnessOpen()).toBe(true);
    expect(component.currentWitnessId()).toBe('A');
    expect(plain(component.witness.id().value())).toBe('A');
    expect(plain(component.witness.citation().value())).toBe('cod. A');
    expect(plain(component.witness.text().value())).toBe('lorem');
    expect(component.witness().dirty()).toBe(false);
  });

  it('closeCurrentWitness should close the witness form', () => {
    component.openCurrentWitness(WITNESS_A);
    component.closeCurrentWitness();
    expect(component.currentWitnessOpen()).toBe(false);
    expect(component.currentWitnessId()).toBeUndefined();
  });
  //#endregion

  //#region saveCurrentWitness
  it('saveCurrentWitness should do nothing when the witness form is invalid', () => {
    component.openCurrentWitness();
    // id/citation/text required and left empty => invalid
    component.saveCurrentWitness();
    expect(plain(component.form.witnesses().value())).toEqual([]);
  });

  it('saveCurrentWitness should append a new witness and close the editor', () => {
    component.form.witnesses().value.set(plain([WITNESS_A]));
    component.openCurrentWitness();
    component.witness.id().value.set('C');
    component.witness.citation().value.set('cod. C');
    component.witness.text().value.set('dolor');

    component.saveCurrentWitness();

    expect(plain(component.form.witnesses().value())).toEqual([
      WITNESS_A,
      { id: 'C', citation: 'cod. C', text: 'dolor', note: undefined },
    ]);
    expect(component.form.witnesses().dirty()).toBe(true);
    expect(component.currentWitnessOpen()).toBe(false);
  });

  it('saveCurrentWitness should replace an existing witness with the same id and citation', () => {
    component.form.witnesses().value.set(plain([WITNESS_A, WITNESS_B]));
    component.openCurrentWitness(WITNESS_A);
    component.witness.text().value.set('updated text');

    component.saveCurrentWitness();

    expect(plain(component.form.witnesses().value())).toEqual([
      { id: 'A', citation: 'cod. A', text: 'updated text', note: undefined },
      WITNESS_B,
    ]);
  });

  it('saveCurrentWitness should trim the saved field values', () => {
    component.form.witnesses().value.set(plain([]));
    component.openCurrentWitness();
    component.witness.id().value.set('  D  ');
    component.witness.citation().value.set('  cod. D  ');
    component.witness.text().value.set('  text  ');
    component.witness.note().value.set('  note  ');

    component.saveCurrentWitness();

    expect(plain(component.form.witnesses().value())).toEqual([
      { id: 'D', citation: 'cod. D', text: 'text', note: 'note' },
    ]);
  });
  //#endregion

  //#region deleteWitness
  it('deleteWitness should remove the witness at the given index and dirty the control', () => {
    component.form.witnesses().value.set(plain([WITNESS_A, WITNESS_B]));
    component.deleteWitness(0);
    expect(plain(component.form.witnesses().value())).toEqual(plain([WITNESS_B]));
    expect(component.form.witnesses().dirty()).toBe(true);
  });
  //#endregion

  //#region moveWitnessUp / moveWitnessDown
  it('moveWitnessUp should swap the witness with its predecessor', () => {
    component.form.witnesses().value.set(plain([WITNESS_A, WITNESS_B]));
    component.moveWitnessUp(1);
    expect(plain(component.form.witnesses().value())).toEqual(plain([WITNESS_B, WITNESS_A]));
  });

  it('moveWitnessUp should do nothing for the first witness (bug fix regression check)', () => {
    // regression test: moveWitnessUp(0) used to compute
    // witnesses.splice(-1, 0, w), which Array.splice interprets as
    // "insert before the last element" rather than a no-op, silently
    // reordering [A, B, C] into [B, A, C]. It is now guarded like the
    // sibling moveEntryUp in quotations-fragment.component.ts.
    const WITNESS_C: Witness = { id: 'C', citation: 'cod. C', text: 'x' };
    component.form.witnesses().value.set(plain([WITNESS_A, WITNESS_B, WITNESS_C]));
    component.moveWitnessUp(0);
    expect(plain(component.form.witnesses().value())).toEqual([
      WITNESS_A,
      WITNESS_B,
      WITNESS_C,
    ]);
  });

  it('moveWitnessDown should swap the witness with its successor', () => {
    component.form.witnesses().value.set(plain([WITNESS_A, WITNESS_B]));
    component.moveWitnessDown(0);
    expect(plain(component.form.witnesses().value())).toEqual(plain([WITNESS_B, WITNESS_A]));
  });

  it('moveWitnessDown should be a no-op for the last witness', () => {
    component.form.witnesses().value.set(plain([WITNESS_A, WITNESS_B]));
    component.moveWitnessDown(1);
    expect(plain(component.form.witnesses().value())).toEqual(plain([WITNESS_A, WITNESS_B]));
  });
  //#endregion

  //#region markdown preview (debounced text/note values)
  it('should render sanitized markdown from the text control into textPreviewHtml', async () => {
    component.openCurrentWitness();
    component.witness.text().value.set('**bold**');
    // toObservable emits only when change detection runs
    fixture.detectChanges();
    // wait out the 50ms debounce with real timers: rxjs's asyncScheduler
    // does not reliably observe fake timers installed after the debounced
    // subscription was already set up in ngOnInit
    await new Promise((resolve) => setTimeout(resolve, 80));

    const html = component.textPreviewHtml() as unknown as string;
    expect(html).toContain('SAFE(');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('should render sanitized markdown from the note control into notePreviewHtml', async () => {
    component.openCurrentWitness();
    component.witness.note().value.set('*em*');
    // toObservable emits only when change detection runs
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 80));

    const html = component.notePreviewHtml() as unknown as string;
    expect(html).toContain('SAFE(');
    expect(html).toContain('<em>em</em>');
  });
  //#endregion

  it('should render its editor and buttons inside no <form>', () => {
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });

  it('should save the witness on Enter in its ID input', () => {
    component.openCurrentWitness();
    component.witness.citation().value.set('cod. E');
    component.witness.text().value.set('text');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[spellcheck="false"]',
    );
    input.value = 'E';
    input.dispatchEvent(new Event('input'));
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
      bubbles: true,
    });
    input.dispatchEvent(enter);

    expect(plain(component.form.witnesses().value())).toEqual([
      { id: 'E', citation: 'cod. E', text: 'text', note: undefined },
    ]);
    expect(component.currentWitnessOpen()).toBe(false);
    expect(enter.defaultPrevented).toBe(true);
  });
});
