import { Component, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { form, FormField } from '@angular/forms/signals';
import { Observable, of, Subject } from 'rxjs';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusTreeComponent } from '@myrmidon/cadmus-thesaurus-store';
import { TaxoStoreNode } from '@myrmidon/taxo-store-api';
import { TaxoStorePicker } from '@myrmidon/taxo-store-picker';

import { ThesOrTaxoPick } from '../../models';
import { ThesOrTaxoSourceService } from '../../services/thes-or-taxo-source.service';
import { ThesaurusEntryPicker } from '../thesaurus-entry-picker/thesaurus-entry-picker';
import { ThesOrTaxoPicker } from './thes-or-taxo-picker';

// stand-ins for the external components, exposing only what is bound
@Component({ selector: 'ts-taxo-store-picker', template: '' })
class FakeTaxoStorePicker {
  public readonly treeId = input.required<string | null>();
  public readonly label = input<string>();
  public readonly hasTopNodeFilter = input(true);
  public readonly hasFeaturesFilter = input(true);
  public readonly canEdit = input(true);
  public readonly canAdd = input(true);
  public readonly canDelete = input(true);
  public readonly nodePick = output<TaxoStoreNode | null>();
}

@Component({ selector: 'cadmus-thesaurus-tree', template: '' })
class FakeThesaurusTree {
  public readonly entries = input<ThesaurusEntry[]>();
  public readonly renderLabel = input<(label: string) => string>();
  public readonly entryChange = output<ThesaurusEntry>();
}

const FLAT: ThesaurusEntry[] = [
  { id: 'red', value: 'Red' },
  { id: 'green', value: 'Green' },
];
const TREE: ThesaurusEntry[] = [
  { id: 'person', value: 'person' },
  { id: 'person.birth', value: 'person: birth' },
  { id: 'person.death', value: 'person: death' },
];

function node(key: string, label: string): TaxoStoreNode {
  return { id: 1, treeId: 'tree', key, label } as TaxoStoreNode;
}

interface SourceMock {
  getThesaurusEntries: ReturnType<typeof vi.fn>;
  getTaxoNodeLabel: ReturnType<typeof vi.fn>;
  setTaxoNodeLabel: ReturnType<typeof vi.fn<(tree: string, key: string, label: string) => void>>;
}

function createSourceMock(): SourceMock {
  const labels = new Map<string, string>();
  return {
    getThesaurusEntries: vi.fn().mockReturnValue(of([])),
    getTaxoNodeLabel: vi.fn(
      (tree: string, key: string): Observable<string | null> =>
        of(labels.get(`${tree}/${key}`) ?? null),
    ),
    setTaxoNodeLabel: vi.fn((tree: string, key: string, label: string) => {
      labels.set(`${tree}/${key}`, label);
    }),
  };
}

function configure(source: SourceMock) {
  return TestBed.configureTestingModule({
    imports: [ThesOrTaxoPicker],
    providers: [{ provide: ThesOrTaxoSourceService, useValue: source }],
  })
    .overrideComponent(ThesOrTaxoPicker, {
      remove: { imports: [TaxoStorePicker] },
      add: { imports: [FakeTaxoStorePicker] },
    })
    .overrideComponent(ThesaurusEntryPicker, {
      remove: { imports: [ThesaurusTreeComponent] },
      add: { imports: [FakeThesaurusTree] },
    });
}

