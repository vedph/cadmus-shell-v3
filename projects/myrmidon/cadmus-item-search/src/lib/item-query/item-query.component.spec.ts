import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { Subject, of } from 'rxjs';

import { ItemQueryComponent } from './item-query.component';
import { AppRepository } from '@myrmidon/cadmus-state';
import { ItemService } from '@myrmidon/cadmus-api';
import { FacetDefinition } from '@myrmidon/cadmus-core';

function makeFacet(overrides?: Partial<FacetDefinition>): FacetDefinition {
  return {
    id: 'facet1',
    label: 'Facet',
    colorKey: 'ff0000',
    description: '',
    partDefinitions: [
      { typeId: 'it.vedph.note', name: 'Note', sortKey: 'b' },
      { typeId: 'it.vedph.date', name: 'Date', sortKey: 'a' },
    ],
    ...overrides,
  };
}

describe('ItemQueryComponent', () => {
  let component: ItemQueryComponent;
  let fixture: ComponentFixture<ItemQueryComponent>;
  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let appRepository: {
    facets$: Subject<FacetDefinition[]>;
    load: ReturnType<typeof vi.fn>;
  };
  let itemService: { getDataPinDefinitions: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    clipboard = { copy: vi.fn() };
    appRepository = { facets$: new Subject(), load: vi.fn().mockResolvedValue(undefined) };
    itemService = { getDataPinDefinitions: vi.fn().mockReturnValue(of([])) };

    await TestBed.configureTestingModule({
      imports: [ItemQueryComponent],
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: AppRepository, useValue: appRepository },
        { provide: ItemService, useValue: itemService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load app data on init', () => {
    expect(component).toBeTruthy();
    expect(appRepository.load).toHaveBeenCalled();
  });

  describe('draft (via the query input)', () => {
    it('should set the query control value from the input', () => {
      fixture.componentRef.setInput('query', 'find me');
      fixture.detectChanges();
      expect(component.form.queryCtl().value()).toBe('find me');
    });

    it('should set the query to empty when query is falsy', () => {
      fixture.componentRef.setInput('query', '');
      fixture.detectChanges();
      expect(component.form.queryCtl().value()).toBe('');
    });
  });

  describe('updatePartDefs (via appRepository.facets$)', () => {
    it('should collect unique part definitions across facets, sorted by sortKey', () => {
      appRepository.facets$.next([makeFacet()]);
      expect(component.partDefs().map((d) => d.typeId)).toEqual([
        'it.vedph.date',
        'it.vedph.note',
      ]);
    });

    it('should deduplicate part definitions with the same effective typeId', () => {
      appRepository.facets$.next([
        makeFacet({ id: 'f1' }),
        makeFacet({ id: 'f2' }),
      ]);
      expect(component.partDefs().length).toBe(2);
    });

    it('should use the roleId as typeId when it looks like a fragment role', () => {
      appRepository.facets$.next([
        makeFacet({
          partDefinitions: [
            {
              typeId: 'it.vedph.token-text-layer',
              roleId: 'fr.it.vedph.comment',
              name: 'Comment layer',
              sortKey: 'a',
            },
          ],
        }),
      ]);
      expect(component.partDefs()[0].typeId).toBe('fr.it.vedph.comment');
    });

    it('should reset pinDefs when facets change', () => {
      component.pinDefs.set([{ name: 'x', type: 0 }]);
      appRepository.facets$.next([makeFacet()]);
      expect(component.pinDefs()).toEqual([]);
    });
  });

  describe('partDef selection loads pin definitions', () => {
    it('should fetch pin definitions for the selected part def', async () => {
      const defs = [{ name: 'color', type: 0 }];
      itemService.getDataPinDefinitions.mockReturnValue(of(defs));
      component.form.partDef().value.set('it.vedph.note');
      // toObservable emits from an effect, flushed by change detection
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(itemService.getDataPinDefinitions).toHaveBeenCalledWith(
        'it.vedph.note'
      );
      expect(component.pinDefs()).toEqual(defs);
      expect(component.loadingPinDefs()).toBe(false);
    });
  });

  describe('setQuery', () => {
    it('should do nothing for a falsy query', () => {
      component.form.queryCtl().value.set('kept');
      component.setQuery(null);
      expect(component.form.queryCtl().value()).toBe('kept');
    });

    it('should set the query control value', () => {
      component.setQuery('new query');
      expect(component.form.queryCtl().value()).toBe('new query');
    });
  });

  describe('submitQuery', () => {
    it('should not emit when the form is invalid', () => {
      const spy = vi.fn();
      component.querySubmit.subscribe(spy);
      component.form.queryCtl().value.set(''); // required -> invalid
      component.submitQuery();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit the query value when valid', () => {
      const spy = vi.fn();
      component.querySubmit.subscribe(spy);
      component.form.queryCtl().value.set('find this');
      component.submitQuery();
      expect(spy).toHaveBeenCalledWith('find this');
    });
  });

  describe('pinTypeIdToString', () => {
    it('should map known IDs to their names', () => {
      expect(component.pinTypeIdToString(1)).toBe('boolean');
      expect(component.pinTypeIdToString(2)).toBe('integer');
      expect(component.pinTypeIdToString(3)).toBe('decimal');
    });

    it('should default to "string" for unknown IDs', () => {
      expect(component.pinTypeIdToString(0)).toBe('string');
      expect(component.pinTypeIdToString(99)).toBe('string');
    });
  });

  describe('copyToClipboard', () => {
    it('should delegate to the Clipboard service', () => {
      component.copyToClipboard('hello');
      expect(clipboard.copy).toHaveBeenCalledWith('hello');
    });
  });

  describe('signal form', () => {
    it('should not fetch pin definitions for the initial empty part def', async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(itemService.getDataPinDefinitions).not.toHaveBeenCalled();
    });

    it('should keep history and part def when the query input changes', () => {
      component.form.history().value.set('old');
      component.form.partDef().value.set('it.vedph.note');
      fixture.componentRef.setInput('query', 'q2');
      fixture.detectChanges();
      expect(component.form.queryCtl().value()).toBe('q2');
      expect(component.form.history().value()).toBe('old');
      expect(component.form.partDef().value()).toBe('it.vedph.note');
    });

    it('clearQuery should empty the query', () => {
      component.form.queryCtl().value.set('x');
      component.clearQuery();
      expect(component.form.queryCtl().value()).toBe('');
      expect(component.form().invalid()).toBe(true);
    });

    it('renders no <form>; the search button submits via click', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const spy = vi.fn();
      component.querySubmit.subscribe(spy);
      const textarea: HTMLTextAreaElement =
        fixture.nativeElement.querySelector('textarea');
      textarea.value = 'typed';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const button: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Search items"]'
      );
      expect(button.type).toBe('button');
      button.click();
      expect(spy).toHaveBeenCalledWith('typed');
    });

    it('submits on Enter in the query textarea', () => {
      const spy = vi.fn();
      component.querySubmit.subscribe(spy);
      component.form.queryCtl().value.set('q');
      fixture.detectChanges();
      const textarea: HTMLTextAreaElement =
        fixture.nativeElement.querySelector('textarea');
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        cancelable: true,
      });
      textarea.dispatchEvent(event);
      expect(spy).toHaveBeenCalledWith('q');
      // no newline is inserted
      expect(event.defaultPrevented).toBe(true);
    });
  });
});
