import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { AssertedChronotope } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { Assertion } from '@myrmidon/cadmus-refs-assertion';
import { ItemService } from '@myrmidon/cadmus-api';

import { TaxoStoreNode } from '@myrmidon/taxo-store-api';
import { TaxoStorePicker } from '@myrmidon/taxo-store-picker';
import {
  ThesaurusEntryPicker,
  ThesOrTaxoPicker,
  ThesOrTaxoSourceService,
} from '@myrmidon/cadmus-ui-thestaxo';

import { HistoricalEventEditorComponent } from './historical-event-editor.component';
import { RelatedEntityComponent } from '../related-entity/related-entity.component';
import { HistoricalEvent, RelatedEntity } from '../historical-events-part';

// the TaxoStore picker is external and loads data from its API: replace it
// with a stand-in exposing only what the type picker binds
@Component({ selector: 'ts-taxo-store-picker', template: '' })
class FakeTaxoStorePicker {
  public readonly treeId = input.required<string | null>();
  public readonly label = input<string>();
  public readonly hasTopNodeFilter = input(true);
  public readonly hasFeaturesFilter = input(true);
  public readonly canEdit = input(true);
  public readonly canAdd = input(true);
  public readonly canDelete = input(true);
  public readonly nodePick = output<TaxoStoreNode | null>();
}

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
        // tabs switch synchronously
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        {
          provide: ThesOrTaxoSourceService,
          useValue: {
            getThesaurusEntries: vi.fn().mockReturnValue(of([])),
            getTaxoNodeLabel: vi.fn().mockReturnValue(of(null)),
            setTaxoNodeLabel: vi.fn(),
          },
        },
      ],
    })
      .overrideComponent(ThesOrTaxoPicker, {
        remove: { imports: [TaxoStorePicker] },
        add: { imports: [FakeTaxoStorePicker] },
      })
      .compileComponents();
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
  it('should build the type entry prefix by replacing dots when tailCut is 0 (default)', async () => {
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

  it('should not filter relations when tailSize meets/exceeds token count', async () => {
    fixture.componentRef.setInput('eventTypeTailCut', 2);
    fixture.detectChanges();
    component.onTypeEntryChange({ id: 'a.b', value: 'B' });
    await tick();
    // tokens=['a','b'], tailSize=2: nothing left, so no prefix
    expect(component.typeEntryPrefix()).toBeUndefined();
  });

  it('should replace all the dots of a deeper type when tailCut is 0', async () => {
    component.onTypeEntryChange({ id: 'person.job.bishop', value: 'Bishop' });
    await tick();
    expect(component.typeEntryPrefix()).toBe('person:job:bishop:');
  });

  it('should let settings override eventTypeTailCut', async () => {
    fixture.componentRef.setInput('eventTypeTailCut', 1);
    fixture.componentRef.setInput('settings', { relationFilter: { tailCut: 0 } });
    fixture.detectChanges();
    component.onTypeEntryChange({ id: 'person.job.bishop', value: 'Bishop' });
    await tick();
    expect(component.typeEntryPrefix()).toBe('person:job:bishop:');
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

  //#region type picker
  describe('type picker', () => {
    const TYPES: ThesaurusEntry[] = [
      { id: 'person', value: 'person' },
      { id: 'person.birth', value: 'person: birth' },
      { id: 'person.death', value: 'person: death' },
    ];

    async function set(inputs: Record<string, unknown>): Promise<void> {
      for (const [k, v] of Object.entries(inputs)) {
        fixture.componentRef.setInput(k, v);
      }
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    function picker(): ThesOrTaxoPicker {
      return fixture.debugElement.query(By.directive(ThesOrTaxoPicker))
        .componentInstance;
    }

    it('should default to the event-types thesaurus as a tree', async () => {
      await set({ eventTypeEntries: TYPES });
      expect(component.typePickerSettings()).toEqual({
        mode: 'thesaurus',
        thesaurusView: 'tree',
      });
      expect(component.typeEntries()).toBe(TYPES);
      expect(picker().effectiveMode()).toBe('thesaurus');
      expect(picker().thesView()).toBe('tree');
      expect(picker().thesEntries()).toEqual(TYPES);
    });

    it('should use a tree even for a flat event-types thesaurus by default', async () => {
      await set({ eventTypeEntries: [{ id: 'birth', value: 'birth' }] });
      expect(picker().thesView()).toBe('tree');
    });

    it('should fall back to a textbox without event-types entries', async () => {
      await set({});
      expect(picker().effectiveMode()).toBe('unbound');
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        'cadmus-thes-or-taxo-picker input',
      );
      input.value = 'birth';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.form.type().value()).toBe('birth');
      expect(component.form.type().dirty()).toBe(true);
    });

    it('should show the bound event type without making the form dirty', async () => {
      await set({
        eventTypeEntries: TYPES,
        event: { eid: 'e1', type: 'person.birth' },
      });
      expect(picker().value()).toBe('person.birth');
      expect(picker().valueLabel()).toBe('person: birth');
      expect(component.form().dirty()).toBe(false);
    });

    it('should set the type picked from the thesaurus', async () => {
      await set({ eventTypeEntries: TYPES, event: { eid: 'e1', type: '' } });
      fixture.debugElement
        .query(By.directive(ThesaurusEntryPicker))
        .componentInstance.entryChange.emit(TYPES[2]);
      fixture.detectChanges();
      expect(component.form.type().value()).toBe('person.death');
      expect(component.form.type().dirty()).toBe(true);
      // relations are still filtered by the picked type
      expect(component.typeEntryPrefix()).toBe('person:death:');
    });

    it('should apply settings over the defaults', async () => {
      await set({
        eventTypeEntries: TYPES,
        settings: {
          eventType: {
            mode: 'taxonomy',
            source: 'events',
            canAddNode: true,
            canEditNode: undefined,
          },
        },
      });
      expect(component.typePickerSettings()).toEqual({
        mode: 'taxonomy',
        source: 'events',
        thesaurusView: 'tree',
        canAddNode: true,
      });
      expect(picker().effectiveMode()).toBe('taxonomy');
      const taxo: FakeTaxoStorePicker = fixture.debugElement.query(
        By.directive(FakeTaxoStorePicker),
      ).componentInstance;
      expect(taxo.treeId()).toBe('events');
      expect(taxo.canAdd()).toBe(true);
      expect(taxo.canEdit()).toBe(false);
      expect(taxo.canDelete()).toBe(false);
    });

    it('should set the node key picked from a taxonomy', async () => {
      await set({
        event: { eid: 'e1', type: '' },
        settings: { eventType: { mode: 'taxonomy', source: 'events' } },
      });
      fixture.debugElement
        .query(By.directive(FakeTaxoStorePicker))
        .componentInstance.nodePick.emit({
          id: 1,
          treeId: 'events',
          key: 'person.birth',
          label: 'birth',
        } as TaxoStoreNode);
      fixture.detectChanges();
      expect(component.form.type().value()).toBe('person.birth');
      expect(component.form.type().dirty()).toBe(true);
    });

    it('should load the thesaurus set in settings rather than event-types', async () => {
      await set({
        eventTypeEntries: TYPES,
        settings: {
          eventType: { mode: 'thesaurus', source: 'lod-events@en' },
        },
      });
      expect(component.typeEntries()).toBeUndefined();
      expect(
        TestBed.inject(ThesOrTaxoSourceService).getThesaurusEntries,
      ).toHaveBeenCalledWith('lod-events@en');
    });
  });
  //#endregion

  //#region relations
  describe('relations', () => {
    const RELATIONS: ThesaurusEntry[] = [
      { id: 'person:birth:father', value: 'birth: father' },
      { id: 'person:birth:mother', value: 'birth: mother' },
      { id: 'person:death:place', value: 'death: place' },
      { id: 'birth:witness', value: 'witness' },
    ];
    const FATHER: RelatedEntity = {
      relation: 'person:birth:father',
      id: { target: { gid: 'g1', label: 'Father' } },
    };
    const PLACE: RelatedEntity = {
      relation: 'person:death:place',
      id: { target: { gid: 'g2', label: 'Rome' } },
    };

    async function set(inputs: Record<string, unknown>): Promise<void> {
      for (const [k, v] of Object.entries(inputs)) {
        fixture.componentRef.setInput(k, v);
      }
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    // the related tab is rendered only when selected
    async function showRelatedTab(): Promise<void> {
      const tabs: HTMLElement[] = [
        ...fixture.nativeElement.querySelectorAll('[role="tab"]'),
      ];
      tabs[1].click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    function sourceMock() {
      return TestBed.inject(ThesOrTaxoSourceService) as unknown as {
        getThesaurusEntries: ReturnType<typeof vi.fn>;
      };
    }

    it('should not filter relations when the filter mode is none', async () => {
      await set({
        relationEntries: RELATIONS,
        event: { eid: 'e1', type: 'person.birth' },
        settings: { relationFilter: { mode: 'none' } },
      });
      expect(component.typeEntryPrefix()).toBeUndefined();
      expect(component.currentRelEntries()).toEqual(RELATIONS);
    });

    it('should use custom separators', async () => {
      await set({
        relationEntries: RELATIONS,
        event: { eid: 'e1', type: 'person/birth' },
        settings: {
          relationFilter: { typeSeparator: '/', relationSeparator: ':' },
        },
      });
      expect(component.typeEntryPrefix()).toBe('person:birth:');
      expect(component.currentRelEntries().map((e) => e.id)).toEqual([
        'person:birth:father',
        'person:birth:mother',
      ]);
    });

    it('should get no relations for an unmatched type by default', async () => {
      await set({
        relationEntries: RELATIONS,
        event: { eid: 'e1', type: 'work.creation' },
      });
      expect(component.currentRelEntries()).toEqual([]);
      // so the relation is typed
      expect(component.relatedEntityEntries()).toEqual([]);
    });

    it('should fall back to all relations for an unmatched type when set', async () => {
      await set({
        relationEntries: RELATIONS,
        event: { eid: 'e1', type: 'work.creation' },
        settings: { relationFilter: { fallbackToAll: true } },
      });
      expect(component.currentRelEntries()).toEqual(RELATIONS);
    });

    it('should flag related entities not fitting the event type', async () => {
      await set({
        relationEntries: RELATIONS,
        event: {
          eid: 'e1',
          type: 'person.birth',
          relatedEntities: [FATHER, PLACE],
        },
      });
      expect([...component.mismatchedEntities()]).toEqual([1]);
      await showRelatedTab();
      expect(
        fixture.nativeElement.querySelectorAll('.entity.mismatch').length,
      ).toBe(1);

      // changing the type changes the flagged entities
      component.form.type().value.set('person.death');
      fixture.detectChanges();
      expect([...component.mismatchedEntities()]).toEqual([0]);
    });

    it('should not flag related entities when not filtering', async () => {
      await set({
        relationEntries: RELATIONS,
        event: {
          eid: 'e1',
          type: 'person.birth',
          relatedEntities: [FATHER, PLACE],
        },
        settings: { relationFilter: { mode: 'none' } },
      });
      expect(component.mismatchedEntities().size).toBe(0);
    });

    it('should list related entities with their relation labels', async () => {
      await set({
        relationEntries: RELATIONS,
        event: {
          eid: 'e1',
          type: 'person.birth',
          relatedEntities: [FATHER],
        },
      });
      await showRelatedTab();
      const item: HTMLElement =
        fixture.nativeElement.querySelector('.entity');
      expect(item.querySelector('.entity-relation')!.textContent).toContain(
        'birth: father',
      );
      expect(item.querySelector('.entity-target')!.textContent).toContain(
        'Father',
      );
    });

    it('should pass the filtered relations and settings to the entity editor', async () => {
      await set({
        relationEntries: RELATIONS,
        event: { eid: 'e1', type: 'person.birth' },
      });
      component.addEntity();
      expect(component.editedEntity()?.relation).toBe('person:birth:father');
      await showRelatedTab();
      const editor: RelatedEntityComponent = fixture.debugElement.query(
        By.directive(RelatedEntityComponent),
      ).componentInstance;
      expect(editor.relationEntries()).toEqual([RELATIONS[0], RELATIONS[1]]);
      expect(editor.relationPickerSettings()).toEqual({
        mode: 'thesaurus',
        thesaurusView: 'flat',
      });
    });

    it('should load the relations thesaurus set in settings and filter it', async () => {
      sourceMock().getThesaurusEntries.mockReturnValue(of(RELATIONS));
      await set({
        relationEntries: [{ id: 'other', value: 'other' }],
        event: { eid: 'e1', type: 'person.death' },
        settings: { relation: { mode: 'thesaurus', source: 'lod-rel@en' } },
      });
      expect(sourceMock().getThesaurusEntries).toHaveBeenCalledWith(
        'lod-rel@en',
      );
      expect(component.allRelEntries()).toEqual(RELATIONS);
      expect(component.relatedEntityEntries()).toEqual([RELATIONS[2]]);
    });

    it('should not filter relations picked from a taxonomy', async () => {
      await set({
        relationEntries: RELATIONS,
        event: { eid: 'e1', type: 'person.birth', relatedEntities: [PLACE] },
        settings: { relation: { mode: 'taxonomy', source: 'roles' } },
      });
      expect(component.relationsFromThesaurus()).toBe(false);
      expect(component.typeEntryPrefix()).toBeUndefined();
      expect(component.relatedEntityEntries()).toBeUndefined();
      expect(component.mismatchedEntities().size).toBe(0);
      component.addEntity();
      expect(component.editedEntity()?.relation).toBe('');
    });

    it('should keep editing the same entity after deleting a previous one', () => {
      component.form.relatedEntities().value.set([FATHER, PLACE]);
      component.editEntity(PLACE, 1);
      component.deleteEntity(0);
      expect(component.editedEntityIndex()).toBe(0);
      expect(plain(component.form.relatedEntities().value())).toEqual([PLACE]);
    });

    it('should ignore deleting an out of range entity', () => {
      component.form.relatedEntities().value.set([FATHER]);
      component.deleteEntity(3);
      expect(plain(component.form.relatedEntities().value())).toEqual([
        FATHER,
      ]);
      expect(component.form.relatedEntities().dirty()).toBe(false);
    });

    it('should close the entity editor when a new event is bound', async () => {
      component.editEntity(FATHER, -1);
      await set({ event: { eid: 'e2', type: 't' } });
      expect(component.editedEntity()).toBeUndefined();
    });

    it('should disable adding while an entity is being edited', async () => {
      await set({});
      component.addEntity();
      await showRelatedTab();
      const add: HTMLButtonElement = [
        ...fixture.nativeElement.querySelectorAll('.toolbar button'),
      ][0];
      expect(add.disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('.pending')).toBeTruthy();
    });
  });
  //#endregion

  it('should flag the general tab when it has invalid fields', () => {
    component.form.eid().value.set('');
    fixture.detectChanges();
    expect(component.generalInvalid()).toBe(true);
    component.form.eid().value.set('e1');
    component.form.type().value.set('t');
    fixture.detectChanges();
    expect(component.generalInvalid()).toBe(false);
  });
});
