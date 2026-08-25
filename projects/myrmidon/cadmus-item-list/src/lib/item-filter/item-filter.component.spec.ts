import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subject } from 'rxjs';

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
  let appRepository: { load: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    filter$ = new Subject<ItemFilter>();
    repository = { filter$, setFilter: vi.fn() };
    appRepository = { load: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [ItemFilterComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: ItemListRepository, useValue: repository },
        { provide: UserRefLookupService, useValue: {} },
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

  describe('updateForm (via filter$)', () => {
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

      expect(component.title.value).toBe('t');
      expect(component.description.value).toBe('d');
      expect(component.facet.value).toBe('f1');
      expect(component.group.value).toBe('g1');
      expect(component.flags.value).toEqual([1, 4]);
      expect(component.flagMatching.value).toBe(FlagMatching.bitsAllSet);
      expect(component.form.pristine).toBe(true);
    });

    it('should default missing fields to null/none', () => {
      filter$.next({});
      expect(component.title.value).toBeNull();
      expect(component.flags.value).toEqual([]);
      expect(component.flagMatching.value).toBe(FlagMatching.none);
    });
  });

  describe('onUserChange', () => {
    it('should set the user control and currentUser signal when a user is picked', () => {
      const userInfo = { userName: 'bob', firstName: 'B', lastName: 'O' };
      component.onUserChange({ user: userInfo });
      expect(component.user.value).toBe('bob');
      expect(component.currentUser()).toEqual(userInfo);
    });

    it('should clear the user control when nothing is picked', () => {
      component.onUserChange({ user: { userName: 'bob' } });
      component.onUserChange(undefined);
      expect(component.user.value).toBeNull();
      expect(component.currentUser()).toBeUndefined();
    });
  });

  describe('apply', () => {
    it('should not call setFilter when the form is invalid', () => {
      component.form.setErrors({ invalid: true });
      component.apply();
      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('should build the filter from the form and call setFilter', () => {
      component.title.setValue('hello');
      component.flags.setValue([1, 2]);
      component.user.setValue('bob');

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
      component.title.setValue('');
      component.apply();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ title: undefined })
      );
    });
  });

  describe('reset', () => {
    it('should reset the form, clear currentUser, and apply', () => {
      component.title.setValue('hello');
      component.onUserChange({ user: { userName: 'bob' } });

      component.reset();

      expect(component.title.value).toBeNull();
      expect(component.currentUser()).toBeUndefined();
      expect(repository.setFilter).toHaveBeenCalled();
    });
  });

  it('should unsubscribe from filter$ on destroy', () => {
    const titleControl = component.title;
    fixture.destroy();
    filter$.next({ title: 'after-destroy' });
    // ngOnDestroy unsubscribed, so the control must be unaffected
    expect(titleControl.value).not.toBe('after-destroy');
  });
});
