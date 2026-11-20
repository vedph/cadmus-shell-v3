import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusTreeComponent } from '@myrmidon/cadmus-thesaurus-store';

import { ThesaurusEntryPicker } from './thesaurus-entry-picker';

// stand-in for the external tree component, exposing only what is bound
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
];

describe('ThesaurusEntryPicker', () => {
  let fixture: ComponentFixture<ThesaurusEntryPicker>;
  let component: ThesaurusEntryPicker;
  let emitted: ThesaurusEntry[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThesaurusEntryPicker],
    })
      .overrideComponent(ThesaurusEntryPicker, {
        remove: { imports: [ThesaurusTreeComponent] },
        add: { imports: [FakeThesaurusTree] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ThesaurusEntryPicker);
    component = fixture.componentInstance;
    emitted = [];
    component.entryChange.subscribe((e) => emitted.push(e));
  });

  async function set(inputs: Record<string, unknown>): Promise<void> {
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function tree(): FakeThesaurusTree | undefined {
    return fixture.debugElement.query(By.directive(FakeThesaurusTree))
      ?.componentInstance;
  }

  it('shows a list for flat entries', async () => {
    await set({ entries: FLAT });
    expect(component.effectiveView()).toBe('flat');
    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
    expect(tree()).toBeUndefined();
  });

  it('shows a tree for hierarchical entries', async () => {
    await set({ entries: TREE });
    expect(component.effectiveView()).toBe('tree');
    expect(tree()).toBeTruthy();
    expect(tree()!.entries()).toEqual(TREE);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
  });

  it('honors an explicit flat view for hierarchical entries', async () => {
    await set({ entries: TREE, view: 'flat' });
    expect(component.effectiveView()).toBe('flat');
    expect(tree()).toBeUndefined();
  });

  it('passes a default label renderer to the tree', async () => {
    await set({ entries: TREE });
    expect(tree()!.renderLabel()!('a: b')).toBe('b');
  });

  it('passes a custom label renderer to the tree', async () => {
    await set({ entries: TREE, renderLabel: (l: string) => l.toUpperCase() });
    expect(tree()!.renderLabel()!('a: b')).toBe('A: B');
  });

  it('emits the entry picked from the tree', async () => {
    await set({ entries: TREE });
    tree()!.entryChange.emit(TREE[1]);
    expect(emitted).toEqual([TREE[1]]);
  });

  it('hides the tree when disabled', async () => {
    await set({ entries: TREE, disabled: true });
    expect(tree()).toBeUndefined();
  });

  it('emits the entry selected from the list', async () => {
    await set({ entries: FLAT });
    component.onSelectionChange('green');
    expect(emitted).toEqual([FLAT[1]]);
  });

  it('ignores an unknown selected ID', async () => {
    await set({ entries: FLAT });
    component.onSelectionChange('blue');
    expect(emitted).toEqual([]);
  });

  it('does not emit when inputs change', async () => {
    await set({ entries: FLAT, value: 'red' });
    await set({ value: 'green' });
    expect(emitted).toEqual([]);
  });

  it('detects a value not found among entries', async () => {
    await set({ entries: FLAT, value: 'blue' });
    expect(component.orphanValue()).toBe('blue');
    await set({ value: 'red' });
    expect(component.orphanValue()).toBeNull();
    await set({ value: '' });
    expect(component.orphanValue()).toBeNull();
  });
});
