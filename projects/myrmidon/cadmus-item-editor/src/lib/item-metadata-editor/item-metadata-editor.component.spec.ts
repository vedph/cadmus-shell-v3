import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacetDefinition, FlagDefinition, Item } from '@myrmidon/cadmus-core';

import {
  ItemMetadata,
  ItemMetadataEditorComponent,
  toItemMetadata,
  toItemMetadataDraft,
} from './item-metadata-editor.component';

function makeItem(overrides?: Partial<Item>): Item {
  return {
    id: 'item1',
    title: 'Item 1',
    description: 'Desc',
    facetId: 'facet1',
    groupId: 'g1',
    sortKey: 'sk',
    flags: 0,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

function makeFlag(id: number, isAdmin = false): FlagDefinition {
  return {
    id,
    label: `flag${id}`,
    description: '',
    colorKey: 'ff0000',
    isAdmin,
  };
}

const FACETS: FacetDefinition[] = [
  {
    id: 'facet1',
    label: 'Facet 1',
    colorKey: '',
    description: '',
    partDefinitions: [],
  } as unknown as FacetDefinition,
];

describe('item metadata helpers', () => {
  it('toItemMetadataDraft should map an undefined item to empty values', () => {
    expect(toItemMetadataDraft(undefined)).toEqual({
      title: '',
      sortKey: '',
      description: '',
      facet: null,
      group: '',
      flags: 0,
    });
  });

  it('toItemMetadata should trim the text values', () => {
    expect(
      toItemMetadata({
        title: ' t ',
        sortKey: ' s ',
        description: ' d ',
        facet: ' f ',
        group: ' g ',
        flags: 3,
      }),
    ).toEqual({
      title: 't',
      sortKey: 's',
      description: 'd',
      facetId: 'f',
      groupId: 'g',
      flags: 3,
    });
  });
});

describe('ItemMetadataEditorComponent', () => {
  let fixture: ComponentFixture<ItemMetadataEditorComponent>;
  let component: ItemMetadataEditorComponent;

  function createComponent(inputs: Record<string, unknown> = {}): void {
    TestBed.configureTestingModule({
      imports: [ItemMetadataEditorComponent],
    });
    fixture = TestBed.createComponent(ItemMetadataEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('facets', FACETS);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  }

  function setItem(item: Item | undefined): void {
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
  }

  function fillRequired(): void {
    component.metadata.title().value.set('t');
    component.metadata.description().value.set('d');
    component.metadata.facet().value.set('f');
  }

  describe('form sync', () => {
    it('should populate the form fields from the item', () => {
      createComponent();
      setItem(makeItem());
      expect(component.metadata.title().value()).toBe('Item 1');
      expect(component.metadata.sortKey().value()).toBe('sk');
      expect(component.metadata.description().value()).toBe('Desc');
      expect(component.metadata.facet().value()).toBe('facet1');
      expect(component.metadata.group().value()).toBe('g1');
      expect(component.metadata.flags().value()).toBe(0);
      expect(component.metadata().dirty()).toBe(false);
    });

    it('should reset the form when the item becomes undefined', () => {
      createComponent();
      setItem(makeItem());
      component.metadata.title().value.set('x');
      setItem(undefined);
      expect(component.metadata.title().value()).toBe('');
    });

    it('keeps unsaved edits when the item reloads unchanged', () => {
      createComponent();
      setItem(makeItem());
      component.metadata.title().value.set('edited title');
      component.metadata.title().markAsDirty();

      setItem(makeItem());

      expect(component.metadata.title().value()).toBe('edited title');
      expect(component.isDirty()).toBe(true);
    });

    it('rebuilds the draft when the reloaded item has changed metadata', () => {
      createComponent();
      setItem(makeItem());
      component.metadata.title().value.set('edited title');

      setItem(makeItem({ description: 'changed elsewhere' }));

      expect(component.metadata.title().value()).toBe('Item 1');
      expect(component.metadata.description().value()).toBe(
        'changed elsewhere',
      );
    });

    it('rebuilds the draft for another item with the same metadata', () => {
      createComponent();
      setItem(makeItem());
      component.metadata.title().value.set('edited title');

      setItem(makeItem({ id: 'item2' }));

      expect(component.metadata.title().value()).toBe('Item 1');
    });

    it('should keep the draft on the exact echo of its own save', () => {
      createComponent();
      setItem(makeItem());
      component.metadata.title().value.set('Item 1 ');

      // the item comes back with exactly the normalized draft values
      setItem(makeItem());
      expect(component.metadata.title().value()).toBe('Item 1 ');
    });

    it('should rebuild the draft from the item saved by the server', () => {
      createComponent();
      setItem(makeItem());
      component.metadata.title().value.set('  New  ');
      component.metadata.title().markAsDirty();

      // the server computes a new sort key
      setItem(makeItem({ title: 'New', sortKey: 'new-sk' }));

      expect(component.metadata.sortKey().value()).toBe('new-sk');
      expect(component.metadata.title().value()).toBe('New');
      expect(component.metadata().dirty()).toBe(false);
    });
  });

  describe('dirty state', () => {
    it('should emit dirtyChange when the form becomes dirty and when saved', () => {
      createComponent();
      setItem(makeItem());
      const emitted: boolean[] = [];
      component.dirtyChange.subscribe((d) => emitted.push(d));

      component.metadata.title().markAsDirty();
      fixture.detectChanges();
      component.markSaved();
      fixture.detectChanges();

      expect(emitted).toEqual([true, false]);
      expect(component.isDirty()).toBe(false);
    });
  });

  describe('flags', () => {
    it('should exclude admin flags from flagSetFlags for non-admin users', () => {
      createComponent({
        flagDefinitions: [makeFlag(1), makeFlag(2, true)],
        userLevel: 3,
      });
      expect(component.flagSetFlags().map((f) => f.id)).toEqual(['1']);
      expect(component.adminFlagDefs().map((d) => d.id)).toEqual([2]);
    });

    it('should include admin flags for admin users', () => {
      createComponent({
        flagDefinitions: [makeFlag(1), makeFlag(2, true)],
        userLevel: 4,
      });
      expect(
        component
          .flagSetFlags()
          .map((f) => f.id)
          .sort(),
      ).toEqual(['1', '2']);
      expect(component.adminFlagDefs()).toEqual([]);
    });

    it('should compute checkedFlagIds from the flags control bitmask', () => {
      createComponent({
        flagDefinitions: [makeFlag(1), makeFlag(2), makeFlag(4)],
      });
      component.metadata.flags().value.set(1 | 4);
      expect(component.checkedFlagIds().sort()).toEqual(['1', '4']);
      expect(component.checkedFlagDefs().map((d) => d.id)).toEqual([1, 4]);
    });

    it('should set the bitmask directly for admin users', () => {
      createComponent({
        flagDefinitions: [makeFlag(1), makeFlag(2, true)],
        userLevel: 4,
      });
      component.onFlagCheckedIdsChange(['1', '2']);
      expect(component.metadata.flags().value()).toBe(3);
      expect(component.metadata.flags().dirty()).toBe(true);
    });

    it('should preserve existing admin-flag bits for non-admin users', () => {
      createComponent({
        flagDefinitions: [makeFlag(1), makeFlag(2, true)],
        userLevel: 3,
      });
      // admin flag 2 is already set on the item
      component.metadata.flags().value.set(2);
      // non-admin only toggles flag 1 via the UI
      component.onFlagCheckedIdsChange(['1']);
      expect(component.metadata.flags().value()).toBe(3);
    });
  });

  describe('save', () => {
    it('should not require the disabled (server-computed) sort key', () => {
      createComponent();
      fillRequired();
      expect(component.metadata.sortKey().value()).toBe('');
      expect(component.metadata.sortKey().disabled()).toBe(true);
      expect(component.metadata().valid()).toBe(true);
    });

    it('should render the sort key input disabled', () => {
      createComponent();
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('#sortKey');
      expect(input.disabled).toBe(true);
    });

    it('should not emit when the form is invalid', () => {
      createComponent();
      const spy = vi.fn();
      component.saveRequest.subscribe(spy);
      component.save();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when busy', () => {
      createComponent({ busy: true });
      fillRequired();
      const spy = vi.fn();
      component.saveRequest.subscribe(spy);
      component.save();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit the trimmed metadata', () => {
      createComponent();
      setItem(makeItem());
      component.metadata.title().value.set('  New Title  ');
      component.metadata.group().value.set('  g1  ');
      let saved: ItemMetadata | undefined;
      component.saveRequest.subscribe((m) => (saved = m));

      component.save();

      expect(saved).toEqual({
        title: 'New Title',
        sortKey: 'sk',
        description: 'Desc',
        facetId: 'facet1',
        groupId: 'g1',
        flags: 0,
      });
    });

    it('should emit once when the form is submitted', async () => {
      createComponent({ userLevel: 3 });
      setItem(makeItem());
      component.metadata.title().value.set('changed');
      const spy = vi.fn();
      component.saveRequest.subscribe(spy);

      const formEl: HTMLFormElement =
        fixture.nativeElement.querySelector('form');
      const event = new Event('submit', { cancelable: true });
      formEl.dispatchEvent(event);
      await Promise.resolve();
      await Promise.resolve();

      // [formRoot] prevents the native submission (no page reload)
      expect(event.defaultPrevented).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'changed' }),
      );
    });

    it('should not emit and should reveal errors when submitted invalid', async () => {
      createComponent();
      const spy = vi.fn();
      component.saveRequest.subscribe(spy);
      const formEl: HTMLFormElement =
        fixture.nativeElement.querySelector('form');
      formEl.dispatchEvent(new Event('submit', { cancelable: true }));
      await Promise.resolve();

      expect(spy).not.toHaveBeenCalled();
      expect(component.metadata.title().touched()).toBe(true);
    });

    it('should mark the facet select as required', async () => {
      createComponent();
      await fixture.whenStable();
      const select: HTMLElement =
        fixture.nativeElement.querySelector('form mat-select');
      expect(select).toBeTruthy();
      const field = select.closest('mat-form-field')!;
      expect(
        field.querySelector('.mat-mdc-form-field-required-marker'),
      ).toBeTruthy();
    });
  });

  describe('requests', () => {
    it('should show the action buttons only to operators and above', () => {
      createComponent({ userLevel: 1 });
      expect(
        fixture.nativeElement.querySelector('button[type="submit"]'),
      ).toBeNull();
      fixture.componentRef.setInput('userLevel', 2);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('button[type="submit"]'),
      ).toBeTruthy();
    });

    it('should emit generateRequest and set the generated value', () => {
      createComponent({ hasMetadataBuilders: true });
      setItem(makeItem());
      const keys: string[] = [];
      component.generateRequest.subscribe((k) => keys.push(k));

      (
        fixture.nativeElement.querySelector(
          '#generate-title',
        ) as HTMLButtonElement
      ).click();
      component.setGenerated('T', 'Generated');
      component.setGenerated('D', 'Generated description');

      expect(keys).toEqual(['T']);
      expect(component.metadata.title().value()).toBe('Generated');
      expect(component.metadata.description().value()).toBe(
        'Generated description',
      );
      expect(component.isDirty()).toBe(true);
    });

    it('should emit generateItemsRequest', () => {
      createComponent({ userLevel: 3 });
      const spy = vi.fn();
      component.generateItemsRequest.subscribe(spy);
      component.requestGenerateItems();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('readonly', () => {
    beforeEach(() => {
      createComponent({
        readonly: true,
        userLevel: 4,
        hasMetadataBuilders: true,
        flagDefinitions: [makeFlag(1), makeFlag(2)],
      });
      setItem(makeItem({ flags: 2 }));
    });

    it('should disable all the fields', () => {
      expect(component.metadata().disabled()).toBe(true);
      expect(component.metadata.title().disabled()).toBe(true);
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('#title');
      expect(input.disabled).toBe(true);
    });

    it('should hide all the action buttons', () => {
      expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
    });

    it('should list the checked flags without the flag set editor', () => {
      expect(
        fixture.nativeElement.querySelector('cadmus-ui-flag-set'),
      ).toBeNull();
      const flags = fixture.nativeElement.querySelectorAll('.readonly-flag');
      expect(flags.length).toBe(1);
      expect(flags[0].textContent).toContain('flag2');
    });

    it('should never emit any request nor change values', () => {
      const save = vi.fn();
      const gen = vi.fn();
      const genItems = vi.fn();
      component.saveRequest.subscribe(save);
      component.generateRequest.subscribe(gen);
      component.generateItemsRequest.subscribe(genItems);

      component.save();
      component.requestGenerate('T');
      component.requestGenerateItems();
      component.setGenerated('T', 'x');
      component.onFlagCheckedIdsChange(['1']);

      expect(save).not.toHaveBeenCalled();
      expect(gen).not.toHaveBeenCalled();
      expect(genItems).not.toHaveBeenCalled();
      expect(component.metadata.title().value()).toBe('Item 1');
      expect(component.metadata.flags().value()).toBe(2);
    });
  });
});
