import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { vi } from 'vitest';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { ApparatusEntryComponent } from './apparatus-entry.component';
import {
  ApparatusEntry,
  ApparatusEntryType,
  AnnotatedValue,
  LocAnnotatedValue,
} from '../apparatus-fragment';

class MockClipboard {
  copy = vi.fn();
}

function buildEntry(partial?: Partial<ApparatusEntry>): ApparatusEntry {
  return {
    type: ApparatusEntryType.replacement,
    value: 'lectio',
    normValue: 'norm',
    isAccepted: true,
    subrange: '1-5',
    tag: 'tag1',
    groupId: 'g1',
    note: 'a note',
    witnesses: [{ value: 'w1', note: 'wn1' }],
    authors: [{ tag: 'at1', value: 'a1', location: 'loc1', note: 'an1' }],
    ...partial,
  };
}

describe('ApparatusEntryComponent', () => {
  let component: ApparatusEntryComponent;
  let fixture: ComponentFixture<ApparatusEntryComponent>;
  let clipboard: MockClipboard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApparatusEntryComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        FormBuilder,
        { provide: Clipboard, useClass: MockClipboard },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApparatusEntryComponent);
    component = fixture.componentInstance;
    clipboard = TestBed.inject(Clipboard) as unknown as MockClipboard;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region initial form state
  it('should build the form with the expected default control values', () => {
    expect(component.type.value).toBe(0);
    expect(component.value.value).toBeNull();
    expect(component.normValue.value).toBeNull();
    expect(component.accepted.value).toBe(false);
    expect(component.subrange.value).toBeNull();
    expect(component.tag.value).toBeNull();
    expect(component.groupId.value).toBeNull();
    expect(component.note.value).toBeNull();
    expect(component.witnesses.length).toBe(0);
    expect(component.authors.length).toBe(0);
  });

  it('type control should be required', () => {
    component.type.setValue(null as unknown as number);
    expect(component.type.hasError('required')).toBe(true);
  });

  it('value/normValue/note controls should reject values over their max length', () => {
    component.value.setValue('a'.repeat(1001));
    expect(component.value.hasError('maxlength')).toBe(true);
    component.normValue.setValue('a'.repeat(1001));
    expect(component.normValue.hasError('maxlength')).toBe(true);
    component.note.setValue('a'.repeat(5001));
    expect(component.note.hasError('maxlength')).toBe(true);
  });

  it('tag/groupId controls should reject values over 50 characters', () => {
    component.tag.setValue('a'.repeat(51));
    expect(component.tag.hasError('maxlength')).toBe(true);
    component.groupId.setValue('a'.repeat(51));
    expect(component.groupId.hasError('maxlength')).toBe(true);
  });

  it('subrange control should validate against the numeric range pattern', () => {
    component.subrange.setValue('abc');
    expect(component.subrange.hasError('pattern')).toBe(true);
    component.subrange.setValue('5');
    expect(component.subrange.valid).toBe(true);
    component.subrange.setValue('5-10');
    expect(component.subrange.valid).toBe(true);
  });
  //#endregion

  //#region updateForm (entry input -> form)
  it('should populate the form controls when entry input is set', () => {
    const entry = buildEntry();
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();

    expect(component.type.value).toBe(entry.type);
    expect(component.value.value).toBe('lectio');
    expect(component.normValue.value).toBe('norm');
    expect(component.accepted.value).toBe(true);
    expect(component.subrange.value).toBe('1-5');
    expect(component.tag.value).toBe('tag1');
    expect(component.groupId.value).toBe('g1');
    expect(component.note.value).toBe('a note');
    expect(component.witnesses.length).toBe(1);
    expect(component.witnesses.value).toEqual([{ value: 'w1', note: 'wn1' }]);
    expect(component.authors.length).toBe(1);
    expect(component.authors.value).toEqual([
      { tag: 'at1', value: 'a1', location: 'loc1', note: 'an1' },
    ]);
    expect(component.form.pristine).toBe(true);
  });

  it('should treat isAccepted as false unless it is exactly true', () => {
    const entry = buildEntry({ isAccepted: undefined });
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
    expect(component.accepted.value).toBe(false);
  });

  it('should clear witnesses/authors arrays before repopulating them', () => {
    fixture.componentRef.setInput('entry', buildEntry());
    fixture.detectChanges();
    expect(component.witnesses.length).toBe(1);

    // a second entry with no witnesses/authors at all
    fixture.componentRef.setInput(
      'entry',
      buildEntry({ witnesses: undefined, authors: undefined }),
    );
    fixture.detectChanges();
    expect(component.witnesses.length).toBe(0);
    expect(component.authors.length).toBe(0);
  });

  it('should reset the form when entry becomes undefined', () => {
    // set a real value first: per Angular signal-input semantics, setting
    // undefined -> undefined again would be a no-op and would not
    // re-trigger the effect.
    fixture.componentRef.setInput('entry', buildEntry());
    fixture.detectChanges();
    expect(component.value.value).toBe('lectio');

    fixture.componentRef.setInput('entry', undefined);
    fixture.detectChanges();

    // reset() reverts scalar controls to their construction-time default.
    expect(component.type.value).toBe(0);
    expect(component.value.value).toBeNull();
    expect(component.accepted.value).toBe(false);

    // FormGroup/FormArray.reset() only resets the VALUE of each existing
    // child control; it does not remove array items, so witnesses/authors
    // must be cleared explicitly before reset() or stale, blanked-out rows
    // would remain.
    expect(component.witnesses.length).toBe(0);
    expect(component.authors.length).toBe(0);
  });
  //#endregion

  //#region witnesses array editing
  it('addWitness should append a control and mark the form dirty', () => {
    expect(component.form.pristine).toBe(true);
    component.addWitness({ value: 'w1', note: 'n1' });
    expect(component.witnesses.length).toBe(1);
    expect(component.witnesses.at(0).value).toEqual({
      value: 'w1',
      note: 'n1',
    });
    expect(component.form.dirty).toBe(true);
  });

  it('addWitness without arguments should append an empty control', () => {
    component.addWitness();
    expect(component.witnesses.length).toBe(1);
    // FormControl normalizes an undefined initial value to null.
    expect(component.witnesses.at(0).value).toEqual({
      value: null,
      note: null,
    });
  });

  it('witness value control should be required and max 50 chars', () => {
    component.addWitness();
    const valueCtrl = component.witnesses.at(0).get('value')!;
    expect(valueCtrl.hasError('required')).toBe(true);
    valueCtrl.setValue('a'.repeat(51));
    expect(valueCtrl.hasError('maxlength')).toBe(true);
  });

  it('removeWitness should remove the control at the given index and dirty the form', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.removeWitness(0);
    expect(component.witnesses.length).toBe(1);
    expect(component.witnesses.at(0).value.value).toBe('w2');
  });

  it('moveWitnessUp should swap with the previous item', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessUp(1);
    expect(component.witnesses.value.map((w: AnnotatedValue) => w.value)).toEqual([
      'w2',
      'w1',
    ]);
  });

  it('moveWitnessUp should do nothing for index 0', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessUp(0);
    expect(component.witnesses.value.map((w: AnnotatedValue) => w.value)).toEqual([
      'w1',
      'w2',
    ]);
  });

  it('moveWitnessDown should swap with the next item', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessDown(0);
    expect(component.witnesses.value.map((w: AnnotatedValue) => w.value)).toEqual([
      'w2',
      'w1',
    ]);
  });

  it('moveWitnessDown should do nothing for the last index', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessDown(1);
    expect(component.witnesses.value.map((w: AnnotatedValue) => w.value)).toEqual([
      'w1',
      'w2',
    ]);
  });
  //#endregion

  //#region authors array editing
  it('addAuthor should append a control and mark the form dirty', () => {
    component.addAuthor({
      tag: 't1',
      value: 'a1',
      location: 'l1',
      note: 'n1',
    });
    expect(component.authors.length).toBe(1);
    expect(component.authors.at(0).value).toEqual({
      tag: 't1',
      value: 'a1',
      location: 'l1',
      note: 'n1',
    });
    expect(component.form.dirty).toBe(true);
  });

  it('author value control should be required and max 50 chars', () => {
    component.addAuthor();
    const valueCtrl = component.authors.at(0).get('value')!;
    expect(valueCtrl.hasError('required')).toBe(true);
    valueCtrl.setValue('a'.repeat(51));
    expect(valueCtrl.hasError('maxlength')).toBe(true);
  });

  it('removeAuthor should remove the control at the given index', () => {
    component.addAuthor({ value: 'a1' } as LocAnnotatedValue);
    component.addAuthor({ value: 'a2' } as LocAnnotatedValue);
    component.removeAuthor(0);
    expect(component.authors.length).toBe(1);
    expect(component.authors.at(0).value.value).toBe('a2');
  });

  it('moveAuthorUp should swap with the previous item, and no-op at index 0', () => {
    component.addAuthor({ value: 'a1' } as LocAnnotatedValue);
    component.addAuthor({ value: 'a2' } as LocAnnotatedValue);
    component.moveAuthorUp(0);
    expect(component.authors.value.map((a: LocAnnotatedValue) => a.value)).toEqual([
      'a1',
      'a2',
    ]);
    component.moveAuthorUp(1);
    expect(component.authors.value.map((a: LocAnnotatedValue) => a.value)).toEqual([
      'a2',
      'a1',
    ]);
  });

  it('moveAuthorDown should swap with the next item, and no-op at the last index', () => {
    component.addAuthor({ value: 'a1' } as LocAnnotatedValue);
    component.addAuthor({ value: 'a2' } as LocAnnotatedValue);
    component.moveAuthorDown(1);
    expect(component.authors.value.map((a: LocAnnotatedValue) => a.value)).toEqual([
      'a1',
      'a2',
    ]);
    component.moveAuthorDown(0);
    expect(component.authors.value.map((a: LocAnnotatedValue) => a.value)).toEqual([
      'a2',
      'a1',
    ]);
  });
  //#endregion

  //#region onEntryChange / renderLabel
  it('onEntryChange should copy the picked entry id to the clipboard', () => {
    const entry: ThesaurusEntry = { id: 'author.homer', value: 'Homer' };
    component.onEntryChange(entry);
    expect(clipboard.copy).toHaveBeenCalledWith('author.homer');
  });

  it('onEntryChange should not touch the clipboard for a falsy entry', () => {
    component.onEntryChange(undefined as unknown as ThesaurusEntry);
    expect(clipboard.copy).not.toHaveBeenCalled();
  });

  it('renderLabel should shorten a colon-separated hierarchical label', () => {
    expect(component.renderLabel('furniture: table: color')).toBe('color');
    expect(component.renderLabel('flat')).toBe('flat');
  });
  //#endregion

  //#region cancel / submit
  it('cancel should emit editorClose', () => {
    let emitted = false;
    component.editorClose.subscribe(() => (emitted = true));
    component.cancel();
    expect(emitted).toBe(true);
  });

  it('submit should not update entry when the form is invalid', () => {
    // type control alone is not enough: witnesses/authors are empty so the
    // form as a whole is otherwise valid; force an invalid state via a bad
    // subrange pattern.
    component.subrange.setValue('not-a-range');
    let emitted = false;
    component.entry.subscribe(() => (emitted = true));

    component.submit();

    expect(emitted).toBe(false);
  });

  it('submit should emit a trimmed entry built from the form when valid', () => {
    component.type.setValue(ApparatusEntryType.additionBefore);
    component.value.setValue('  lectio  ');
    component.normValue.setValue('  norm  ');
    component.accepted.setValue(true);
    component.subrange.setValue('1-5');
    component.tag.setValue('  tag1  ');
    component.groupId.setValue('  g1  ');
    component.note.setValue('  a note  ');
    component.addWitness({ value: '  w1  ', note: '  wn1  ' });
    component.addAuthor({
      tag: '  at1  ',
      value: '  a1  ',
      location: '  loc1  ',
      note: '  an1  ',
    });

    let emitted: ApparatusEntry | undefined;
    component.entry.subscribe((e) => (emitted = e));

    component.submit();

    expect(emitted).toBeDefined();
    expect(emitted!.type).toBe(ApparatusEntryType.additionBefore);
    expect(emitted!.value).toBe('lectio');
    expect(emitted!.normValue).toBe('norm');
    expect(emitted!.isAccepted).toBe(true);
    expect(emitted!.subrange).toBe('1-5');
    expect(emitted!.tag).toBe('tag1');
    expect(emitted!.groupId).toBe('g1');
    expect(emitted!.note).toBe('a note');
    expect(emitted!.witnesses).toEqual([{ value: 'w1', note: 'wn1' }]);
    expect(emitted!.authors).toEqual([
      { tag: 'at1', value: 'a1', location: 'loc1', note: 'an1' },
    ]);
  });

  it('submit should set isAccepted to false when the checkbox is unchecked', () => {
    component.value.setValue('x');
    component.accepted.setValue(false);

    let emitted: ApparatusEntry | undefined;
    component.entry.subscribe((e) => (emitted = e));
    component.submit();

    expect(emitted!.isAccepted).toBe(false);
  });
  //#endregion

  //#region thesauri inputs
  it('should expose the thesaurus entry inputs as given', () => {
    const tagEntries: ThesaurusEntry[] = [{ id: 't1', value: 'Tag 1' }];
    const witEntries: ThesaurusEntry[] = [{ id: 'w1', value: 'Wit 1' }];
    const authEntries: ThesaurusEntry[] = [{ id: 'a1', value: 'Auth 1' }];
    const authTagEntries: ThesaurusEntry[] = [{ id: 'at1', value: 'AT 1' }];
    const workEntries: ThesaurusEntry[] = [{ id: 'wk1', value: 'Work 1' }];

    fixture.componentRef.setInput('tagEntries', tagEntries);
    fixture.componentRef.setInput('witEntries', witEntries);
    fixture.componentRef.setInput('authEntries', authEntries);
    fixture.componentRef.setInput('authTagEntries', authTagEntries);
    fixture.componentRef.setInput('workEntries', workEntries);
    fixture.detectChanges();

    expect(component.tagEntries()).toEqual(tagEntries);
    expect(component.witEntries()).toEqual(witEntries);
    expect(component.authEntries()).toEqual(authEntries);
    expect(component.authTagEntries()).toEqual(authTagEntries);
    expect(component.workEntries()).toEqual(workEntries);
  });
  //#endregion
});