describe('ThesOrTaxoPicker', () => {
  let fixture: ComponentFixture<ThesOrTaxoPicker>;
  let component: ThesOrTaxoPicker;
  let source: SourceMock;
  let values: string[];
  let picks: ThesOrTaxoPick[];
  let touches: number;

  beforeEach(async () => {
    source = createSourceMock();
    await configure(source).compileComponents();
    fixture = TestBed.createComponent(ThesOrTaxoPicker);
    component = fixture.componentInstance;
    values = [];
    picks = [];
    touches = 0;
    component.value.subscribe((v) => values.push(v));
    component.pick.subscribe((p) => picks.push(p));
    component.touch.subscribe(() => touches++);
  });

  async function set(inputs: Record<string, unknown>): Promise<void> {
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function query<T>(type: new (...args: any[]) => T): T | undefined {
    return fixture.debugElement.query(By.directive(type))?.componentInstance;
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  // #region unbound
  describe('unbound mode', () => {
    it('is the default mode', async () => {
      await set({});
      expect(component.effectiveMode()).toBe('unbound');
      expect(el().querySelector('input')).toBeTruthy();
    });

    it('shows the bound value without emitting', async () => {
      await set({ value: 'hello' });
      expect(el().querySelector('input')!.value).toBe('hello');
      expect(values).toEqual([]);
      expect(picks).toEqual([]);
    });

    it('emits typed text', async () => {
      await set({});
      const input = el().querySelector('input')!;
      input.value = 'abc';
      input.dispatchEvent(new Event('input'));
      expect(component.value()).toBe('abc');
      expect(values).toEqual(['abc']);
      expect(picks).toEqual([{ value: 'abc', label: 'abc', mode: 'unbound' }]);
    });

    it('emits touch on blur', async () => {
      await set({});
      el().querySelector('input')!.dispatchEvent(new Event('blur'));
      expect(touches).toBe(1);
    });

    it('does not emit when readonly', async () => {
      await set({ readonly: true });
      const input = el().querySelector('input')!;
      input.value = 'abc';
      input.dispatchEvent(new Event('input'));
      expect(values).toEqual([]);
    });

    it('clears the value', async () => {
      await set({ value: 'abc' });
      const button = el().querySelector<HTMLButtonElement>('.clear-button')!;
      expect(button).toBeTruthy();
      button.click();
      expect(values).toEqual(['']);
      expect(picks[0]).toEqual({ value: '', mode: 'unbound', source: undefined });
    });

    it('hides the clear button when not allowed', async () => {
      await set({ value: 'abc', canClear: false });
      expect(el().querySelector('.clear-button')).toBeNull();
    });

    it('does not request any source', async () => {
      await set({ source: 'ignored', value: 'abc' });
      expect(source.getThesaurusEntries).not.toHaveBeenCalled();
      expect(source.getTaxoNodeLabel).not.toHaveBeenCalled();
    });
  });
  // #endregion

  // #region thesaurus
  describe('thesaurus mode', () => {
    it('uses the entries input without loading', async () => {
      await set({ mode: 'thesaurus', source: 'colors@en', entries: FLAT });
      expect(source.getThesaurusEntries).not.toHaveBeenCalled();
      expect(component.thesEntries()).toEqual(FLAT);
      expect(component.thesView()).toBe('flat');
    });

    it('loads entries from the thesaurus ID', async () => {
      source.getThesaurusEntries.mockReturnValue(of(FLAT));
      await set({ mode: 'thesaurus', source: 'colors@en' });
      expect(source.getThesaurusEntries).toHaveBeenCalledWith('colors@en');
      expect(component.thesEntries()).toEqual(FLAT);
      expect(component.effectiveMode()).toBe('thesaurus');
    });

    it('shows progress while loading', async () => {
      const entries$ = new Subject<ThesaurusEntry[]>();
      source.getThesaurusEntries.mockReturnValue(entries$);
      await set({ mode: 'thesaurus', source: 'colors@en' });
      expect(component.loading()).toBe(true);
      expect(component.effectiveMode()).toBe('thesaurus');
      expect(el().querySelector('mat-progress-bar')).toBeTruthy();

      entries$.next(FLAT);
      await set({});
      expect(component.loading()).toBe(false);
      expect(el().querySelector('mat-progress-bar')).toBeNull();
    });

    it('reloads when the thesaurus ID changes', async () => {
      source.getThesaurusEntries.mockImplementation((id: string) =>
        of(id === 'colors@en' ? FLAT : TREE),
      );
      await set({ mode: 'thesaurus', source: 'colors@en' });
      await set({ source: 'events@en' });
      expect(component.thesEntries()).toEqual(TREE);
    });

    it('shows a flat list for a flat thesaurus', async () => {
      await set({ mode: 'thesaurus', entries: FLAT, value: 'red' });
      const picker = query(ThesaurusEntryPicker)!;
      expect(picker.effectiveView()).toBe('flat');
      expect(picker.value()).toBe('red');
    });

    it('shows a tree with the value label for a hierarchical thesaurus', async () => {
      await set({ mode: 'thesaurus', entries: TREE, value: 'person.birth' });
      expect(component.thesView()).toBe('tree');
      expect(query(FakeThesaurusTree)).toBeTruthy();
      expect(component.valueLabel()).toBe('person: birth');
      expect(el().querySelector('.value-label')!.textContent).toContain(
        'person: birth',
      );
      expect(el().querySelector('.value-id')!.textContent).toContain(
        'person.birth',
      );
    });

    it('shows the raw value when not found in the thesaurus', async () => {
      await set({ mode: 'thesaurus', entries: TREE, value: 'legacy' });
      expect(component.valueLabel()).toBeUndefined();
      expect(el().querySelector('.value-label')!.textContent).toContain(
        'legacy',
      );
    });

    it('honors an explicit view', async () => {
      await set({ mode: 'thesaurus', entries: TREE, thesaurusView: 'flat' });
      expect(component.thesView()).toBe('flat');
      expect(query(FakeThesaurusTree)).toBeUndefined();
    });

    it('emits a picked entry with its label and source', async () => {
      source.getThesaurusEntries.mockReturnValue(of(TREE));
      await set({ mode: 'thesaurus', source: 'events@en' });
      query(FakeThesaurusTree)!.entryChange.emit(TREE[2]);
      expect(component.value()).toBe('person.death');
      expect(values).toEqual(['person.death']);
      expect(picks).toEqual([
        {
          value: 'person.death',
          label: 'person: death',
          mode: 'thesaurus',
          source: 'events@en',
        },
      ]);
      expect(touches).toBe(1);
    });

    it('has no source when entries come from input', async () => {
      await set({ mode: 'thesaurus', entries: FLAT });
      query(ThesaurusEntryPicker)!.entryChange.emit(FLAT[1]);
      expect(picks[0].source).toBeUndefined();
    });

    it('does not emit when the same entry is picked', async () => {
      await set({ mode: 'thesaurus', entries: FLAT, value: 'red' });
      query(ThesaurusEntryPicker)!.entryChange.emit(FLAT[0]);
      expect(values).toEqual([]);
      expect(picks).toEqual([]);
    });

    it('does not emit when inputs change', async () => {
      await set({ mode: 'thesaurus', entries: FLAT, value: 'red' });
      await set({ value: 'green' });
      await set({ entries: TREE });
      expect(values).toEqual([]);
      expect(picks).toEqual([]);
    });

    it('disables picking when disabled', async () => {
      await set({ mode: 'thesaurus', entries: TREE, disabled: true });
      expect(query(FakeThesaurusTree)).toBeUndefined();
      component.onEntryChange(TREE[1]);
      expect(values).toEqual([]);
    });

    it('falls back to unbound for an empty thesaurus', async () => {
      source.getThesaurusEntries.mockReturnValue(of([]));
      await set({ mode: 'thesaurus', source: 'missing@en', value: 'x' });
      expect(component.effectiveMode()).toBe('unbound');
      expect(el().querySelector('input')!.value).toBe('x');
    });

    it('falls back to unbound for no thesaurus ID nor entries', async () => {
      await set({ mode: 'thesaurus' });
      expect(component.effectiveMode()).toBe('unbound');
      expect(source.getThesaurusEntries).not.toHaveBeenCalled();
    });

    it('falls back to unbound for empty entries', async () => {
      await set({ mode: 'thesaurus', entries: [] });
      expect(component.effectiveMode()).toBe('unbound');
    });

    it('shows a message when fallback is disabled', async () => {
      await set({ mode: 'thesaurus', entries: [], fallbackToUnbound: false });
      expect(component.effectiveMode()).toBeNull();
      expect(el().querySelector('.no-source')!.textContent).toContain(
        'no thesaurus',
      );
      expect(el().querySelector('input')).toBeNull();
    });
  });
  // #endregion

  // #region taxonomy
  describe('taxonomy mode', () => {
    it('shows the taxonomy picker with its settings', async () => {
      await set({
        mode: 'taxonomy',
        source: 'events',
        label: 'type',
        canEditNode: true,
        canAddNode: true,
        canDeleteNode: false,
        hasTopNodeFilter: false,
      });
      const picker = query(FakeTaxoStorePicker)!;
      expect(picker).toBeTruthy();
      expect(picker.treeId()).toBe('events');
      expect(picker.label()).toBe('type');
      expect(picker.canEdit()).toBe(true);
      expect(picker.canAdd()).toBe(true);
      expect(picker.canDelete()).toBe(false);
      expect(picker.hasTopNodeFilter()).toBe(false);
      expect(picker.hasFeaturesFilter()).toBe(false);
    });

    it('does not allow editing nodes by default', async () => {
      await set({ mode: 'taxonomy', source: 'events' });
      const picker = query(FakeTaxoStorePicker)!;
      expect(picker.canEdit()).toBe(false);
      expect(picker.canAdd()).toBe(false);
      expect(picker.canDelete()).toBe(false);
    });

    it('resolves the label of the bound value', async () => {
      source.setTaxoNodeLabel('events', 'birth', 'Birth');
      await set({ mode: 'taxonomy', source: 'events', value: 'birth' });
      expect(source.getTaxoNodeLabel).toHaveBeenCalledWith('events', 'birth');
      expect(component.valueLabel()).toBe('Birth');
      expect(el().querySelector('.value-label')!.textContent).toContain('Birth');
      expect(values).toEqual([]);
    });

    it('shows the key when the node is not found', async () => {
      await set({ mode: 'taxonomy', source: 'events', value: 'gone' });
      expect(component.valueLabel()).toBeUndefined();
      expect(el().querySelector('.value-label')!.textContent).toContain('gone');
    });

    it('emits a picked node and caches its label', async () => {
      await set({ mode: 'taxonomy', source: 'events' });
      query(FakeTaxoStorePicker)!.nodePick.emit(node('death', 'Death'));
      await set({});
      expect(values).toEqual(['death']);
      expect(picks).toEqual([
        { value: 'death', label: 'Death', mode: 'taxonomy', source: 'events' },
      ]);
      expect(source.setTaxoNodeLabel).toHaveBeenCalledWith(
        'events',
        'death',
        'Death',
      );
      expect(component.valueLabel()).toBe('Death');
    });

    it('ignores a null pick', async () => {
      await set({ mode: 'taxonomy', source: 'events', value: 'birth' });
      query(FakeTaxoStorePicker)!.nodePick.emit(null);
      expect(values).toEqual([]);
      expect(component.value()).toBe('birth');
    });

    it('clears the value', async () => {
      await set({ mode: 'taxonomy', source: 'events', value: 'birth' });
      el().querySelector<HTMLButtonElement>('.clear-button')!.click();
      expect(values).toEqual(['']);
      expect(picks[0]).toEqual({ value: '', mode: 'taxonomy', source: 'events' });
    });

    it('hides the picker when readonly', async () => {
      await set({
        mode: 'taxonomy',
        source: 'events',
        value: 'birth',
        readonly: true,
      });
      expect(query(FakeTaxoStorePicker)).toBeUndefined();
      expect(el().querySelector('.clear-button')).toBeNull();
    });

    it('falls back to unbound with no tree ID', async () => {
      await set({ mode: 'taxonomy', value: 'x' });
      expect(component.effectiveMode()).toBe('unbound');
      expect(query(FakeTaxoStorePicker)).toBeUndefined();
    });

    it('shows a message with no tree ID when fallback is disabled', async () => {
      await set({ mode: 'taxonomy', fallbackToUnbound: false });
      expect(el().querySelector('.no-source')!.textContent).toContain(
        'no taxonomy',
      );
    });
  });
  // #endregion

  it('switches mode at runtime', async () => {
    await set({ mode: 'thesaurus', entries: FLAT, value: 'red' });
    expect(component.effectiveMode()).toBe('thesaurus');
    await set({ mode: 'taxonomy', source: 'events' });
    expect(component.effectiveMode()).toBe('taxonomy');
    await set({ mode: 'unbound' });
    expect(component.effectiveMode()).toBe('unbound');
    expect(values).toEqual([]);
  });
});

// #region signal forms
@Component({
  imports: [ThesOrTaxoPicker, FormField],
  template: `<cadmus-thes-or-taxo-picker
    mode="thesaurus"
    [entries]="entries"
    [formField]="form.type"
  />`,
})
class SignalFormHost {
  public readonly entries = FLAT;
  public readonly model = signal({ type: 'red' });
  public readonly form = form(this.model);
}

describe('ThesOrTaxoPicker with signal forms', () => {
  let fixture: ComponentFixture<SignalFormHost>;
  let host: SignalFormHost;

  beforeEach(async () => {
    await configure(createSourceMock())
      .configureTestingModule({ imports: [SignalFormHost] })
      .compileComponents();
    fixture = TestBed.createComponent(SignalFormHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function picker(): ThesOrTaxoPicker {
    return fixture.debugElement.query(By.directive(ThesOrTaxoPicker))
      .componentInstance;
  }

  it('gets the value from the form without making it dirty', () => {
    expect(picker().value()).toBe('red');
    expect(host.form.type().dirty()).toBe(false);
  });

  it('writes a picked value to the form', async () => {
    fixture.debugElement
      .query(By.directive(ThesaurusEntryPicker))
      .componentInstance.entryChange.emit(FLAT[1]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.model().type).toBe('green');
    expect(host.form.type().dirty()).toBe(true);
    expect(host.form.type().touched()).toBe(true);
  });

  it('gets values set in the form', async () => {
    host.form.type().value.set('green');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(picker().value()).toBe('green');
  });
});
// #endregion
