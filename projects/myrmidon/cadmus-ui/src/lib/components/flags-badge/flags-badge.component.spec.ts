import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagsBadgeComponent, FlagsBadgeData } from './flags-badge.component';
import { FlagDefinition } from '@myrmidon/cadmus-core';

function makeFlag(id: number, overrides?: Partial<FlagDefinition>): FlagDefinition {
  return {
    id,
    label: `flag${id}`,
    description: '',
    colorKey: 'ff0000',
    ...overrides,
  };
}

describe('FlagsBadgeComponent', () => {
  let component: FlagsBadgeComponent;
  let fixture: ComponentFixture<FlagsBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagsBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagsBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with no badge flags initially', () => {
    expect(component).toBeTruthy();
    expect(component.badgeFlags()).toEqual([]);
  });

  it('should keep only the flags whose bit is set', () => {
    const definitions = [makeFlag(1), makeFlag(2), makeFlag(4)];
    fixture.componentRef.setInput('data', {
      definitions,
      flags: 1 | 4,
    } as FlagsBadgeData);
    fixture.detectChanges();

    expect(component.badgeFlags().map((f) => f.id)).toEqual([1, 4]);
  });

  it('should return no flags when the bitmask matches none', () => {
    const definitions = [makeFlag(1), makeFlag(2)];
    fixture.componentRef.setInput('data', {
      definitions,
      flags: 0,
    } as FlagsBadgeData);
    fixture.detectChanges();

    expect(component.badgeFlags()).toEqual([]);
  });

  it('should render one span per matching flag', () => {
    const definitions = [makeFlag(1), makeFlag(2)];
    fixture.componentRef.setInput('data', {
      definitions,
      flags: 1 | 2,
    } as FlagsBadgeData);
    fixture.detectChanges();

    const spans = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.badge-flag'
    );
    expect(spans.length).toBe(2);
  });

  it('should leave badgeFlags untouched when data is undefined', () => {
    fixture.componentRef.setInput('data', {
      definitions: [makeFlag(1)],
      flags: 1,
    } as FlagsBadgeData);
    fixture.detectChanges();
    expect(component.badgeFlags().length).toBe(1);

    fixture.componentRef.setInput('data', undefined);
    fixture.detectChanges();
    // updateBadge() returns early on a falsy data, so the previous value
    // is not cleared
    expect(component.badgeFlags().length).toBe(1);
  });
});
