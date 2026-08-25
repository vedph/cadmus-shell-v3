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
      await fixture.whenStable();
      expect(component.lookup.value).toBeUndefined();
    });

    it('should set the lookup control to the first found entry', async () => {
      const lookupFn = vi.fn().mockReturnValue(of(['found-id']));
      fixture.componentRef.setInput('lookupFn', lookupFn);
      fixture.componentRef.setInput('initialValue', 'foo');
      await fixture.whenStable();

      expect(lookupFn).toHaveBeenCalledWith({ id: 'foo' }, 1);
      expect(component.lookup.value).toBe('found-id');
    });

    it('should set the lookup control to undefined when nothing is found', async () => {
      const lookupFn = vi.fn().mockReturnValue(of([]));
      fixture.componentRef.setInput('lookupFn', lookupFn);
      fixture.componentRef.setInput('initialValue', 'foo');
      await fixture.whenStable();

      expect(component.lookup.value).toBeUndefined();
    });
  });

  describe('ids$ pipeline', () => {
    it('should pass through a non-string emitted value as a single-item array', async () => {
      const values: string[][] = [];
      component.ids$!.subscribe((v) => values.push(v));

      component.lookup.setValue({ some: 'entry' } as any);
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(values.at(-1)).toEqual([{ some: 'entry' }]);
    });

    it('should look up entries for a string value using the configured limit', async () => {
      const lookupFn = vi.fn().mockReturnValue(of(['a', 'b']));
      fixture.componentRef.setInput('lookupFn', lookupFn);
      fixture.componentRef.setInput('limit', 5);

      const values: string[][] = [];
      component.ids$!.subscribe((v) => values.push(v));

      component.lookup.setValue('query');
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
      expect(component.lookup.value).toBeNull();
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
});
