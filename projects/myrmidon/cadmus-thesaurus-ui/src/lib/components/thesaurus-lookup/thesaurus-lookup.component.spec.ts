import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ThesaurusLookupComponent } from './thesaurus-lookup.component';

describe('ThesaurusLookupComponent', () => {
  let component: ThesaurusLookupComponent;
  let fixture: ComponentFixture<ThesaurusLookupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThesaurusLookupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ThesaurusLookupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default inputs', () => {
    expect(component).toBeTruthy();
    expect(component.label()).toBe('thesaurus');
    expect(component.limit()).toBe(10);
    expect(component.resetOnPick()).toBe(false);
  });

  describe('resetToInitial (triggered by the initialValue effect)', () => {
    it('should not call lookupFn when there is no lookupFn provided', async () => {
      fixture.componentRef.setInput('initialValue', 'foo');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.form.lookup().value()).toBeNull();
    });

    it('should set the lookup control to the first found entry', async () => {
      const lookupFn = vi.fn().mockReturnValue(of(['found-id']));
      fixture.componentRef.setInput('lookupFn', lookupFn);
      fixture.componentRef.setInput('initialValue', 'foo');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(lookupFn).toHaveBeenCalledWith({ id: 'foo' }, 1);
      expect(component.form.lookup().value()).toBe('found-id');
    });

    it('should set the lookup control to null when nothing is found', async () => {
      const lookupFn = vi.fn().mockReturnValue(of([]));
      fixture.componentRef.setInput('lookupFn', lookupFn);
      fixture.componentRef.setInput('initialValue', 'foo');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.lookup().value()).toBeNull();
    });
  });

  describe('ids$ pipeline', () => {
    it('should pass through a non-string emitted value as a single-item array', async () => {
      const values: string[][] = [];
      component.ids$!.subscribe((v) => values.push(v));

      component.form.lookup().value.set({ some: 'entry' } as any);
      // toObservable emits from an effect, flushed by change detection
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(values.at(-1)).toEqual([{ some: 'entry' }]);
    });

    it('should look up entries for a string value using the configured limit', async () => {
      const lookupFn = vi.fn().mockReturnValue(of(['a', 'b']));
      fixture.componentRef.setInput('lookupFn', lookupFn);
      fixture.componentRef.setInput('limit', 5);

      const values: string[][] = [];
      component.ids$!.subscribe((v) => values.push(v));

      component.form.lookup().value.set('query');
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(lookupFn).toHaveBeenCalledWith({ id: 'query' }, 5);
      expect(values.at(-1)).toEqual(['a', 'b']);
    });
  });

  describe('clear', () => {
    it('should reset the id signal and control, and emit null', () => {
      component.id.set('x');
      const spy = vi.fn();
      component.entryChange.subscribe(spy);

      component.clear();

      expect(component.id()).toBeUndefined();
      expect(component.form.lookup().value()).toBeNull();
      expect(spy).toHaveBeenCalledWith(null);
    });
  });

  describe('pickId', () => {
    it('should set the id signal and emit it', () => {
      const spy = vi.fn();
      component.entryChange.subscribe(spy);
      component.pickId('picked-id');
      expect(component.id()).toBe('picked-id');
      expect(spy).toHaveBeenCalledWith('picked-id');
    });
  });

  describe('signal form', () => {
    it('should reset again when only the lookupFn changes', async () => {
      fixture.componentRef.setInput('initialValue', 'foo');
      fixture.componentRef.setInput('lookupFn', vi.fn().mockReturnValue(of([])));
      fixture.detectChanges();
      await fixture.whenStable();
      const lookupFn = vi.fn().mockReturnValue(of(['x']));
      fixture.componentRef.setInput('lookupFn', lookupFn);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(lookupFn).toHaveBeenCalledWith({ id: 'foo' }, 1);
      expect(component.form.lookup().value()).toBe('x');
    });

    it('should not reset while the user types', async () => {
      fixture.componentRef.setInput('initialValue', 'foo');
      fixture.componentRef.setInput('lookupFn', vi.fn().mockReturnValue(of(['foo'])));
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.lookup().value.set('fo');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.form.lookup().value()).toBe('fo');
    });

    it('should not offer an empty entry for the initial empty value', async () => {
      const values: string[][] = [];
      component.ids$.subscribe((v) => values.push(v));
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(values.every((v) => v.length === 0)).toBe(true);
    });

    it('should not reset when lookupFn changes with no initial value', async () => {
      component.form.lookup().value.set('typed');
      fixture.componentRef.setInput('lookupFn', vi.fn().mockReturnValue(of([])));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.form.lookup().value()).toBe('typed');
    });

    it('renders no <form> element', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
  });

  describe('resetOnPick', () => {
    it('clears the picked ID again when true', () => {
      fixture.componentRef.setInput('resetOnPick', true);
      fixture.detectChanges();
      const events: (string | null)[] = [];
      component.entryChange.subscribe((e) => events.push(e));

      component.pickId('picked-id');

      expect(events).toEqual(['picked-id', null]);
      expect(component.id()).toBeUndefined();
      expect(component.form.lookup().value()).toBeNull();
    });

    it('keeps the picked ID when false (the default)', () => {
      const events: (string | null)[] = [];
      component.entryChange.subscribe((e) => events.push(e));
      component.pickId('picked-id');
      expect(events).toEqual(['picked-id']);
      expect(component.id()).toBe('picked-id');
    });
  });
});
