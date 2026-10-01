import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

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
    expect(plain(component.form.type().value())).toBe(0);
    expect(component.form.value().value()).toBe('');
    expect(component.form.normValue().value()).toBe('');
    expect(plain(component.form.accepted().value())).toBe(false);
    expect(component.form.subrange().value()).toBe('');
    expect(component.form.tag().value()).toBe('');
    expect(component.form.groupId().value()).toBe('');
    expect(component.form.note().value()).toBe('');
    expect(component.form.witnesses().value().length).toBe(0);
    expect(component.form.authors().value().length).toBe(0);
  });

  it('type field should be required', () => {
    component.form.type().value.set(null as unknown as number);
    expect(component.form.type().getError('required')).toBeTruthy();
  });

  it('value/normValue/note controls should reject values over their max length', () => {
    component.form.value().value.set('a'.repeat(1001));
    expect(!!component.form.value().getError('maxLength')).toBe(true);
    component.form.normValue().value.set('a'.repeat(1001));
    expect(!!component.form.normValue().getError('maxLength')).toBe(true);
    component.form.note().value.set('a'.repeat(5001));
    expect(!!component.form.note().getError('maxLength')).toBe(true);
  });

  it('tag/groupId controls should reject values over 50 characters', () => {
    component.form.tag().value.set('a'.repeat(51));
    expect(!!component.form.tag().getError('maxLength')).toBe(true);
    component.form.groupId().value.set('a'.repeat(51));
    expect(!!component.form.groupId().getError('maxLength')).toBe(true);
  });

  it('subrange control should validate against the numeric range pattern', () => {
    component.form.subrange().value.set('abc');
    expect(!!component.form.subrange().getError('pattern')).toBe(true);
    component.form.subrange().value.set('5');
    expect(component.form.subrange().valid()).toBe(true);
    component.form.subrange().value.set('5-10');
    expect(component.form.subrange().valid()).toBe(true);
  });
  //#endregion

  //#region updateForm (entry input -> form)
  it('should populate the form controls when entry input is set', () => {
    const entry = buildEntry();
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();

    expect(plain(component.form.type().value())).toBe(entry.type);
    expect(plain(component.form.value().value())).toBe('lectio');
    expect(plain(component.form.normValue().value())).toBe('norm');
    expect(plain(component.form.accepted().value())).toBe(true);
    expect(plain(component.form.subrange().value())).toBe('1-5');
    expect(plain(component.form.tag().value())).toBe('tag1');
    expect(plain(component.form.groupId().value())).toBe('g1');
    expect(plain(component.form.note().value())).toBe('a note');
    expect(component.form.witnesses().value().length).toBe(1);
    expect(plain(component.form.witnesses().value())).toEqual([{ value: 'w1', note: 'wn1' }]);
    expect(component.form.authors().value().length).toBe(1);
    expect(plain(component.form.authors().value())).toEqual([
      { tag: 'at1', value: 'a1', location: 'loc1', note: 'an1' },
    ]);
    expect(component.form().dirty()).toBe(false);
  });

  it('should treat isAccepted as false unless it is exactly true', () => {
    const entry = buildEntry({ isAccepted: undefined });
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
    expect(plain(component.form.accepted().value())).toBe(false);
  });

  it('should clear witnesses/authors arrays before repopulating them', () => {
    fixture.componentRef.setInput('entry', buildEntry());
    fixture.detectChanges();
    expect(component.form.witnesses().value().length).toBe(1);

    // a second entry with no witnesses/authors at all
    fixture.componentRef.setInput(
      'entry',
      buildEntry({ witnesses: undefined, authors: undefined }),
    );
    fixture.detectChanges();
    expect(component.form.witnesses().value().length).toBe(0);
    expect(component.form.authors().value().length).toBe(0);
  });

  it('should reset the form when entry becomes undefined', () => {
    // set a real value first: per Angular signal-input semantics, setting
    // undefined -> undefined again would be a no-op and would not
    // re-trigger the effect.
    fixture.componentRef.setInput('entry', buildEntry());
    fixture.detectChanges();
    expect(plain(component.form.value().value())).toBe('lectio');

    fixture.componentRef.setInput('entry', undefined);
    fixture.detectChanges();

    // no entry: the form gets its defaults
    expect(plain(component.form.type().value())).toBe(0);
    expect(component.form.value().value()).toBe('');
    expect(plain(component.form.accepted().value())).toBe(false);

    expect(component.form.witnesses().value().length).toBe(0);
    expect(component.form.authors().value().length).toBe(0);
  });
  //#endregion

  //#region witnesses array editing
  it('addWitness should append a control and mark the form dirty', () => {
    expect(component.form().dirty()).toBe(false);
    component.addWitness({ value: 'w1', note: 'n1' });
    expect(component.form.witnesses().value().length).toBe(1);
    expect(plain(component.form.witnesses().value()[0])).toEqual({
      value: 'w1',
      note: 'n1',
    });
    expect(component.form().dirty()).toBe(true);
  });

  it('addWitness without arguments should append an empty control', () => {
    component.addWitness();
    expect(component.form.witnesses().value().length).toBe(1);
    // missing values become empty strings
    expect(plain(component.form.witnesses().value()[0])).toEqual({
      value: '',
      note: '',
    });
  });

  it('witness value control should be required and max 50 chars', () => {
    component.addWitness();
    const valueCtrl = component.form.witnesses[0]!.value();
    expect(!!valueCtrl.getError('required')).toBe(true);
    valueCtrl.value.set('a'.repeat(51));
    expect(!!valueCtrl.getError('maxLength')).toBe(true);
  });

  it('removeWitness should remove the control at the given index and dirty the form', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.removeWitness(0);
    expect(component.form.witnesses().value().length).toBe(1);
    expect(component.form.witnesses().value()[0].value).toBe('w2');
  });

  it('moveWitnessUp should swap with the previous item', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessUp(1);
    expect(component.form.witnesses().value().map((w: AnnotatedValue) => w.value)).toEqual([
      'w2',
      'w1',
    ]);
  });

  it('moveWitnessUp should do nothing for index 0', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessUp(0);
    expect(component.form.witnesses().value().map((w: AnnotatedValue) => w.value)).toEqual([
      'w1',
      'w2',
    ]);
  });

  it('moveWitnessDown should swap with the next item', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessDown(0);
    expect(component.form.witnesses().value().map((w: AnnotatedValue) => w.value)).toEqual([
      'w2',
      'w1',
    ]);
  });

  it('moveWitnessDown should do nothing for the last index', () => {
    component.addWitness({ value: 'w1' } as AnnotatedValue);
    component.addWitness({ value: 'w2' } as AnnotatedValue);
    component.moveWitnessDown(1);
    expect(component.form.witnesses().value().map((w: AnnotatedValue) => w.value)).toEqual([
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
    expect(component.form.authors().value().length).toBe(1);
    expect(plain(component.form.authors().value()[0])).toEqual({
      tag: 't1',
      value: 'a1',
      location: 'l1',
      note: 'n1',
    });
    expect(component.form().dirty()).toBe(true);
  });

  it('author value control should be required and max 50 chars', () => {
    component.addAuthor();
    const valueCtrl = component.form.authors[0]!.value();
    expect(!!valueCtrl.getError('required')).toBe(true);
    valueCtrl.value.set('a'.repeat(51));
    expect(!!valueCtrl.getError('maxLength')).toBe(true);
  });

  it('removeAuthor should remove the control at the given index', () => {
    component.addAuthor({ value: 'a1' } as LocAnnotatedValue);
    component.addAuthor({ value: 'a2' } as LocAnnotatedValue);
    component.removeAuthor(0);
    expect(component.form.authors().value().length).toBe(1);
    expect(component.form.authors().value()[0].value).toBe('a2');
  });

  it('moveAuthorUp should swap with the previous item, and no-op at index 0', () => {
    component.addAuthor({ value: 'a1' } as LocAnnotatedValue);
    component.addAuthor({ value: 'a2' } as LocAnnotatedValue);
    component.moveAuthorUp(0);
    expect(component.form.authors().value().map((a: LocAnnotatedValue) => a.value)).toEqual([
      'a1',
      'a2',
    ]);
    component.moveAuthorUp(1);
    expect(component.form.authors().value().map((a: LocAnnotatedValue) => a.value)).toEqual([
      'a2',
      'a1',
    ]);
  });

  it('moveAuthorDown should swap with the next item, and no-op at the last index', () => {
    component.addAuthor({ value: 'a1' } as LocAnnotatedValue);
    component.addAuthor({ value: 'a2' } as LocAnnotatedValue);
    component.moveAuthorDown(1);
    expect(component.form.authors().value().map((a: LocAnnotatedValue) => a.value)).toEqual([
      'a1',
      'a2',
    ]);
    component.moveAuthorDown(0);
    expect(component.form.authors().value().map((a: LocAnnotatedValue) => a.value)).toEqual([
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
    component.form.subrange().value.set('not-a-range');
    let emitted = false;
    component.entry.subscribe(() => (emitted = true));

    component.submit();

    expect(emitted).toBe(false);
  });

  it('submit should emit a trimmed entry built from the form when valid', () => {
    component.form.type().value.set(ApparatusEntryType.additionBefore);
    component.form.value().value.set('  lectio  ');
    component.form.normValue().value.set('  norm  ');
    component.form.accepted().value.set(true);
    component.form.subrange().value.set('1-5');
    component.form.tag().value.set('  tag1  ');
    component.form.groupId().value.set('  g1  ');
    component.form.note().value.set('  a note  ');
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
    component.form.value().value.set('x');
    component.form.accepted().value.set(false);

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
