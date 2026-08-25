import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharTextViewComponent, NumberedChar } from './char-text-view.component';

describe('CharTextViewComponent', () => {
  let component: CharTextViewComponent;
  let fixture: ComponentFixture<CharTextViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharTextViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CharTextViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region rows building
  it('should have no rows when lines is empty', () => {
    expect(component.rows()).toEqual([]);
  });

  it('should build a row of chars with default colors for each line', () => {
    fixture.componentRef.setInput('lines', ['ab']);
    fixture.detectChanges();

    const rows = component.rows();
    expect(rows.length).toBe(1);
    expect(rows[0].length).toBe(2);
    expect(rows[0][0]).toMatchObject({
      n: 1,
      value: 'a',
      color: component.defaultColor(),
      borderColor: component.defaultBorderColor(),
    });
    expect(rows[0][1]).toMatchObject({
      n: 2,
      value: 'b',
    });
  });

  it('should build one row per input line', () => {
    fixture.componentRef.setInput('lines', ['ab', 'cde']);
    fixture.detectChanges();

    const rows = component.rows();
    expect(rows.length).toBe(2);
    expect(rows[0].length).toBe(2);
    expect(rows[1].length).toBe(3);
  });

  it('should use colorCallback/borderColorCallback results, falling back to defaults when they return null', () => {
    fixture.componentRef.setInput(
      'colorCallback',
      (c: string) => (c === 'a' ? '#111111' : null),
    );
    fixture.componentRef.setInput(
      'borderColorCallback',
      (c: string) => (c === 'a' ? '#222222' : null),
    );
    fixture.componentRef.setInput('lines', ['ab']);
    fixture.detectChanges();

    const [a, b] = component.rows()[0];
    expect(a.color).toBe('#111111');
    expect(a.borderColor).toBe('#222222');
    // 'b' falls back to defaults since the callbacks return null for it
    expect(b.color).toBe(component.defaultColor());
    expect(b.borderColor).toBe(component.defaultBorderColor());
  });
  //#endregion

  //#region onCharClick: single selection
  it('should select a clicked char, saving its old colors and using selectionColor', () => {
    fixture.componentRef.setInput('lines', ['abc']);
    fixture.detectChanges();

    const charPicks: NumberedChar[] = [];
    component.charPick.subscribe((c) => charPicks.push(c));

    const target = component.rows()[0][0];
    const originalColor = target.color;
    component.onCharClick({ n: target.n, value: target.value });

    const updated = component.rows()[0][0];
    expect(updated.color).toBe(component.selectionColor());
    expect(updated.borderColor).toBe(component.selectionColor());
    expect(updated.oldColor).toBe(originalColor);
    expect(charPicks).toEqual([{ n: 1, value: 'a' }]);
  });

  it('should reset the previously selected char colors when a new char is clicked (no ctrl)', () => {
    fixture.componentRef.setInput('lines', ['abc']);
    fixture.detectChanges();

    component.onCharClick({ n: 1, value: 'a' });
    const defaultColor = component.defaultColor();
    component.onCharClick({ n: 2, value: 'b' });

    const row = component.rows()[0];
    // 'a' reverted to its default color
    expect(row[0].color).toBe(defaultColor);
    // 'b' is now selected
    expect(row[1].color).toBe(component.selectionColor());
  });

  it('should do nothing when the clicked char is not found in rows', () => {
    fixture.componentRef.setInput('lines', ['abc']);
    fixture.detectChanges();
    const before = component.rows();

    const charPicks: NumberedChar[] = [];
    component.charPick.subscribe((c) => charPicks.push(c));

    component.onCharClick({ n: 99, value: 'z' });

    expect(component.rows()).toEqual(before);
    expect(charPicks).toEqual([]);
  });
  //#endregion

  //#region onCharClick: range selection
  it('should treat a ctrl+click as a single selection when there is no previously selected char', () => {
    fixture.componentRef.setInput('lines', ['abc']);
    fixture.detectChanges();

    const rangePicks: NumberedChar[][] = [];
    component.rangePick.subscribe((r) => rangePicks.push(r));

    component.onCharClick(
      { n: 1, value: 'a' },
      { ctrlKey: true } as MouseEvent,
    );

    expect(rangePicks).toEqual([]);
    expect(component.rows()[0][0].color).toBe(component.selectionColor());
  });

  it('should select a range within the same row on ctrl+click after a prior selection', () => {
    fixture.componentRef.setInput('lines', ['abcd']);
    fixture.detectChanges();

    const rangePicks: NumberedChar[][] = [];
    component.rangePick.subscribe((r) => rangePicks.push(r));

    component.onCharClick({ n: 1, value: 'a' });
    component.onCharClick(
      { n: 4, value: 'd' },
      { ctrlKey: true } as MouseEvent,
    );

    expect(rangePicks).toEqual([
      [
        { n: 1, value: 'a' },
        { n: 2, value: 'b' },
        { n: 3, value: 'c' },
        { n: 4, value: 'd' },
      ],
    ]);
    const row = component.rows()[0];
    for (const c of row) {
      expect(c.color).toBe(component.selectionColor());
    }
  });

  it('should select a range spanning multiple rows on ctrl+click', () => {
    fixture.componentRef.setInput('lines', ['ab', 'cd']);
    fixture.detectChanges();

    const rangePicks: NumberedChar[][] = [];
    component.rangePick.subscribe((r) => rangePicks.push(r));

    // select 'b' (row 0, index 1)
    component.onCharClick({ n: 2, value: 'b' });
    // ctrl+click 'c' (row 1, index 0)
    component.onCharClick(
      { n: 1, value: 'c' },
      { ctrlKey: true } as MouseEvent,
    );

    expect(rangePicks).toEqual([
      [
        { n: 2, value: 'b' },
        { n: 1, value: 'c' },
      ],
    ]);
    const rows = component.rows();
    // row 0: only 'b' (index 1) is selected, 'a' (index 0) is not
    expect(rows[0][0].color).toBe(component.defaultColor());
    expect(rows[0][1].color).toBe(component.selectionColor());
    // row 1: only 'c' (index 0) is selected, 'd' (index 1) is not
    expect(rows[1][0].color).toBe(component.selectionColor());
    expect(rows[1][1].color).toBe(component.defaultColor());
  });
  //#endregion

  //#region lines change resets selection state
  it('should clear the selected/range colors when lines change', () => {
    fixture.componentRef.setInput('lines', ['abc']);
    fixture.detectChanges();

    component.onCharClick({ n: 1, value: 'a' });
    expect(component.rows()[0][0].color).toBe(component.selectionColor());

    // changing lines rebuilds rows from scratch with default colors, and
    // resets the internally tracked last-selected char
    fixture.componentRef.setInput('lines', ['abc']);
    fixture.detectChanges();

    expect(component.rows()[0][0].color).toBe(component.defaultColor());

    // a subsequent ctrl+click now behaves as a fresh single selection
    // (not a range), confirming the last-selected-char state was reset
    const rangePicks: NumberedChar[][] = [];
    component.rangePick.subscribe((r) => rangePicks.push(r));
    component.onCharClick(
      { n: 2, value: 'b' },
      { ctrlKey: true } as MouseEvent,
    );
    expect(rangePicks).toEqual([]);
  });
  //#endregion
});
