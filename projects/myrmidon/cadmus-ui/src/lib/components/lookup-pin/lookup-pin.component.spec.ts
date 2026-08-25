import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LookupPinComponent } from './lookup-pin.component';
import { ItemService } from '@myrmidon/cadmus-api';
import { DataPinInfo, IndexLookupDefinitions } from '@myrmidon/cadmus-core';

function makePin(overrides?: Partial<DataPinInfo>): DataPinInfo {
  return {
    itemId: 'item1',
    partId: 'part1',
    roleId: null,
    partTypeId: 'it.vedph.note',
    name: 'color',
    value: 'green',
    ...overrides,
  };
}

const lookupDefs: IndexLookupDefinitions = {
  colors: { typeId: 'it.vedph.note', name: 'color' },
  scoped: { typeId: 'it.vedph.note', roleId: 'scholarly', name: 'color' },
};

describe('LookupPinComponent', () => {
  let component: LookupPinComponent;
  let fixture: ComponentFixture<LookupPinComponent>;
  let itemService: { searchPins: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    itemService = { searchPins: vi.fn().mockReturnValue(of({ value: { items: [] } })) };

    await TestBed.configureTestingModule({
      imports: [LookupPinComponent],
      providers: [
        { provide: ItemService, useValue: itemService },
        { provide: 'indexLookupDefinitions', useValue: lookupDefs },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LookupPinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resetToInitial (triggered by the initialValue effect)', () => {
    it('should not call the search service when there is no filter text', async () => {
      itemService.searchPins.mockClear();
      fixture.componentRef.setInput('lookupKey', 'colors');
      await fixture.whenStable();
      expect(itemService.searchPins).not.toHaveBeenCalled();
    });

    it('should search using the type/role/name from the matching lookup definition', async () => {
      fixture.componentRef.setInput('lookupKey', 'scoped');
      fixture.componentRef.setInput('initialValue', 'green');
      await fixture.whenStable();

      expect(itemService.searchPins).toHaveBeenCalledWith(
        '[partTypeId=it.vedph.note] AND [roleId=scholarly] AND [name=color] AND [value^=green]',
        1,
        1
      );
    });

    it('should omit the roleId clause when the definition has none', async () => {
      fixture.componentRef.setInput('lookupKey', 'colors');
      fixture.componentRef.setInput('initialValue', 'green');
      await fixture.whenStable();

      expect(itemService.searchPins).toHaveBeenCalledWith(
        '[partTypeId=it.vedph.note] AND [name=color] AND [value^=green]',
        1,
        1
      );
    });

    it('should return no entries when the lookupKey has no matching definition', async () => {
      itemService.searchPins.mockClear();
      fixture.componentRef.setInput('lookupKey', 'missing');
      fixture.componentRef.setInput('initialValue', 'green');
      await fixture.whenStable();

      expect(itemService.searchPins).not.toHaveBeenCalled();
      expect(component.lookup.value).toBeUndefined();
    });

    it('should set the lookup control to the first found entry', async () => {
      const pin = makePin();
      itemService.searchPins.mockReturnValue(of({ value: { items: [pin] } }));
      fixture.componentRef.setInput('lookupKey', 'colors');
      fixture.componentRef.setInput('initialValue', 'green');
      await fixture.whenStable();

      expect(component.lookup.value).toEqual(pin);
    });

    it('should treat a wrapper error result as no entries found', async () => {
      itemService.searchPins.mockReturnValue(of({ error: 'boom' }));
      fixture.componentRef.setInput('lookupKey', 'colors');
      fixture.componentRef.setInput('initialValue', 'green');
      await fixture.whenStable();

      expect(component.lookup.value).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should reset the entry signal and the control, and emit null', () => {
      const spy = vi.fn();
      component.entryChange.subscribe(spy);
      component.entry.set(makePin());
      component.lookup.setValue(makePin());

      component.clear();

      expect(component.entry()).toBeUndefined();
      expect(component.lookup.value).toBeNull();
      expect(spy).toHaveBeenCalledWith(null);
    });
  });

  describe('pickEntry', () => {
    it('should set the entry and emit it', () => {
      const spy = vi.fn();
      component.entryChange.subscribe(spy);
      const pin = makePin();

      component.pickEntry(pin);

      expect(component.entry()).toEqual(pin);
      expect(spy).toHaveBeenCalledWith(pin);
    });

    it('should clear the picked value again when resetOnPick is true', () => {
      fixture.componentRef.setInput('resetOnPick', true);
      fixture.detectChanges();
      const events: (DataPinInfo | null)[] = [];
      component.entryChange.subscribe((e) => events.push(e));

      component.pickEntry(makePin());

      expect(events.length).toBe(2);
      expect(events[1]).toBeNull();
      expect(component.entry()).toBeUndefined();
    });

    it('should not auto-clear when resetOnPick is false', () => {
      const events: (DataPinInfo | null)[] = [];
      component.entryChange.subscribe((e) => events.push(e));

      component.pickEntry(makePin());

      expect(events.length).toBe(1);
    });
  });

  describe('entryToName', () => {
    it('should return the entry value', () => {
      expect(component.entryToName(makePin({ value: 'blue' }))).toBe('blue');
    });
  });

  describe('ngOnInit entries$ pipeline', () => {
    it('should pass through a non-string value emitted on the lookup control', async () => {
      const pin = makePin();
      const values: DataPinInfo[][] = [];
      component.entries$!.subscribe((v) => values.push(v));

      component.lookup.setValue(pin);
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(values.at(-1)).toEqual([pin]);
    });
  });
});
