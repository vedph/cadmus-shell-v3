import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ThesaurusFilterComponent } from './thesaurus-filter.component';
import { ThesaurusListRepository } from '../state/thesaurus-list.repository';
import { ThesaurusFilter } from '@myrmidon/cadmus-core';

describe('ThesaurusFilterComponent', () => {
  let component: ThesaurusFilterComponent;
  let fixture: ComponentFixture<ThesaurusFilterComponent>;
  let filter$: Subject<ThesaurusFilter>;
  let repository: { filter$: Subject<ThesaurusFilter>; setFilter: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    filter$ = new Subject<ThesaurusFilter>();
    repository = { filter$, setFilter: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ThesaurusFilterComponent],
      providers: [{ provide: ThesaurusListRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(ThesaurusFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default form values', () => {
    expect(component).toBeTruthy();
    expect(component.id.value).toBe('');
    expect(component.alias.value).toBe(false);
    expect(component.language.value).toBe('en');
  });

  describe('updateForm (via filter$)', () => {
    it('should populate the form from the repository filter', () => {
      filter$.next({ id: 'red', isAlias: true, language: 'it' });
      expect(component.id.value).toBe('red');
      expect(component.alias.value).toBe(true);
      expect(component.language.value).toBe('it');
      expect(component.form.pristine).toBe(true);
    });

    it('should default missing fields', () => {
      filter$.next({});
      expect(component.id.value).toBe('');
      expect(component.alias.value).toBe(false);
      expect(component.language.value).toBe('en');
    });
  });

  describe('apply', () => {
    it('should not call setFilter when the form is invalid', () => {
      component.form.setErrors({ invalid: true });
      component.apply();
      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('should build the filter from the form and call setFilter', () => {
      component.id.setValue('blue');
      component.alias.setValue(true);
      component.language.setValue('fr');

      component.apply();

      expect(repository.setFilter).toHaveBeenCalledWith({
        id: 'blue',
        isAlias: true,
        language: 'fr',
      });
    });
  });

  describe('reset', () => {
    it('should reset the form to its initial values and apply', () => {
      component.id.setValue('blue');
      component.alias.setValue(true);

      component.reset();

      expect(component.id.value).toBe('');
      expect(component.alias.value).toBe(false);
      expect(component.language.value).toBe('en');
      expect(repository.setFilter).toHaveBeenCalledWith({
        id: '',
        isAlias: false,
        language: 'en',
      });
    });
  });
});
