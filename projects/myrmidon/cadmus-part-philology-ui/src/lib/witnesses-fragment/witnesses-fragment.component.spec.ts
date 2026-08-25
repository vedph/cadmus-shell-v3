import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
      imports: [FormsModule, ReactiveFormsModule, WitnessesFragmentComponent],
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
    expect(component.witnesses.value).toBeNull();
    expect(component.witnesses.hasError('required')).toBe(true);
    expect(component.form.invalid).toBe(true);
  });
  //#endregion

  //#region onDataSet / updateForm
  it('should reset the form when the data has no value', () => {
    component.witnesses.setValue([WITNESS_A]);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.witnesses.value).toBeNull();
  });

  it('should populate witnesses from the fragment', () => {
    const data: EditedObject<WitnessesFragment> = {
      value: buildFragment([WITNESS_A, WITNESS_B]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.witnesses.value).toEqual([WITNESS_A, WITNESS_B]);
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
    expect(component.witnesses.value).toEqual([WITNESS_A]);

    fixture.componentRef.setInput('data', undefined);
    fixture.detectChanges();

    expect(component.witnesses.value).toBeNull();
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

    component.witnesses.setValue([WITNESS_A, WITNESS_B]);

    const value = (component as any).getValue() as WitnessesFragment;
    expect(value.witnesses).toEqual([WITNESS_A, WITNESS_B]);
    expect(value.location).toBe('1.1');
  });
  //#endregion

  //#region openCurrentWitness / closeCurrentWitness
  it('openCurrentWitness() with no argument should open a blank witness form', () => {
    component.openCurrentWitness();
    expect(component.currentWitnessOpen()).toBe(true);
    expect(component.currentWitnessId()).toBeUndefined();
    expect(component.id.value).toBeNull();
    expect(component.witness.enabled).toBe(true);
  });

  it('openCurrentWitness(witness) should populate the witness form and mark it pristine', () => {
    component.openCurrentWitness(WITNESS_A);
    expect(component.currentWitnessOpen()).toBe(true);
    expect(component.currentWitnessId()).toBe('A');
    expect(component.id.value).toBe('A');
    expect(component.citation.value).toBe('cod. A');
    expect(component.text.value).toBe('lorem');
    expect(component.witness.pristine).toBe(true);
  });

  it('closeCurrentWitness should close and disable the witness form', () => {
    component.openCurrentWitness(WITNESS_A);
    component.closeCurrentWitness();
    expect(component.currentWitnessOpen()).toBe(false);
    expect(component.currentWitnessId()).toBeUndefined();
    expect(component.witness.disabled).toBe(true);
  });
  //#endregion

  //#region saveCurrentWitness
  it('saveCurrentWitness should do nothing when the witness form is invalid', () => {
    component.openCurrentWitness();
    // id/citation/text required and left empty => invalid
    component.saveCurrentWitness();
    expect(component.witnesses.value).toBeNull();
  });

  it('saveCurrentWitness should append a new witness and close the editor', () => {
    component.witnesses.setValue([WITNESS_A]);
    component.openCurrentWitness();
    component.id.setValue('C');
    component.citation.setValue('cod. C');
    component.text.setValue('dolor');

    component.saveCurrentWitness();

    expect(component.witnesses.value).toEqual([
      WITNESS_A,
      { id: 'C', citation: 'cod. C', text: 'dolor', note: undefined },
    ]);
    expect(component.witnesses.dirty).toBe(true);
    expect(component.currentWitnessOpen()).toBe(false);
  });

  it('saveCurrentWitness should replace an existing witness with the same id and citation', () => {
    component.witnesses.setValue([WITNESS_A, WITNESS_B]);
    component.openCurrentWitness(WITNESS_A);
    component.text.setValue('updated text');

    component.saveCurrentWitness();

    expect(component.witnesses.value).toEqual([
      { id: 'A', citation: 'cod. A', text: 'updated text', note: undefined },
      WITNESS_B,
    ]);
  });

  it('saveCurrentWitness should trim the saved field values', () => {
    component.witnesses.setValue([]);
    component.openCurrentWitness();
    component.id.setValue('  D  ');
    component.citation.setValue('  cod. D  ');
    component.text.setValue('  text  ');
    component.note.setValue('  note  ');

    component.saveCurrentWitness();

    expect(component.witnesses.value).toEqual([
      { id: 'D', citation: 'cod. D', text: 'text', note: 'note' },
    ]);
  });
  //#endregion

  //#region deleteWitness
  it('deleteWitness should remove the witness at the given index and dirty the control', () => {
    component.witnesses.setValue([WITNESS_A, WITNESS_B]);
    component.deleteWitness(0);
    expect(component.witnesses.value).toEqual([WITNESS_B]);
    expect(component.witnesses.dirty).toBe(true);
  });
  //#endregion

  //#region moveWitnessUp / moveWitnessDown
  it('moveWitnessUp should swap the witness with its predecessor', () => {
    component.witnesses.setValue([WITNESS_A, WITNESS_B]);
    component.moveWitnessUp(1);
    expect(component.witnesses.value).toEqual([WITNESS_B, WITNESS_A]);
  });

  it('moveWitnessUp should do nothing for the first witness (bug fix regression check)', () => {
    // regression test: moveWitnessUp(0) used to compute
    // witnesses.splice(-1, 0, w), which Array.splice interprets as
    // "insert before the last element" rather than a no-op, silently
    // reordering [A, B, C] into [B, A, C]. It is now guarded like the
    // sibling moveEntryUp in quotations-fragment.component.ts.
    const WITNESS_C: Witness = { id: 'C', citation: 'cod. C', text: 'x' };
    component.witnesses.setValue([WITNESS_A, WITNESS_B, WITNESS_C]);
    component.moveWitnessUp(0);
    expect(component.witnesses.value).toEqual([
      WITNESS_A,
      WITNESS_B,
      WITNESS_C,
    ]);
  });

  it('moveWitnessDown should swap the witness with its successor', () => {
    component.witnesses.setValue([WITNESS_A, WITNESS_B]);
    component.moveWitnessDown(0);
    expect(component.witnesses.value).toEqual([WITNESS_B, WITNESS_A]);
  });

  it('moveWitnessDown should be a no-op for the last witness', () => {
    component.witnesses.setValue([WITNESS_A, WITNESS_B]);
    component.moveWitnessDown(1);
    expect(component.witnesses.value).toEqual([WITNESS_A, WITNESS_B]);
  });
  //#endregion

  //#region markdown preview (debounced text/note valueChanges)
  it('should render sanitized markdown from the text control into textPreviewHtml', async () => {
    component.openCurrentWitness();
    component.text.setValue('**bold**');
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
    component.note.setValue('*em*');
    await new Promise((resolve) => setTimeout(resolve, 80));

    const html = component.notePreviewHtml() as unknown as string;
    expect(html).toContain('SAFE(');
    expect(html).toContain('<em>em</em>');
  });
  //#endregion
});
