import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { of, Subject } from 'rxjs';

import { ItemFilterComponent } from './item-filter.component';
import { ItemListRepository } from '../state/item-list.repository';
import { UserRefLookupService } from '@myrmidon/cadmus-ui';
import { AppRepository } from '@myrmidon/cadmus-state';
import { FlagMatching, ItemFilter } from '@myrmidon/cadmus-core';

describe('ItemFilterComponent', () => {
  let component: ItemFilterComponent;
  let fixture: ComponentFixture<ItemFilterComponent>;
  let filter$: Subject<ItemFilter>;
  let repository: { filter$: Subject<ItemFilter>; setFilter: ReturnType<typeof vi.fn> };
  let appRepository: {
    load: ReturnType<typeof vi.fn>;
    facets$?: unknown;
    flags$?: unknown;
  };

  beforeEach(async () => {
    filter$ = new Subject<ItemFilter>();
    repository = { filter$, setFilter: vi.fn() };
    appRepository = { load: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [ItemFilterComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: ItemListRepository, useValue: repository },
        {
          provide: UserRefLookupService,
          // like the real service: the lookup displays items with it
          useValue: { getName: (item: any) => item?.user?.userName },
        },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load app data', () => {
    expect(component).toBeTruthy();
    expect(appRepository.load).toHaveBeenCalled();
  });

  describe('draft (via filter$)', () => {
    it('should populate the form controls from the repository filter', () => {
      filter$.next({
        title: 't',
        description: 'd',
        facetId: 'f1',
        groupId: 'g1',
        flags: 1 | 4,
        flagMatching: FlagMatching.bitsAllSet,
        minModified: new Date(2024, 0, 1),
        maxModified: new Date(2024, 0, 2),
      });

      expect(component.form.title().value()).toBe('t');
      expect(component.form.description().value()).toBe('d');
      expect(component.form.facet().value()).toBe('f1');
      expect(component.form.group().value()).toBe('g1');
      expect(component.form.flags().value()).toEqual([1, 4]);
      expect(component.form.flagMatching().value()).toBe(FlagMatching.bitsAllSet);
      expect(component.form().dirty()).toBe(false);
    });

    it('should default missing fields to empty/none', () => {
      filter$.next({});
      expect(component.form.title().value()).toBe('');
      expect(component.form.flags().value()).toEqual([]);
      expect(component.form.flagMatching().value()).toBe(FlagMatching.none);
    });
  });

  describe('onUserChange', () => {
    it('should set the user control and currentUser signal when a user is picked', () => {
      // as emitted by the lookup: the service's own item shape
      const picked = {
        user: { userName: 'bob', firstName: 'B', lastName: 'O' },
        roles: [],
      };
      component.onUserChange(picked);
      expect(component.form.user().value()).toBe('bob');
      expect(component.currentUser()).toBe(picked);
    });

    it('should clear the user control when nothing is picked', () => {
      component.onUserChange({ user: { userName: 'bob' } });
      component.onUserChange(undefined);
      expect(component.form.user().value()).toBeNull();
      expect(component.currentUser()).toBeUndefined();
    });
  });

  describe('apply', () => {
    it('should not call setFilter when the form is invalid', () => {
      component.form.title().value.set('a'.repeat(501));
      component.apply();
      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('should build the filter from the form and call setFilter', () => {
      component.form.title().value.set('hello');
      component.form.flags().value.set([1, 2]);
      component.form.user().value.set('bob');

      component.apply();

      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'hello',
          flags: 3,
          userId: 'bob',
        })
      );
    });

    it('should map empty string values to undefined in the filter', () => {
      component.form.title().value.set('');
      component.apply();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ title: undefined })
      );
    });
  });

  describe('reset', () => {
    it('should reset the form, clear currentUser, and apply', () => {
      component.form.title().value.set('hello');
      component.onUserChange({ user: { userName: 'bob' } });

      component.reset();

      expect(component.form.title().value()).toBe('');
      expect(component.currentUser()).toBeUndefined();
      expect(repository.setFilter).toHaveBeenCalled();
    });
  });

  it('should unsubscribe from filter$ on destroy', () => {
    const title = component.form.title;
    fixture.destroy();
    filter$.next({ title: 'after-destroy' });
    // toSignal unsubscribed on destroy, so the field must be unaffected
    expect(title().value()).not.toBe('after-destroy');
  });

  it('should keep the picked user when the filter is re-synced', () => {
    component.onUserChange({ user: { userName: 'bob' } });
    filter$.next({ title: 'new' });
    expect(component.form.title().value()).toBe('new');
    expect(component.form.user().value()).toBe('bob');
  });

  it('should send undefined flags after reset, and 0 after a re-sync', () => {
    component.reset();
    expect(repository.setFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({ flags: undefined, flagMatching: FlagMatching.none })
    );
    filter$.next({});
    component.apply();
    expect(repository.setFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({ flags: 0 })
    );
  });

  describe('template', () => {
    it('renders no <form> element; apply is a type=button click', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const apply: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Apply filters"]'
      );
      expect(apply.type).toBe('button');
      component.form.title().value.set('x');
      fixture.detectChanges();
      apply.click();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'x' })
      );
    });

    it('applies when Enter is pressed in a text input', () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input[matinput]');
      expect(input.maxLength).toBe(500);
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'typed' })
      );
    });
  });

  describe('flag matching select', () => {
    it('shows the current numeric value and yields numbers', async () => {
      appRepository.facets$ = of([]);
      appRepository.flags$ = of([{ id: 1, label: 'f1', colorKey: 'ff0000' }]);
      fixture = TestBed.createComponent(ItemFilterComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const loader = TestbedHarnessEnvironment.loader(fixture);
      const selects = await loader.getAllHarnesses(MatSelectHarness);
      // facet, flag matching
      const matching = selects[1];
      expect(await matching.getValueText()).toBe('(flags ignored)');

      await matching.open();
      await matching.clickOptions({ text: 'any set' });
      expect(component.form.flagMatching().value()).toBe(FlagMatching.bitsAnySet);
      component.apply();
      expect(repository.setFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({ flagMatching: 1 })
      );
    });
  });

  describe('user lookup', () => {
    it('displays the picked user and filters by it', () => {
      appRepository.facets$ = of([]);
      appRepository.flags$ = of([]);
      fixture = TestBed.createComponent(ItemFilterComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      const lookupEl = fixture.debugElement.query(By.directive(RefLookupComponent));
      const lookup = lookupEl.componentInstance as RefLookupComponent;
      const picked = {
        user: { id: 'u1', userName: 'zeus', firstName: 'Z', lastName: 'Z', email: 'z@x.org' },
        roles: ['admin'],
      };

      // what the lookup does when an option is clicked
      lookup.pickItem(picked);
      fixture.detectChanges();

      // the lookup keeps the picked item, and shows its name
      expect(lookup.item()).toBe(picked);
      expect(lookupEl.nativeElement.querySelector('button').textContent.trim()).toBe('zeus');
      component.apply();
      expect(repository.setFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({ userId: 'zeus' })
      );
    });
  });
});
