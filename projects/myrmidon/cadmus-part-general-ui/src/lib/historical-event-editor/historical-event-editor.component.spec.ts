import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { AssertedChronotope } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { Assertion } from '@myrmidon/cadmus-refs-assertion';
import { ItemService } from '@myrmidon/cadmus-api';

import { HistoricalEventEditorComponent } from './historical-event-editor.component';
import { HistoricalEvent, RelatedEntity } from '../historical-events-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('HistoricalEventEditorComponent', () => {
  let component: HistoricalEventEditorComponent;
  let fixture: ComponentFixture<HistoricalEventEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricalEventEditorComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: ItemService,
          useValue: { searchPins: vi.fn().mockReturnValue(of({ value: { items: [] } })) },
        },
        { provide: 'indexLookupDefinitions', useValue: {} },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricalEventEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region form validators
  it('should mark eid as required and maxLength(500)', () => {
    component.form.eid().value.set('');
    expect(!!component.form.eid().getError('required')).toBe(true);

    component.form.eid().value.set('a'.repeat(501));
    expect(!!component.form.eid().getError('maxLength')).toBe(true);

    component.form.eid().value.set('e1');
    expect(component.form.eid().valid()).toBe(true);
  });

  it('should mark type as required and maxLength(500)', () => {
    component.form.type().value.set('');
    expect(!!component.form.type().getError('required')).toBe(true);

    component.form.type().value.set('a'.repeat(501));
    expect(!!component.form.type().getError('maxLength')).toBe(true);

    component.form.type().value.set('person.birth');
    expect(component.form.type().valid()).toBe(true);
  });

  it('should limit tag to maxLength(50)', () => {
    component.form.tag().value.set('a'.repeat(51));
    expect(!!component.form.tag().getError('maxLength')).toBe(true);
    component.form.tag().value.set('short');
    expect(component.form.tag().valid()).toBe(true);
  });

  it('should limit description to maxLength(1000)', () => {
    component.form.description().value.set('a'.repeat(1001));
    expect(!!component.form.description().getError('maxLength')).toBe(true);
  });

  it('should limit note to maxLength(1000)', () => {
    component.form.note().value.set('a'.repeat(1001));
    expect(!!component.form.note().getError('maxLength')).toBe(true);
  });
  //#endregion

  //#region updateForm (via event input effect)
  it('should reset the form when event is set to undefined', async () => {
    // event starts out undefined already, so setting it to undefined again
    // would be a signal no-op (equal value, effect would not re-run) --
    // first set a real value so the transition back to undefined is
    // actually observed by the effect.
    fixture.componentRef.setInput('event', {
      eid: 'e1',
      type: 't1',
    } as HistoricalEvent);
    fixture.detectChanges();
    await tick();
    expect(plain(component.form.eid().value())).toBe('e1');

    fixture.componentRef.setInput('event', undefined);
    fixture.detectChanges();
    await tick();
    expect(plain(component.form.eid().value())).toBeFalsy();
  });

  it('should populate form controls from the event model', async () => {
    const model: HistoricalEvent = {
      eid: 'e1',
      type: 'person.birth',
      tag: 'tag1',
      description: 'a description',
      note: 'a note',
      chronotopes: [{ place: { value: 'Rome' } } as AssertedChronotope],
      assertion: { rank: 1 } as Assertion,
      relatedEntities: [
        {
          relation: 'person:birth:father',
          id: { target: { gid: 'g1', label: 'Father' } },
        },
      ],
    };
    fixture.componentRef.setInput('event', model);
    fixture.detectChanges();
    await tick();

    expect(plain(component.form.eid().value())).toBe('e1');
    expect(plain(component.form.type().value())).toBe('person.birth');
    expect(plain(component.form.tag().value())).toBe('tag1');
    expect(plain(component.form.description().value())).toBe('a description');
    expect(plain(component.form.note().value())).toBe('a note');
    expect(plain(component.form.chronotopes().value())).toEqual(model.chronotopes);
    expect(plain(component.form.hasAssertion().value())).toBe(true);
    expect(plain(component.form.assertion().value())).toEqual(model.assertion);
    expect(plain(component.form.relatedEntities().value())).toEqual(model.relatedEntities);
    expect(component.form().dirty()).toBe(false);
  });

  it('should default tag/description/note/hasAssertion when not in the model', async () => {
    const model: HistoricalEvent = {
      eid: 'e1',
      type: 'person.birth',
    };
    fixture.componentRef.setInput('event', model);
    fixture.detectChanges();
    await tick();

    expect(component.form.tag().value()).toBe('');
    expect(component.form.description().value()).toBe('');
    expect(component.form.note().value()).toBe('');
    expect(plain(component.form.chronotopes().value())).toEqual([]);
    expect(plain(component.form.hasAssertion().value())).toBe(false);
    expect(plain(component.form.assertion().value())).toBeNull();
    expect(plain(component.form.relatedEntities().value())).toEqual([]);
  });
  //#endregion

  //#region getTypeEntryPrefix (via onTypeEntryChange)
  it('should build the type entry prefix by replacing the first dot when tailCut is 0 (default)', async () => {
    component.onTypeEntryChange({ id: 'person.birth', value: 'Birth' });
    await tick();
    expect(plain(component.form.type().value())).toBe('person.birth');
    expect(component.typeEntryPrefix()).toBe('person:birth:');
  });

  it('should cut an extra tail portion for ids ending with ".-"', async () => {
    // tailSize = 1 + eventTypeTailCut() = 1 (default cut 0)
    component.onTypeEntryChange({ id: 'person.job.-', value: 'Job' });
    await tick();
    expect(component.typeEntryPrefix()).toBe('person:job:');
  });

  it('should cut eventTypeTailCut portions from a non-tailed id', async () => {
    fixture.componentRef.setInput('eventTypeTailCut', 1);
    fixture.detectChanges();
    component.onTypeEntryChange({ id: 'person.job.bishop', value: 'Bishop' });
    await tick();
    expect(component.typeEntryPrefix()).toBe('person:job:');
  });

  it('should produce just the separator when tailSize meets/exceeds token count', async () => {
    fixture.componentRef.setInput('eventTypeTailCut', 2);
    fixture.detectChanges();
    component.onTypeEntryChange({ id: 'a.b', value: 'B' });
    await tick();
    // tokens=['a','b'], tailSize=2, splice(0) => [] => prefix is just ':'
    expect(component.typeEntryPrefix()).toBe(':');
  });
  //#endregion

  //#region currentRelEntries computed
  it('should return an empty array when relationEntries is empty/undefined', () => {
    expect(component.currentRelEntries()).toEqual([]);
    fixture.componentRef.setInput('relationEntries', []);
    fixture.detectChanges();
    expect(component.currentRelEntries()).toEqual([]);
  });

  it('should return all relation entries when no prefix is set', () => {
    const entries: ThesaurusEntry[] = [
      { id: 'person:birth:father', value: 'Father' },
      { id: 'person:death:cause', value: 'Cause' },
    ];
    fixture.componentRef.setInput('relationEntries', entries);
    fixture.detectChanges();
    expect(component.currentRelEntries()).toEqual(entries);
  });

  it('should filter relation entries by the current type prefix', async () => {
    const entries: ThesaurusEntry[] = [
      { id: 'person:birth:father', value: 'Father' },
      { id: 'person:birth:mother', value: 'Mother' },
      { id: 'person:death:cause', value: 'Cause' },
    ];
    fixture.componentRef.setInput('relationEntries', entries);
    fixture.detectChanges();
    component.onTypeEntryChange({ id: 'person.birth', value: 'Birth' });
    await tick();
    fixture.detectChanges();

    expect(component.currentRelEntries()).toEqual([
      entries[0],
      entries[1],
    ]);
  });
  //#endregion

  it('renderLabel should delegate to renderLabelFromLastColon', () => {
    expect(component.renderLabel('a:b:c')).toBe('c');
    expect(component.renderLabel('noColon')).toBe('noColon');
  });

  //#region chronotopes / assertion change handlers
  it('onChronotopesChange should update and dirty the chronotopes control', () => {
    const chronotopes = [{ place: { value: 'Rome' } } as AssertedChronotope];
    expect(component.form.chronotopes().dirty()).toBe(false);
    component.onChronotopesChange(chronotopes);
    expect(plain(component.form.chronotopes().value())).toEqual(chronotopes);
    expect(component.form.chronotopes().dirty()).toBe(true);
  });

  it('onAssertionChange should update and dirty the assertion control', () => {
    const assertion = { rank: 2 } as Assertion;
    component.onAssertionChange(assertion);
    expect(plain(component.form.assertion().value())).toEqual(assertion);
    expect(component.form.assertion().dirty()).toBe(true);

    component.onAssertionChange(undefined);
    expect(plain(component.form.assertion().value())).toBeNull();
  });
  //#endregion

  //#region related entities CRUD
  it('addEntity should open a new entity using the first current relation entry', () => {
    fixture.componentRef.setInput('relationEntries', [
      { id: 'person:birth:father', value: 'Father' },
    ]);
    fixture.detectChanges();
    component.addEntity();
    expect(component.editedEntityIndex()).toBe(-1);
    expect(component.editedEntity()?.relation).toBe('person:birth:father');
  });

  it('addEntity should use an empty relation when there are no relation entries', () => {
    component.addEntity();
    expect(component.editedEntity()?.relation).toBe('');
  });

  it('editEntity should clone the entity and set the edited index', () => {
    const entity: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    component.editEntity(entity, 3);
    expect(component.editedEntityIndex()).toBe(3);
    expect(component.editedEntity()).toEqual(entity);
    // must be a clone, not the same reference
    expect(component.editedEntity()).not.toBe(entity);
  });

  it('onEntityChange should append a new entity when index is -1', () => {
    const entity: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    component.editedEntityIndex.set(-1);
    component.onEntityChange(entity);
    expect(plain(component.form.relatedEntities().value())).toEqual([entity]);
    expect(component.form.relatedEntities().dirty()).toBe(true);
    // editor should be closed after saving
    expect(component.editedEntity()).toBeUndefined();
    expect(component.editedEntityIndex()).toBe(-1);
  });

  it('onEntityChange should replace the entity at editedEntityIndex when editing', () => {
    const e1: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    const e2: RelatedEntity = {
      relation: 'r2',
      id: { target: { gid: 'g2', label: 'L2' } },
    };
    component.form.relatedEntities().value.set([e1, e2]);
    component.editedEntityIndex.set(1);

    const edited: RelatedEntity = {
      relation: 'r2-edited',
      id: { target: { gid: 'g2', label: 'L2 edited' } },
    };
    component.onEntityChange(edited);

    expect(plain(component.form.relatedEntities().value())).toEqual([e1, edited]);
  });

  it('the duplicate guard prevents logically-equal entities from being added twice', () => {
    const e1: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    component.editedEntityIndex.set(-1);
    component.onEntityChange(e1);
    // a logically identical, but distinct-object, entity
    const e1Clone: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    component.editedEntityIndex.set(-1);
    component.onEntityChange(e1Clone);

    expect(component.form.relatedEntities().value().length).toBe(1);
  });

  it('closeEntity should clear the edited entity and index', () => {
    component.editEntity(
      { relation: 'r1', id: { target: { gid: 'g1', label: 'L1' } } },
      0,
    );
    component.closeEntity();
    expect(component.editedEntity()).toBeUndefined();
    expect(component.editedEntityIndex()).toBe(-1);
  });

  it('deleteEntity should remove the entity at the given index and dirty the control', () => {
    const e1: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    const e2: RelatedEntity = {
      relation: 'r2',
      id: { target: { gid: 'g2', label: 'L2' } },
    };
    component.form.relatedEntities().value.set([e1, e2]);
    component.deleteEntity(0);
    expect(plain(component.form.relatedEntities().value())).toEqual([e2]);
    expect(component.form.relatedEntities().dirty()).toBe(true);
  });

  it('deleteEntity should also close the editor if deleting the entity being edited', () => {
    const e1: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    component.form.relatedEntities().value.set([e1]);
    component.editEntity(e1, 0);
    component.deleteEntity(0);
    expect(component.editedEntity()).toBeUndefined();
    expect(component.editedEntityIndex()).toBe(-1);
  });

  it('deleteEntity should do nothing for a negative index', () => {
    const e1: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    component.form.relatedEntities().value.set([e1]);
    component.deleteEntity(-1);
    expect(plain(component.form.relatedEntities().value())).toEqual([e1]);
  });
  //#endregion

  //#region cancel / save
  it('cancel should emit editorClose', () => {
    const spy = vi.fn();
    component.editorClose.subscribe(spy);
    component.cancel();
    expect(spy).toHaveBeenCalled();
  });

  it('save should do nothing when the form is invalid', () => {
    component.form.eid().value.set(''); // required -> invalid
    const before = component.event();
    component.save();
    expect(component.event()).toBe(before);
  });

  it('save should set the event model built from the form when valid', () => {
    component.form.eid().value.set(' e1 ');
    component.form.type().value.set(' person.birth ');
    component.form.tag().value.set(' t ');
    component.form.description().value.set(' desc ');
    component.form.note().value.set(' note ');
    component.form.chronotopes().value.set([
      { place: { value: 'Rome' } } as AssertedChronotope,
    ]);
    component.form.hasAssertion().value.set(true);
    component.form.assertion().value.set({ rank: 1 } as Assertion);
    component.form.relatedEntities().value.set([
      { relation: 'r1', id: { target: { gid: 'g1', label: 'L1' } } },
    ]);

    component.save();

    expect(component.event()).toEqual({
      eid: 'e1',
      type: 'person.birth',
      tag: 't',
      description: 'desc',
      note: 'note',
      chronotopes: [{ place: { value: 'Rome' } }],
      assertion: { rank: 1 },
      relatedEntities: [
        { relation: 'r1', id: { target: { gid: 'g1', label: 'L1' } } },
      ],
    });
  });

  it('save should omit assertion when hasAssertion is false, and omit empty arrays', () => {
    component.form.eid().value.set('e1');
    component.form.type().value.set('t1');
    component.form.hasAssertion().value.set(false);
    component.form.assertion().value.set({ rank: 5 } as Assertion);

    component.save();

    const event = component.event();
    expect(event?.assertion).toBeUndefined();
    expect(event?.chronotopes).toBeUndefined();
    expect(event?.relatedEntities).toBeUndefined();
    expect(event?.tag).toBeUndefined();
  });
  //#endregion

  it('should render no <form> of its own, and no submit buttons', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector(':scope > form')).toBeNull();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);
  });

  it('should keep the dirty state of a user edit across change detection', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input',
    );
    input.value = input.value + 'x';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.detectChanges();
    expect(component.form().dirty()).toBe(true);
  });
});
