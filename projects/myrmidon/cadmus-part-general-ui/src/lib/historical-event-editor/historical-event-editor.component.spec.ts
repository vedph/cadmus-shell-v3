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
    component.eid.setValue(null);
    expect(component.eid.hasError('required')).toBe(true);

    component.eid.setValue('a'.repeat(501));
    expect(component.eid.hasError('maxlength')).toBe(true);

    component.eid.setValue('e1');
    expect(component.eid.valid).toBe(true);
  });

  it('should mark type as required and maxLength(500)', () => {
    component.type.setValue(null);
    expect(component.type.hasError('required')).toBe(true);

    component.type.setValue('a'.repeat(501));
    expect(component.type.hasError('maxlength')).toBe(true);

    component.type.setValue('person.birth');
    expect(component.type.valid).toBe(true);
  });

  it('should limit tag to maxLength(50)', () => {
    component.tag.setValue('a'.repeat(51));
    expect(component.tag.hasError('maxlength')).toBe(true);
    component.tag.setValue('short');
    expect(component.tag.valid).toBe(true);
  });

  it('should limit description to maxLength(1000)', () => {
    component.description.setValue('a'.repeat(1001));
    expect(component.description.hasError('maxlength')).toBe(true);
  });

  it('should limit note to maxLength(1000)', () => {
    component.note.setValue('a'.repeat(1001));
    expect(component.note.hasError('maxlength')).toBe(true);
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
    expect(component.eid.value).toBe('e1');

    fixture.componentRef.setInput('event', undefined);
    fixture.detectChanges();
    await tick();
    expect(component.eid.value).toBeFalsy();
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

    expect(component.eid.value).toBe('e1');
    expect(component.type.value).toBe('person.birth');
    expect(component.tag.value).toBe('tag1');
    expect(component.description.value).toBe('a description');
    expect(component.note.value).toBe('a note');
    expect(component.chronotopes.value).toEqual(model.chronotopes);
    expect(component.hasAssertion.value).toBe(true);
    expect(component.assertion.value).toEqual(model.assertion);
    expect(component.relatedEntities.value).toEqual(model.relatedEntities);
    expect(component.form.pristine).toBe(true);
  });

  it('should default tag/description/note/hasAssertion when not in the model', async () => {
    const model: HistoricalEvent = {
      eid: 'e1',
      type: 'person.birth',
    };
    fixture.componentRef.setInput('event', model);
    fixture.detectChanges();
    await tick();

    expect(component.tag.value).toBeNull();
    expect(component.description.value).toBeNull();
    expect(component.note.value).toBeNull();
    expect(component.chronotopes.value).toEqual([]);
    expect(component.hasAssertion.value).toBe(false);
    expect(component.assertion.value).toBeNull();
    expect(component.relatedEntities.value).toEqual([]);
  });
  //#endregion

  //#region getTypeEntryPrefix (via onTypeEntryChange)
  it('should build the type entry prefix by replacing the first dot when tailCut is 0 (default)', async () => {
    component.onTypeEntryChange({ id: 'person.birth', value: 'Birth' });
    await tick();
    expect(component.type.value).toBe('person.birth');
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
    expect(component.chronotopes.dirty).toBe(false);
    component.onChronotopesChange(chronotopes);
    expect(component.chronotopes.value).toEqual(chronotopes);
    expect(component.chronotopes.dirty).toBe(true);
  });

  it('onAssertionChange should update and dirty the assertion control', () => {
    const assertion = { rank: 2 } as Assertion;
    component.onAssertionChange(assertion);
    expect(component.assertion.value).toEqual(assertion);
    expect(component.assertion.dirty).toBe(true);

    component.onAssertionChange(undefined);
    expect(component.assertion.value).toBeNull();
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
    expect(component.relatedEntities.value).toEqual([entity]);
    expect(component.relatedEntities.dirty).toBe(true);
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
    component.relatedEntities.setValue([e1, e2]);
    component.editedEntityIndex.set(1);

    const edited: RelatedEntity = {
      relation: 'r2-edited',
      id: { target: { gid: 'g2', label: 'L2 edited' } },
    };
    component.onEntityChange(edited);

    expect(component.relatedEntities.value).toEqual([e1, edited]);
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

    expect(component.relatedEntities.value.length).toBe(1);
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
    component.relatedEntities.setValue([e1, e2]);
    component.deleteEntity(0);
    expect(component.relatedEntities.value).toEqual([e2]);
    expect(component.relatedEntities.dirty).toBe(true);
  });

  it('deleteEntity should also close the editor if deleting the entity being edited', () => {
    const e1: RelatedEntity = {
      relation: 'r1',
      id: { target: { gid: 'g1', label: 'L1' } },
    };
    component.relatedEntities.setValue([e1]);
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
    component.relatedEntities.setValue([e1]);
    component.deleteEntity(-1);
    expect(component.relatedEntities.value).toEqual([e1]);
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
    component.eid.setValue(null); // required -> invalid
    const before = component.event();
    component.save();
    expect(component.event()).toBe(before);
  });

  it('save should set the event model built from the form when valid', () => {
    component.eid.setValue(' e1 ');
    component.type.setValue(' person.birth ');
    component.tag.setValue(' t ');
    component.description.setValue(' desc ');
    component.note.setValue(' note ');
    component.chronotopes.setValue([
      { place: { value: 'Rome' } } as AssertedChronotope,
    ]);
    component.hasAssertion.setValue(true);
    component.assertion.setValue({ rank: 1 } as Assertion);
    component.relatedEntities.setValue([
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
    component.eid.setValue('e1');
    component.type.setValue('t1');
    component.hasAssertion.setValue(false);
    component.assertion.setValue({ rank: 5 } as Assertion);

    component.save();

    const event = component.event();
    expect(event?.assertion).toBeUndefined();
    expect(event?.chronotopes).toBeUndefined();
    expect(event?.relatedEntities).toBeUndefined();
    expect(event?.tag).toBe('');
  });
  //#endregion
});
