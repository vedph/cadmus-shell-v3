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
    expect(component.form.id().value()).toBe('');
    // (any)
    expect(component.form.alias().value()).toBeNull();
    expect(component.form.language().value()).toBe('en');
  });

  describe('updateForm (via filter$)', () => {
    it('should populate the form from the repository filter', () => {
      filter$.next({ id: 'red', isAlias: true, language: 'it' });
      expect(component.form.id().value()).toBe('red');
      expect(component.form.alias().value()).toBe(true);
      expect(component.form.language().value()).toBe('it');
      expect(component.form().dirty()).toBe(false);
    });

    it('should default missing fields', () => {
      filter$.next({});
      expect(component.form.id().value()).toBe('');
      expect(component.form.alias().value()).toBeNull();
      expect(component.form.language().value()).toBe('en');
    });
  });

  describe('apply', () => {
    it('should not call setFilter when the form is invalid', () => {
      component.form.id().value.set('a'.repeat(101));
      component.apply();
      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('should build the filter from the form and call setFilter', () => {
      component.form.id().value.set('blue');
      component.form.alias().value.set(true);
      component.form.language().value.set('fr');

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
      component.form.id().value.set('blue');
      component.form.alias().value.set(true);

      component.reset();

      expect(component.form.id().value()).toBe('');
      expect(component.form.alias().value()).toBeNull();
      expect(component.form.language().value()).toBe('en');
      expect(repository.setFilter).toHaveBeenCalledWith({
        id: '',
        isAlias: undefined,
        language: 'en',
      });
    });
  });

  describe('template', () => {
    it('renders no <form>; apply on click and on Enter', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const apply: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Apply filters"]'
      );
      expect(apply.type).toBe('button');
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input[matinput]');
      expect(input.maxLength).toBe(100);
      input.value = 'blue';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'blue' })
      );
    });
  });

  describe('alias values', () => {
    it('sends "(any)" as undefined and "not an alias" as false', () => {
      component.form.alias().value.set(null);
      component.apply();
      expect(repository.setFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({ isAlias: undefined })
      );
      component.form.alias().value.set(false);
      component.apply();
      expect(repository.setFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({ isAlias: false })
      );
    });

    it('shows a bound isAlias false as "not an alias"', () => {
      filter$.next({ isAlias: false });
      expect(component.form.alias().value()).toBe(false);
    });
  });
});
