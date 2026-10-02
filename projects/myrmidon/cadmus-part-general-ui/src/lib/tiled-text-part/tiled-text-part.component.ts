import {
  ChangeDetectionStrategy,
  Component,
  signal,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';
import { FormField, maxLength } from '@angular/forms/signals';

import {
  CdkDragDrop,
  moveItemInArray,
  CdkDropListGroup,
  CdkDropList,
  CdkDrag,
  CdkDragPlaceholder,
} from '@angular/cdk/drag-drop';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { TextTileComponent } from '../text-tile/text-tile.component';
import { TiledDataComponent } from '../tiled-data/tiled-data.component';
import {
  TiledTextPart,
  TextTileRow,
  TILED_TEXT_PART_TYPEID,
  TEXT_TILE_TEXT_DATA_NAME,
  TextTile,
} from '../tiled-text-part';

interface Data {
  [key: string]: any;
}

interface TiledTextPartControls {
  citation: string;
  rows: TextTileRow[];
}

function toDraft(part?: TiledTextPart | null): TiledTextPartControls {
  return {
    citation: part?.citation || '',
    rows: copyFormValue(part?.rows || []),
  };
}

/**
 * Get the specified rows with their coordinates recalculated according to
 * their position. Rows and tiles whose coordinates are already correct are
 * kept as they are.
 * @param rows The rows.
 * @param replaced The map receiving each replaced tile with its replacement.
 * @returns The rows.
 */
function withCoords(
  rows: TextTileRow[],
  replaced?: Map<TextTile, TextTile>,
): TextTileRow[] {
  return rows.map((row, i) => {
    let changed = row.y !== i + 1;
    const tiles = row.tiles?.map((tile, j) => {
      if (tile.x === j + 1) {
        return tile;
      }
      changed = true;
      const t = { ...tile, x: j + 1 };
      replaced?.set(tile, t);
      return t;
    });
    return changed ? { ...row, y: i + 1, tiles } : row;
  });
}

@Component({
  selector: 'cadmus-tiled-text-part',
  templateUrl: './tiled-text-part.component.html',
  styleUrls: ['./tiled-text-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatTabGroup,
    MatTab,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    CdkDropListGroup,
    CdkDropList,
    TextTileComponent,
    CdkDrag,
    CdkDragPlaceholder,
    MatIconButton,
    MatTooltip,
    MatCardActions,
    TitleCasePipe,
    TiledDataComponent,
    CloseSaveButtonsComponent,
  ],
})
export class TiledTextPartComponent extends ModelEditorComponentBase<TiledTextPart> {
  private _editedDataTile?: TextTile;
  private _editedDataRow?: TextTileRow;
  // the ORIGINAL (non-cloned) tile object currently being edited, kept
  // alongside _editedDataTile (a structuredClone used only for display/
  // editing) so that saveEditedData() can find the exact tile to replace
  // by reference. See saveEditedData() for why this is required.
  private _editedTileRef?: TextTile;

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    maxLength(p.citation, 1000);
  });

  public readonly selectedTile = signal<TextTile | undefined>(undefined);
  public readonly editedData = signal<Data | undefined>(undefined);
  public readonly editedDataTitle = signal<string | undefined>(undefined);
  public readonly currentTabIndex = signal<number>(0);

  constructor(private _dialogService: DialogService) {
    super();
  }

  /**
   * Set the rows, recalculating their coordinates, and mark them as dirty.
   * A selected tile replaced because of its new coordinates stays selected.
   * @param rows The rows.
   */
  private setRows(rows: TextTileRow[]): void {
    const replaced = new Map<TextTile, TextTile>();
    this.form.rows().value.set(withCoords(rows, replaced));
    this.form.rows().markAsDirty();
    const selected = this.selectedTile();
    if (selected && replaced.has(selected)) {
      this.selectedTile.set(replaced.get(selected));
    }
  }

  protected getValue(): TiledTextPart {
    const draft = this._draft();
    let part = this.getEditedPart(TILED_TEXT_PART_TYPEID) as TiledTextPart;
    part.citation = draft.citation.trim() || undefined;
    // ensure that coordinates are ok
    part.rows = copyFormValue(withCoords(draft.rows));
    return part;
  }

  /**
   * Append a new row at the bottom.
   */
  public addRow(): void {
    const data: { [key: string]: any } = {};
    data[TEXT_TILE_TEXT_DATA_NAME] = 'text1';
    const rows = this.form.rows().value();
    this.setRows([
      ...rows,
      {
        y: rows.length + 1,
        tiles: [
          {
            x: 1,
            data: data,
          },
        ],
      },
    ]);
  }

  /**
   * Append a new tile at the end of the specified row.
   * @param row The row to add the tile to.
   */
  public addTile(row: TextTileRow): void {
    const x = row.tiles ? row.tiles.length + 1 : 1;
    const data: { [key: string]: any } = {};
    data[TEXT_TILE_TEXT_DATA_NAME] = 'text' + x;
    const tiles = row.tiles ? [...row.tiles, { x, data }] : [{ x, data }];
    this.setRows(
      this.form
        .rows()
        .value()
        .map((r) => (r === row ? { ...r, tiles } : r)),
    );
  }

  /**
   * Delete the selected tile, if any. The tile which takes its place, if
   * any, is selected; else the tile preceding it, if any.
   */
  public deleteSelectedTile(): void {
    const selected = this.selectedTile();
    if (!selected) {
      return;
    }
    const rows = this.form.rows().value();
    for (let i = 0; i < rows.length; i++) {
      const index = rows[i].tiles?.indexOf(selected) ?? -1;
      if (index > -1) {
        const tiles = rows[i].tiles.filter((_, j) => j !== index);
        this.setRows(rows.map((r, n) => (n === i ? { ...r, tiles } : r)));
        const newTiles = this.form.rows().value()[i].tiles;
        this.selectedTile.set(
          index < newTiles.length
            ? newTiles[index]
            : newTiles.length > 0
              ? newTiles[index - 1]
              : undefined,
        );
        break;
      }
    }
  }

  /**
   * Delete the row at the specified index.
   * @param rowIndex The row's index.
   */
  public deleteRow(rowIndex: number): void {
    this._dialogService
      .confirm('Confirm Deletion', `Delete row #"${rowIndex + 1}"?`)
      .subscribe((ok: boolean) => {
        if (!ok) {
          return;
        }
        const rows = [...this.form.rows().value()];
        rows.splice(rowIndex, 1);
        this.setRows(rows);
      });
  }

  /**
   * Move the row at the specified index up.
   * @param rowIndex The row index.
   */
  public moveRowUp(rowIndex: number): void {
    if (rowIndex < 1) {
      return;
    }
    const rows = [...this.form.rows().value()];
    moveItemInArray(rows, rowIndex, rowIndex - 1);
    this.setRows(rows);
  }

  /**
   * Move the row at the specified index down.
   * @param rowIndex The row index.
   */
  public moveRowDown(rowIndex: number): void {
    if (rowIndex + 1 >= this.form.rows().value().length) {
      return;
    }
    const rows = [...this.form.rows().value()];
    moveItemInArray(rows, rowIndex, rowIndex + 1);
    this.setRows(rows);
  }

  public drop(event: CdkDragDrop<TextTile[]>, row: TextTileRow): void {
    const tiles = [...row.tiles];
    moveItemInArray(tiles, event.previousIndex, event.currentIndex);
    this.setRows(
      this.form
        .rows()
        .value()
        .map((r) => (r === row ? { ...r, tiles } : r)),
    );
  }

  /**
   * Replace a tile with its edited version, e.g. after its text was edited.
   * @param oldTile The tile being replaced.
   * @param tile The new tile.
   */
  public onTileChange(oldTile: TextTile, tile: TextTile): void {
    this.setRows(
      this.form
        .rows()
        .value()
        .map((r) =>
          r.tiles?.includes(oldTile)
            ? { ...r, tiles: r.tiles.map((t) => (t === oldTile ? tile : t)) }
            : r,
        ),
    );
    if (this.selectedTile() === oldTile) {
      this.selectedTile.set(tile);
    }
  }

  public editRowData(row: TextTileRow): void {
    this._editedDataRow = structuredClone(row);
    this._editedDataTile = undefined;
    this._editedTileRef = undefined;
    this.editedDataTitle.set(`Row ${row.y}`);
    this.editedData.set(this._editedDataRow?.data);
    this.currentTabIndex.set(1);
  }

  public editTileData(tile: TextTile): void {
    this._editedTileRef = tile;
    this._editedDataTile = structuredClone(tile);
    this._editedDataRow = undefined;
    this.editedDataTitle.set(`Tile ${this.getTileCoords(tile)}`);
    this.editedData.set(this._editedDataTile?.data);
    this.currentTabIndex.set(1);
  }

  public closeDataEditor(): void {
    this.currentTabIndex.set(0);
    this._editedDataRow = undefined;
    this._editedDataTile = undefined;
    this._editedTileRef = undefined;
    this.editedDataTitle.set(undefined);
    this.editedData.set(undefined);
  }

  public saveEditedData(data: Data): void {
    if (this._editedDataTile && this._editedTileRef) {
      // Find and replace the tile in the rows array immutably.
      // We must match by reference to the ORIGINAL (non-cloned) tile
      // object (_editedTileRef), NOT by comparing t.data to
      // this._editedDataTile.data: the latter was deep-cloned in
      // editTileData() via structuredClone(), so its `data` object can
      // never be === to the `data` object still referenced by the tile
      // inside the rows.
      this.setRows(
        this.form
          .rows()
          .value()
          .map((row) => {
            if (row.tiles && row.tiles.includes(this._editedTileRef!)) {
              const tiles = row.tiles.map((t) =>
                t === this._editedTileRef ? { ...t, data } : t,
              );
              return { ...row, tiles };
            }
            return row;
          }),
      );
    } else if (this._editedDataRow) {
      // find and replace the row in the rows array immutably
      this.setRows(
        this.form
          .rows()
          .value()
          .map((row) =>
            row.y === this._editedDataRow!.y
              ? { ...this._editedDataRow!, data }
              : row,
          ),
      );
    }
    this.closeDataEditor();
  }

  public getTileCoords(tile?: TextTile): string {
    if (!tile) {
      tile = this.selectedTile();
    }
    if (!tile) {
      return '';
    } else {
      const rows = this.form.rows().value();
      let y = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].tiles.indexOf(tile) > -1) {
          y = i + 1;
          break;
        }
      }
      return `${y},${tile.x}`;
    }
  }
}
