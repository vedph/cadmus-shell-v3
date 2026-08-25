import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { CurrentItemBarComponent } from './current-item-bar.component';
import { EditedItemRepository } from '../state/edited-item.repository';
import { Item } from '@myrmidon/cadmus-core';

function makeItem(overrides?: Partial<Item>): Item {
  return {
    id: 'item1',
    title: 'Item 1',
    description: '',
    facetId: 'facet1',
    groupId: '',
    sortKey: '',
    flags: 0,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

describe('CurrentItemBarComponent', () => {
  let component: CurrentItemBarComponent;
  let fixture: ComponentFixture<CurrentItemBarComponent>;
  let item$: BehaviorSubject<Item | undefined>;

  beforeEach(async () => {
    item$ = new BehaviorSubject<Item | undefined>(undefined);
    await TestBed.configureTestingModule({
      imports: [CurrentItemBarComponent],
      providers: [{ provide: EditedItemRepository, useValue: { item$ } }],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrentItemBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reflect the repository item$ as undefined initially', () => {
    expect(component.item()).toBeUndefined();
  });

  it('should update when the repository emits a new item', () => {
    const item = makeItem();
    item$.next(item);
    expect(component.item()).toEqual(item);
  });

  it('should render the item title in the template', () => {
    item$.next(makeItem({ title: 'My Title' }));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('My Title');
  });
});
