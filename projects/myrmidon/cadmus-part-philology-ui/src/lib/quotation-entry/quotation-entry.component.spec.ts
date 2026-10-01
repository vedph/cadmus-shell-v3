import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { QuotationEntryComponent } from './quotation-entry.component';
import { QuotationEntry } from '../quotations-fragment';
import { QuotationWorksService } from '../quotations-fragment/quotation-works.service';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

describe('QuotationEntryComponent', () => {
  let component: QuotationEntryComponent;
  let fixture: ComponentFixture<QuotationEntryComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  const ENTRY: QuotationEntry = {
    author: 'Verg',
    work: 'ecl',
    citation: '1.1',
    citationUri: 'http://example.com',
    variant: 'a variant',
    tag: 'poetry',
    note: 'a note',
  };

  // works thesaurus entries: id = "author.work.", 2-level dotted ids
  const WORK_ENTRIES: ThesaurusEntry[] = [
    { id: 'Verg.', value: 'Vergilius' },
    { id: 'Verg.ecl.', value: 'Eclogae' },
    { id: 'Verg.aen.', value: 'Aeneis' },
    { id: 'Ov.', value: 'Ovidius' },
  ];

  beforeEach(async () => {
    dialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [QuotationEntryComponent],
      providers: [{ provide: DialogService, useValue: dialogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotationEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region form validity
  it('should build an initially invalid form (required fields empty)', () => {
    expect(component.form().invalid()).toBe(true);
    expect(!!component.form.author().getError('required')).toBe(true);
    expect(!!component.form.work().getError('required')).toBe(true);
    expect(!!component.form.citation().getError('required')).toBe(true);
  });

  it('should become valid once the required fields are filled', () => {
    component.form.author().value.set('Verg');
    component.form.work().value.set('ecl');
    component.form.citation().value.set('1.1');
    expect(component.form().valid()).toBe(true);
  });

  it('should flag maxlength errors on overlong values (built-in Validators.maxLength key)', () => {
    component.form.author().value.set('a'.repeat(51));
    component.form.work().value.set('a'.repeat(101));
    component.form.citation().value.set('a'.repeat(51));
    component.form.citationUri().value.set('a'.repeat(201));
    component.form.variant().value.set('a'.repeat(1001));
    component.form.tag().value.set('a'.repeat(51));
    component.form.note().value.set('a'.repeat(1001));

    expect(!!component.form.author().getError('maxLength')).toBe(true);
    expect(!!component.form.work().getError('maxLength')).toBe(true);
    expect(!!component.form.citation().getError('maxLength')).toBe(true);
    expect(!!component.form.citationUri().getError('maxLength')).toBe(true);
    expect(!!component.form.variant().getError('maxLength')).toBe(true);
    expect(!!component.form.tag().getError('maxLength')).toBe(true);
    expect(!!component.form.note().getError('maxLength')).toBe(true);
  });
  //#endregion

  //#region updateForm (entry model)
  it('should populate the form from the entry model and mark it pristine', () => {
    fixture.componentRef.setInput('entry', ENTRY);
    fixture.detectChanges();

    expect(plain(component.form.author().value())).toBe('Verg');
    expect(plain(component.form.work().value())).toBe('ecl');
    expect(plain(component.form.citation().value())).toBe('1.1');
    expect(plain(component.form.citationUri().value())).toBe('http://example.com');
    expect(plain(component.form.variant().value())).toBe('a variant');
    expect(plain(component.form.tag().value())).toBe('poetry');
    expect(plain(component.form.note().value())).toBe('a note');
    expect(component.form().dirty()).toBe(false);
  });

  it('should default optional fields to null when absent from the entry', () => {
    fixture.componentRef.setInput('entry', {
      author: 'Verg',
      work: 'ecl',
      citation: '1.1',
    } as QuotationEntry);
    fixture.detectChanges();

    expect(component.form.citationUri().value()).toBe('');
    expect(component.form.variant().value()).toBe('');
    expect(component.form.tag().value()).toBe('');
    expect(component.form.note().value()).toBe('');
  });

  it('should reset the form when the entry becomes undefined', () => {
    // must first set a real value: a signal input starting at undefined and
    // then set to undefined again is a no-op that would not re-trigger the
    // effect watching it
    fixture.componentRef.setInput('entry', ENTRY);
    fixture.detectChanges();
    expect(plain(component.form.author().value())).toBe('Verg');

    fixture.componentRef.setInput('entry', undefined);
    fixture.detectChanges();

    expect(component.form.author().value()).toBe('');
    expect(component.form.work().value()).toBe('');
    expect(component.form.citation().value()).toBe('');
  });
  //#endregion

  //#region author/work thesauri wiring
  it('should list all authors from workDictionary in authors', () => {
    const worksService = TestBed.inject(QuotationWorksService);
    const dict = worksService.buildDictionary(WORK_ENTRIES);

    fixture.componentRef.setInput('workDictionary', dict);
    fixture.detectChanges();

    // BehaviorSubject: .value reflects the latest emission synchronously
    expect(component.authors()).toEqual([
      { id: 'Verg', value: 'Vergilius' },
      { id: 'Ov', value: 'Ovidius' },
    ]);
  });

  it('should populate authorWorks with the works of the currently set author once workDictionary is set', () => {
    const worksService = TestBed.inject(QuotationWorksService);
    const dict = worksService.buildDictionary(WORK_ENTRIES);

    // set the author control first, then provide the dictionary: per
    // updateAuthorWorks, if an author is already set, its works are loaded
    component.form.author().value.set('Verg');
    fixture.componentRef.setInput('workDictionary', dict);
    fixture.detectChanges();

    expect(component.authorWorks()).toEqual([
      { id: 'Verg.ecl.', value: 'Eclogae' },
      { id: 'Verg.aen.', value: 'Aeneis' },
    ]);
  });

  it('should update authorWorks when the author control changes, once workDictionary is set', () => {
    const worksService = TestBed.inject(QuotationWorksService);
    const dict = worksService.buildDictionary(WORK_ENTRIES);

    fixture.componentRef.setInput('workDictionary', dict);
    fixture.detectChanges();

    expect(component.authorWorks()).toEqual([]);

    component.form.author().value.set('Ov');
    expect(component.authorWorks()).toEqual([]); // Ov. alone has no works besides itself

    component.form.author().value.set('Verg');
    expect(component.authorWorks()).toEqual([
      { id: 'Verg.ecl.', value: 'Eclogae' },
      { id: 'Verg.aen.', value: 'Aeneis' },
    ]);
  });

  it('should not attempt to load author works when no workDictionary has been provided', () => {
    // no workDictionary set: _workDct stays undefined
    expect(() => component.form.author().value.set('Verg')).not.toThrow();
    expect(component.authorWorks()).toEqual([]);
  });
  //#endregion

  //#region cancel
  it('cancel should emit editorClose immediately when the form is pristine', () => {
    const spy = vi.fn();
    component.editorClose.subscribe(spy);

    component.cancel();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(dialogService.confirm).not.toHaveBeenCalled();
  });

  it('cancel should confirm before closing when the form is dirty, and close if confirmed', () => {
    // setValue() alone does not dirty a control (only real user interaction
    // via the form directives does); mark it explicitly to simulate that
    component.form.author().value.set('changed');
    component.form.author().markAsDirty();
    const spy = vi.fn();
    component.editorClose.subscribe(spy);
    dialogService.confirm.mockReturnValue(of(true));

    component.cancel();

    expect(dialogService.confirm).toHaveBeenCalledWith(
      'Confirm Close',
      'Drop entry changes?',
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cancel should not close when the user declines the confirmation', () => {
    component.form.author().value.set('changed');
    component.form.author().markAsDirty();
    const spy = vi.fn();
    component.editorClose.subscribe(spy);
    dialogService.confirm.mockReturnValue(of(false));

    component.cancel();

    expect(spy).not.toHaveBeenCalled();
  });
  //#endregion

  //#region save / getEntry
  it('save should do nothing when the form is invalid', () => {
    const before = component.entry();

    component.save();

    expect(component.entry()).toBe(before);
  });

  it('save should set the entry model with trimmed field values', () => {
    component.form.author().value.set('  Verg  ');
    component.form.work().value.set('  ecl  ');
    component.form.citation().value.set('  1.1  ');
    component.form.citationUri().value.set('  http://x  ');
    component.form.variant().value.set('  var  ');
    component.form.tag().value.set('  tag  ');
    component.form.note().value.set('  note  ');

    component.save();

    expect(component.entry()).toEqual({
      author: 'Verg',
      work: 'ecl',
      citation: '1.1',
      citationUri: 'http://x',
      variant: 'var',
      tag: 'tag',
      note: 'note',
    });
  });

  it('save should build empty strings for required fields and undefined for optional fields when the controls are null', () => {
    component.form.author().value.set('a');
    component.form.work().value.set('b');
    component.form.citation().value.set('c');
    // optional fields left null (their default)

    component.save();

    const saved = component.entry()!;
    expect(saved.citationUri).toBeUndefined();
    expect(saved.variant).toBeUndefined();
    expect(saved.tag).toBeUndefined();
    expect(saved.note).toBeUndefined();
  });
  //#endregion

  it('should render no <form> of its own, and no submit buttons', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector(':scope > form')).toBeNull();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);
  });

  it('should keep the dirty state of a user edit across change detection', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[type="text"]',
    );
    input.value = input.value + 'x';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.detectChanges();
    expect(component.form().dirty()).toBe(true);
  });
});
