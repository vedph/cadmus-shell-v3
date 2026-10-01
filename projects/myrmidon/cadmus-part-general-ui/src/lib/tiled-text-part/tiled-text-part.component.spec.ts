import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EditedObject } from '@myrmidon/cadmus-core';

import { TextTileComponent } from '../text-tile/text-tile.component';
import { TiledDataComponent } from '../tiled-data/tiled-data.component';
import { TiledTextPartComponent } from './tiled-text-part.component';
import { TiledTextPart, TextTileRow, TextTile } from '../tiled-text-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function buildRow(y: number, tiles: TextTile[]): TextTileRow {
  return { y, tiles };
}

function buildPart(rows: TextTileRow[]): TiledTextPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.tiled-text',
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    citation: 'cit',
    rows,
  };
}

describe('TiledTextPartComponent', () => {
  let component: TiledTextPartComponent;
  let fixture: ComponentFixture<TiledTextPartComponent>;
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };
  let appRepository: { getTypeThesaurus: ReturnType<typeof vi.fn>; getSettingFor: ReturnType<typeof vi.fn> };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };
    dialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [
        FormField,
        TiledDataComponent,
        TextTileComponent,
        TiledTextPartComponent,
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TiledTextPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region onDataSet / updateForm
  it('should reset the form when data has no value', () => {
    component.form.citation().value.set('x');
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.form.citation().value()).toBe('');
  });

  it('should populate citation and rows from the part', () => {
    const part = buildPart([buildRow(1, [{ x: 1, data: { text: 'a' } }])]);
    const data: EditedObject<TiledTextPart> = { value: part, thesauri: {} };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.citation().value())).toBe('cit');
    expect(plain(component.form.rows().value())).toEqual(part.rows);
    expect(component.form().dirty()).toBe(false);
  });

  it('should default rows to [] and citation to null when missing', () => {
    const part = buildPart([]);
    part.citation = undefined;
    const data: EditedObject<TiledTextPart> = { value: part, thesauri: {} };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.form.citation().value()).toBe('');
    expect(plain(component.form.rows().value())).toEqual([]);
  });
  //#endregion

  //#region getValue
  it('getValue should trim citation and adjust coordinates', () => {
    const part = buildPart([
      buildRow(5, [{ x: 9, data: {} }]),
      buildRow(2, [{ x: 3, data: {} }]),
    ]);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();
    component.form.citation().value.set('  new citation  ');

    const value = (component as any).getValue() as TiledTextPart;
    expect(value.citation).toBe('new citation');
    // adjustCoords should have renumbered y=1,2 and x=1 for each row
    expect(value.rows[0].y).toBe(1);
    expect(value.rows[0].tiles[0].x).toBe(1);
    expect(value.rows[1].y).toBe(2);
    expect(value.rows[1].tiles[0].x).toBe(1);
  });

  it('getValue should set citation to undefined when blank', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.form.citation().value.set('   ');
    const value = (component as any).getValue() as TiledTextPart;
    expect(value.citation).toBeUndefined();
  });
  //#endregion

  //#region addRow / addTile
  it('addRow should append a row with one tile at x=1', () => {
    component.form.rows().value.set([buildRow(1, [{ x: 1, data: {} }])]);
    component.addRow();
    expect(component.form.rows().value().length).toBe(2);
    const newRow = component.form.rows().value()[1];
    expect(newRow.y).toBe(2);
    expect(newRow.tiles).toEqual([{ x: 1, data: { text: 'text1' } }]);
    expect(component.form.rows().dirty()).toBe(true);
  });

  it('addTile should append a tile with x = tiles.length + 1', () => {
    const row = buildRow(1, [{ x: 1, data: { text: 'text1' } }]);
    component.form.rows().value.set([row]);
    component.addTile(row);
    const updatedRow = component.form.rows().value()[0];
    expect(updatedRow.tiles.length).toBe(2);
    expect(updatedRow.tiles[1]).toEqual({ x: 2, data: { text: 'text2' } });
  });

  it('addTile should handle a row with no tiles yet', () => {
    const row = { y: 1, tiles: undefined } as unknown as TextTileRow;
    component.form.rows().value.set([row]);
    component.addTile(row);
    const updatedRow = component.form.rows().value()[0];
    expect(updatedRow.tiles).toEqual([{ x: 1, data: { text: 'text1' } }]);
  });
  //#endregion

  //#region deleteSelectedTile
  it('deleteSelectedTile should do nothing when no tile is selected', () => {
    const rows = [buildRow(1, [{ x: 1, data: {} }])];
    component.form.rows().value.set(rows);
    component.deleteSelectedTile();
    expect(component.form.rows().value()[0].tiles.length).toBe(1);
  });

  it('deleteSelectedTile should select the next tile after removal', () => {
    const t1: TextTile = { x: 1, data: {} };
    const t2: TextTile = { x: 2, data: {} };
    const t3: TextTile = { x: 3, data: {} };
    const row = buildRow(1, [t1, t2, t3]);
    component.form.rows().value.set([row]);
    component.selectedTile.set(t2);

    component.deleteSelectedTile();

    // deleteSelectedTile also calls adjustCoords(), which renumbers the
    // surviving tiles' x by position (1-based), so we assert on the
    // renumbered values rather than the original t1/t3 objects.
    expect(component.form.rows().value()[0].tiles).toEqual([
      { x: 1, data: {} },
      { x: 2, data: {} },
    ]);
    // t2 removed at index 1: t3 takes its place, and is selected; it got
    // a new x, so it is a new object
    const tiles = component.form.rows().value()[0].tiles;
    expect(component.selectedTile()).toBe(tiles[1]);
    expect(component.selectedTile()!.x).toBe(2);
  });

  it('deleteSelectedTile should select the tile that shifted into the deleted slot when available', () => {
    const t1: TextTile = { x: 1, data: {} };
    const t2: TextTile = { x: 2, data: {} };
    const t3: TextTile = { x: 3, data: { text: 't3' } };
    const t4: TextTile = { x: 4, data: {} };
    const row = buildRow(1, [t1, t2, t3, t4]);
    component.form.rows().value.set([row]);
    component.selectedTile.set(t2);

    component.deleteSelectedTile();

    // t2 removed at index 1: t3 takes its place and is selected (it was
    // renumbered, so it is a new object with x=2)
    const tiles = component.form.rows().value()[0].tiles;
    expect(component.selectedTile()).toBe(tiles[1]);
    expect(plain(component.selectedTile())).toEqual({ x: 2, data: { text: 't3' } });
    expect(tiles.length).toBe(3);
  });

  it('deleteSelectedTile should clear selection when the row becomes empty', () => {
    const t1: TextTile = { x: 1, data: {} };
    const row = buildRow(1, [t1]);
    component.form.rows().value.set([row]);
    component.selectedTile.set(t1);

    component.deleteSelectedTile();

    expect(component.form.rows().value()[0].tiles).toEqual([]);
    expect(component.selectedTile()).toBeUndefined();
  });
  //#endregion

  //#region deleteRow
  it('deleteRow should remove the row when confirmed', () => {
    dialogService.confirm.mockReturnValue(of(true));
    const rows = [buildRow(1, [{ x: 1, data: {} }]), buildRow(2, [{ x: 1, data: {} }])];
    component.form.rows().value.set(rows);

    component.deleteRow(0);

    expect(component.form.rows().value().length).toBe(1);
    expect(dialogService.confirm).toHaveBeenCalled();
  });

  it('deleteRow should keep the row when not confirmed', () => {
    dialogService.confirm.mockReturnValue(of(false));
    const rows = [buildRow(1, [{ x: 1, data: {} }])];
    component.form.rows().value.set(rows);

    component.deleteRow(0);

    expect(component.form.rows().value().length).toBe(1);
  });
  //#endregion

  //#region moveRowUp / moveRowDown
  it('moveRowUp should do nothing for the first row', () => {
    const rows = [buildRow(1, []), buildRow(2, [])];
    component.form.rows().value.set(rows);
    component.moveRowUp(0);
    expect(plain(component.form.rows().value())).toEqual(rows);
  });

  it('moveRowUp should swap the row with the previous one', () => {
    const r1 = buildRow(1, [{ x: 1, data: { n: 1 } }]);
    const r2 = buildRow(2, [{ x: 1, data: { n: 2 } }]);
    component.form.rows().value.set([r1, r2]);
    component.moveRowUp(1);
    expect(component.form.rows().value()[0].tiles[0].data).toEqual({ n: 2 });
    expect(component.form.rows().value()[1].tiles[0].data).toEqual({ n: 1 });
    // adjustCoords renumbers y sequentially
    expect(component.form.rows().value()[0].y).toBe(1);
    expect(component.form.rows().value()[1].y).toBe(2);
  });

  it('moveRowDown should do nothing for the last row', () => {
    const rows = [buildRow(1, []), buildRow(2, [])];
    component.form.rows().value.set(rows);
    component.moveRowDown(1);
    expect(plain(component.form.rows().value())).toEqual(rows);
  });

  it('moveRowDown should swap the row with the next one', () => {
    const r1 = buildRow(1, [{ x: 1, data: { n: 1 } }]);
    const r2 = buildRow(2, [{ x: 1, data: { n: 2 } }]);
    component.form.rows().value.set([r1, r2]);
    component.moveRowDown(0);
    expect(component.form.rows().value()[0].tiles[0].data).toEqual({ n: 2 });
    expect(component.form.rows().value()[1].tiles[0].data).toEqual({ n: 1 });
  });
  //#endregion

  //#region drop
  it('drop should move a tile within the row and mark the form dirty', () => {
    const t1: TextTile = { x: 1, data: {} };
    const t2: TextTile = { x: 2, data: {} };
    const row = buildRow(1, [t1, t2]);
    component.form.rows().value.set([row]);

    component.drop({ previousIndex: 0, currentIndex: 1 } as any, row);

    // moved and renumbered
    expect(plain(component.form.rows().value()[0].tiles)).toEqual([
      { x: 1, data: {} },
      { x: 2, data: {} },
    ]);
    expect(component.form.rows().value()[0].tiles[0]).not.toBe(t1);
    expect(component.form().dirty()).toBe(true);
  });
  //#endregion

  it('onTileChange should store the edited tile and mark the form dirty', () => {
    const t1: TextTile = { x: 1, data: { text: 'a' } };
    const t2: TextTile = { x: 2, data: { text: 'b' } };
    component.form.rows().value.set([buildRow(1, [t1, t2])]);
    component.selectedTile.set(t2);
    expect(component.form().dirty()).toBe(false);

    const edited: TextTile = { x: 2, data: { text: 'edited' } };
    component.onTileChange(t2, edited);

    expect(component.form().dirty()).toBe(true);
    expect(component.form.rows().value()[0].tiles[1]).toBe(edited);
    expect(component.selectedTile()).toBe(edited);
  });

  it('should save a tile text edited in the tile', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([buildRow(1, [{ x: 1, data: { text: 'old' } }])]),
      thesauri: {},
    });
    fixture.detectChanges();
    const tile = component.form.rows().value()[0].tiles[0];

    component.onTileChange(tile, { ...tile, data: { text: 'new' } });
    component.save();

    expect(component.data()!.value!.rows[0].tiles[0].data).toEqual({
      text: 'new',
    });
  });

  //#region editRowData / editTileData / closeDataEditor
  it('editRowData should populate editedData/editedDataTitle and switch tab', () => {
    const row = buildRow(3, [{ x: 1, data: { k: 'v' } }]);
    row.data = { rowKey: 'rowVal' };
    component.editRowData(row);

    expect(component.editedDataTitle()).toBe('Row 3');
    expect(component.editedData()).toEqual({ rowKey: 'rowVal' });
    expect(component.currentTabIndex()).toBe(1);
  });

  it('editTileData should populate editedData/editedDataTitle using tile coords', () => {
    const t1: TextTile = { x: 2, data: { k: 'v' } };
    const row = buildRow(1, [t1]);
    component.form.rows().value.set([row]);

    component.editTileData(t1);

    expect(component.editedDataTitle()).toBe('Tile 1,2');
    expect(component.editedData()).toEqual({ k: 'v' });
    expect(component.currentTabIndex()).toBe(1);
  });

  it('closeDataEditor should clear editor state and switch back to tab 0', () => {
    const t1: TextTile = { x: 1, data: {} };
    component.form.rows().value.set([buildRow(1, [t1])]);
    component.editTileData(t1);

    component.closeDataEditor();

    expect(component.currentTabIndex()).toBe(0);
    expect(component.editedDataTitle()).toBeUndefined();
    expect(component.editedData()).toBeUndefined();
  });
  //#endregion

  //#region saveEditedData (regression test for the tile-data-not-saved bug)
  it('saveEditedData should persist edited TILE data back into the correct tile', () => {
    const t1: TextTile = { x: 1, data: { text: 'one' } };
    const t2: TextTile = { x: 2, data: { text: 'two' } };
    const row1 = buildRow(1, [t1]);
    const row2 = buildRow(2, [t2]);
    component.form.rows().value.set([row1, row2]);

    component.editTileData(t2);
    component.saveEditedData({ text: 'two-edited' });

    // the tile in row2 (matching x=2) must have the new data...
    expect(component.form.rows().value()[1].tiles[0].data).toEqual({
      text: 'two-edited',
    });
    // ...while the tile in row1 must be untouched
    expect(component.form.rows().value()[0].tiles[0].data).toEqual({ text: 'one' });
    expect(component.form().dirty()).toBe(true);
    // editor should close after saving
    expect(component.currentTabIndex()).toBe(0);
  });

  it('saveEditedData should not confuse two tiles sharing the same x in different rows', () => {
    const rowATile: TextTile = { x: 1, data: { text: 'rowA-x1' } };
    const rowBTile: TextTile = { x: 1, data: { text: 'rowB-x1' } };
    const rowA = buildRow(1, [rowATile]);
    const rowB = buildRow(2, [rowBTile]);
    component.form.rows().value.set([rowA, rowB]);

    component.editTileData(rowBTile);
    component.saveEditedData({ text: 'rowB-x1-edited' });

    expect(component.form.rows().value()[0].tiles[0].data).toEqual({
      text: 'rowA-x1',
    });
    expect(component.form.rows().value()[1].tiles[0].data).toEqual({
      text: 'rowB-x1-edited',
    });
  });

  it('saveEditedData should persist edited ROW data', () => {
    const row1 = buildRow(1, [{ x: 1, data: {} }]);
    row1.data = { note: 'old' };
    const row2 = buildRow(2, [{ x: 1, data: {} }]);
    component.form.rows().value.set([row1, row2]);

    component.editRowData(row1);
    component.saveEditedData({ note: 'new' });

    expect(component.form.rows().value()[0].data).toEqual({ note: 'new' });
    expect(component.form.rows().value()[1]).toEqual(row2);
  });
  //#endregion

  //#region getTileCoords
  it('getTileCoords should return an empty string with no tile and no selection', () => {
    expect(component.getTileCoords()).toBe('');
  });

  it('getTileCoords should use the currently selected tile when none is passed', () => {
    const t1: TextTile = { x: 4, data: {} };
    component.form.rows().value.set([buildRow(1, [{ x: 1, data: {} }]), buildRow(2, [t1])]);
    component.selectedTile.set(t1);
    expect(component.getTileCoords()).toBe('2,4');
  });

  it('getTileCoords should locate the given tile explicitly', () => {
    const t1: TextTile = { x: 7, data: {} };
    component.form.rows().value.set([buildRow(1, [t1])]);
    expect(component.getTileCoords(t1)).toBe('1,7');
  });
  //#endregion

  it('should render its editor and buttons inside no <form>', () => {
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });
});
