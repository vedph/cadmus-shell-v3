import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissingPartsComponent } from './missing-parts.component';
import { PartDefinition, Part } from '@myrmidon/cadmus-core';

function makeDef(overrides?: Partial<PartDefinition>): PartDefinition {
  return { typeId: 'it.vedph.note', name: 'Note', ...overrides };
}

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    itemId: 'item1',
    typeId: 'it.vedph.note',
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

describe('MissingPartsComponent', () => {
  let component: MissingPartsComponent;
  let fixture: ComponentFixture<MissingPartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissingPartsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MissingPartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with no missing definitions', () => {
    expect(component).toBeTruthy();
    expect(component.missingDefinitions()).toEqual([]);
  });

  it('should list required definitions that have no matching part', () => {
    fixture.componentRef.setInput('partDefinitions', [
      makeDef({ typeId: 'it.vedph.note', isRequired: true }),
      makeDef({ typeId: 'it.vedph.date', isRequired: false }),
    ]);
    fixture.componentRef.setInput('parts', []);
    fixture.detectChanges();

    expect(component.missingDefinitions().map((d) => d.typeId)).toEqual([
      'it.vedph.note',
    ]);
  });

  it('should not report a required definition that has a matching part', () => {
    fixture.componentRef.setInput('partDefinitions', [
      makeDef({ typeId: 'it.vedph.note', isRequired: true }),
    ]);
    fixture.componentRef.setInput('parts', [makePart()]);
    fixture.detectChanges();

    expect(component.missingDefinitions()).toEqual([]);
  });

  it('should match required definitions by role as well as type', () => {
    fixture.componentRef.setInput('partDefinitions', [
      makeDef({
        typeId: 'it.vedph.token-text-layer',
        roleId: 'fr.it.vedph.comment',
        isRequired: true,
      }),
    ]);
    fixture.componentRef.setInput('parts', [
      makePart({ typeId: 'it.vedph.token-text-layer', roleId: 'fr.it.vedph.other' }),
    ]);
    fixture.detectChanges();

    expect(component.missingDefinitions().length).toBe(1);
  });

  it('should emit addRequest when requestAddPart is called', () => {
    const def = makeDef();
    const spy = vi.fn();
    component.addRequest.subscribe(spy);
    component.requestAddPart(def);
    expect(spy).toHaveBeenCalledWith(def);
  });
});
