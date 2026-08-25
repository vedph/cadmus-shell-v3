import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { QuotationEntryComponent } from './quotation-entry.component';
import { QuotationEntry } from '../quotations-fragment';
import { QuotationWorksService } from '../quotations-fragment/quotation-works.service';

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
      imports: [FormsModule, ReactiveFormsModule, QuotationEntryComponent],
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
    expect(component.form.invalid).toBe(true);
    expect(component.author.hasError('required')).toBe(true);
    expect(component.work.hasError('required')).toBe(true);
    expect(component.citation.hasError('required')).toBe(true);
  });

  it('should become valid once the required fields are filled', () => {
    component.author.setValue('Verg');
    component.work.setValue('ecl');
    component.citation.setValue('1.1');
    expect(component.form.valid).toBe(true);
  });

  it('should flag maxlength errors on overlong values (built-in Validators.maxLength key)', () => {
    component.author.setValue('a'.repeat(51));
    component.work.setValue('a'.repeat(101));
    component.citation.setValue('a'.repeat(51));
    component.citationUri.setValue('a'.repeat(201));
    component.variant.setValue('a'.repeat(1001));
    component.tag.setValue('a'.repeat(51));
    component.note.setValue('a'.repeat(1001));

    expect(component.author.hasError('maxlength')).toBe(true);
    expect(component.work.hasError('maxlength')).toBe(true);
    expect(component.citation.hasError('maxlength')).toBe(true);
    expect(component.citationUri.hasError('maxlength')).toBe(true);
    expect(component.variant.hasError('maxlength')).toBe(true);
    expect(component.tag.hasError('maxlength')).toBe(true);
    expect(component.note.hasError('maxlength')).toBe(true);
  });
  //#endregion

  //#region updateForm (entry model)
  it('should populate the form from the entry model and mark it pristine', () => {
    fixture.componentRef.setInput('entry', ENTRY);
    fixture.detectChanges();

    expect(component.author.value).toBe('Verg');
    expect(component.work.value).toBe('ecl');
    expect(component.citation.value).toBe('1.1');
    expect(component.citationUri.value).toBe('http://example.com');
    expect(component.variant.value).toBe('a variant');
    expect(component.tag.value).toBe('poetry');
    expect(component.note.value).toBe('a note');
    expect(component.form.pristine).toBe(true);
  });

  it('should default optional fields to null when absent from the entry', () => {
    fixture.componentRef.setInput('entry', {
      author: 'Verg',
      work: 'ecl',
      citation: '1.1',
    } as QuotationEntry);
    fixture.detectChanges();

    expect(component.citationUri.value).toBeNull();
    expect(component.variant.value).toBeNull();
    expect(component.tag.value).toBeNull();
    expect(component.note.value).toBeNull();
  });

  it('should reset the form when the entry becomes undefined', () => {
    // must first set a real value: a signal input starting at undefined and
    // then set to undefined again is a no-op that would not re-trigger the
    // effect watching it
    fixture.componentRef.setInput('entry', ENTRY);
    fixture.detectChanges();
    expect(component.author.value).toBe('Verg');

    fixture.componentRef.setInput('entry', undefined);
    fixture.detectChanges();

    expect(component.author.value).toBeNull();
    expect(component.work.value).toBeNull();
    expect(component.citation.value).toBeNull();
  });
  //#endregion

  //#region author/work thesauri wiring
  it('should list all authors from workDictionary in authors$', () => {
    const worksService = TestBed.inject(QuotationWorksService);
    const dict = worksService.buildDictionary(WORK_ENTRIES);

    fixture.componentRef.setInput('workDictionary', dict);
    fixture.detectChanges();

    // BehaviorSubject: .value reflects the latest emission synchronously
    expect(component.authors$.value).toEqual([
      { id: 'Verg', value: 'Vergilius' },
      { id: 'Ov', value: 'Ovidius' },
    ]);
  });

  it('should populate authorWorks$ with the works of the currently set author once workDictionary is set', () => {
    const worksService = TestBed.inject(QuotationWorksService);
    const dict = worksService.buildDictionary(WORK_ENTRIES);

    // set the author control first, then provide the dictionary: per
    // updateAuthorWorks, if an author is already set, its works are loaded
    component.author.setValue('Verg');
    fixture.componentRef.setInput('workDictionary', dict);
    fixture.detectChanges();

    expect(component.authorWorks$.value).toEqual([
      { id: 'Verg.ecl.', value: 'Eclogae' },
      { id: 'Verg.aen.', value: 'Aeneis' },
    ]);
  });

  it('should update authorWorks$ when the author control changes, once workDictionary is set', () => {
    const worksService = TestBed.inject(QuotationWorksService);
    const dict = worksService.buildDictionary(WORK_ENTRIES);

    fixture.componentRef.setInput('workDictionary', dict);
    fixture.detectChanges();

    expect(component.authorWorks$.value).toEqual([]);

    component.author.setValue('Ov');
    expect(component.authorWorks$.value).toEqual([]); // Ov. alone has no works besides itself

    component.author.setValue('Verg');
    expect(component.authorWorks$.value).toEqual([
      { id: 'Verg.ecl.', value: 'Eclogae' },
      { id: 'Verg.aen.', value: 'Aeneis' },
    ]);
  });

  it('should not attempt to load author works when no workDictionary has been provided', () => {
    // no workDictionary set: _workDct stays undefined
    expect(() => component.author.setValue('Verg')).not.toThrow();
    expect(component.authorWorks$.value).toEqual([]);
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
    component.author.setValue('changed');
    component.author.markAsDirty();
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
    component.author.setValue('changed');
    component.author.markAsDirty();
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
    component.author.setValue('  Verg  ');
    component.work.setValue('  ecl  ');
    component.citation.setValue('  1.1  ');
    component.citationUri.setValue('  http://x  ');
    component.variant.setValue('  var  ');
    component.tag.setValue('  tag  ');
    component.note.setValue('  note  ');

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
    component.author.setValue('a');
    component.work.setValue('b');
    component.citation.setValue('c');
    // optional fields left null (their default)

    component.save();

    const saved = component.entry()!;
    expect(saved.citationUri).toBeUndefined();
    expect(saved.variant).toBeUndefined();
    expect(saved.tag).toBeUndefined();
    expect(saved.note).toBeUndefined();
  });
  //#endregion
});
