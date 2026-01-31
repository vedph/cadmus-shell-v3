import { Component, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { EditedObject } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import {
  FormControl,
  FormBuilder,
  Validators,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

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
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

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

@Component({
  selector: 'cadmus-tiled-text-part',
  templateUrl: './tiled-text-part.component.html',
  styleUrls: ['./tiled-text-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
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
export class TiledTextPartComponent
  extends ModelEditorComponentBase<TiledTextPart>
  implements OnInit
{
  private _editedDataTile?: TextTile;
  private _editedDataRow?: TextTileRow;

  public citation: FormControl<string | null>;
  public rows: FormControl<TextTileRow[]>;

  public readonly selectedTile = signal<TextTile | undefined>(undefined);
  public readonly editedData = signal<Data | undefined>(undefined);
  public readonly editedDataTitle = signal<string | undefined>(undefined);
  public readonly currentTabIndex = signal<number>(0);

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
    super(authService, formBuilder);
    // form
    this.rows = formBuilder.control([], { nonNullable: true });
    this.citation = formBuilder.control(null, Validators.maxLength(1000));
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      citation: this.citation,
      rows: this.rows,
    });
  }

  private updateForm(part?: TiledTextPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.citation.setValue(part.citation || null);
    this.rows.setValue(part.rows || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<TiledTextPart>): void {
    // form
    this.updateForm(data?.value);
  }

  /**
   * Recalculate the coordinates of all the tiles in this set,
   * according to the tiles position.
   */
  private adjustCoords(): void {
    const rows = this.rows.value;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      row.y = i + 1;
      if (row.tiles) {
        for (let j = 0; j < row.tiles.length; j++) {
          row.tiles[j].x = j + 1;
        }
      }
    }
  }

  protected getValue(): TiledTextPart {
    // ensure that form's coordinates are ok
    this.adjustCoords();

    let part = this.getEditedPart(TILED_TEXT_PART_TYPEID) as TiledTextPart;
    part.citation = this.citation.value
      ? this.citation.value.trim()
      : undefined;
    part.rows = this.rows.value;
    return part;
  }

  /**
   * Append a new row at the bottom.
   */
  public addRow(): void {
    const data: { [key: string]: any } = {};
    data[TEXT_TILE_TEXT_DATA_NAME] = 'text1';

    const rows = [...this.rows.value];
    rows.push({
      y: rows.length + 1,
      tiles: [
        {
          x: 1,
          data: data,
        },
      ],
    });
    this.rows.setValue(rows);
    this.rows.markAsDirty();
    this.rows.updateValueAndValidity();
  }

  /**
   * Append a new tile at the end of the specified row.
   * @param row The row to add the tile to.
   */
  public addTile(row: TextTileRow): void {
    const x = row.tiles ? row.tiles.length + 1 : 1;
    const data: { [key: string]: any } = {};
    data[TEXT_TILE_TEXT_DATA_NAME] = 'text' + x;
    // clone tiles array and add new tile
    const tiles = row.tiles ? [...row.tiles, { x, data }] : [{ x, data }];
    row.tiles = tiles;
    this.rows.markAsDirty();
    this.rows.updateValueAndValidity();
  }

  /**
   * Delete the selected tile, if any.
   */
  public deleteSelectedTile(): void {
    if (!this.selectedTile()) {
      return;
    }

    for (let i = 0; i < this.rows.value.length; i++) {
      const row = this.rows.value[i];
      if (row.tiles && this.selectedTile()) {
        const index = row.tiles.indexOf(this.selectedTile()!);
        if (index > -1) {
          // create a new tiles array without the deleted tile
          const newTiles = row.tiles.slice();
          newTiles.splice(index, 1);
          // update selected tile
          this.selectedTile.set(
            index + 1 < newTiles.length
              ? newTiles[index + 1]
              : newTiles.length > 0
                ? newTiles[index - 1]
                : undefined,
          );
          row.tiles = newTiles;
          this.adjustCoords();
          this.rows.markAsDirty();
          this.rows.updateValueAndValidity();
          break;
        }
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
        const rows = [...this.rows.value];
        rows.splice(rowIndex, 1);
        this.rows.setValue(rows);
        this.rows.markAsDirty();
        this.adjustCoords();
        this.rows.updateValueAndValidity();
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
    const rows = [...this.rows.value];
    moveItemInArray(rows, rowIndex, rowIndex - 1);
    this.rows.setValue(rows);
    this.adjustCoords();
    this.form?.markAsDirty();
  }

  /**
   * Move the row at the specified index down.
   * @param rowIndex The row index.
   */
  public moveRowDown(rowIndex: number): void {
    if (rowIndex + 1 === this.rows.value.length) {
      return;
    }
    const rows = [...this.rows.value];
    moveItemInArray(rows, rowIndex, rowIndex + 1);
    this.rows.setValue(rows);
    this.adjustCoords();
    this.form?.markAsDirty();
  }

  public drop(event: CdkDragDrop<TextTile[]>, row: TextTileRow): void {
    // clone tiles array before moving
    const tiles = [...row.tiles];
    moveItemInArray(tiles, event.previousIndex, event.currentIndex);
    row.tiles = tiles;
    this.adjustCoords();
    this.form?.markAsDirty();
  }

  public onTileChange(tile: TextTile): void {
    this.form?.markAsDirty();
  }

  public editRowData(row: TextTileRow): void {
    this._editedDataRow = structuredClone(row);
    this._editedDataTile = undefined;
    this.editedDataTitle.set(`Row ${row.y}`);
    this.editedData.set(this._editedDataRow?.data);
    this.currentTabIndex.set(1);
  }

  public editTileData(tile: TextTile): void {
    this._editedDataTile = structuredClone(tile);
    this._editedDataRow = undefined;
    this.editedDataTitle.set(`Tile ${this.getTileCoords(tile)}`);
    this.editedData.set(this._editedDataTile?.data);
    this.currentTabIndex.set(1);
  }

  public closeDataEditor(): void {
    this.currentTabIndex.set(0);
    this._editedDataRow = undefined;
    this.editedDataTitle.set(undefined);
    this.editedData.set(undefined);
  }

  public saveEditedData(data: Data): void {
    if (this._editedDataTile) {
      // find and replace the tile in the rows array immutably
      const rows = this.rows.value.map((row) => {
        if (
          row.tiles &&
          row.tiles.some(
            (t) =>
              t.x === this._editedDataTile!.x &&
              t.data === this._editedDataTile!.data,
          )
        ) {
          const tiles = row.tiles.map((t) =>
            t.x === this._editedDataTile!.x &&
            t.data === this._editedDataTile!.data
              ? { ...this._editedDataTile!, data }
              : t,
          );
          return { ...row, tiles };
        }
        return row;
      });
      this.rows.setValue(rows);
    } else if (this._editedDataRow) {
      // find and replace the row in the rows array immutably
      const rows = this.rows.value.map((row) =>
        row.y === this._editedDataRow!.y
          ? { ...this._editedDataRow!, data }
          : row,
      );
      this.rows.setValue(rows);
    }
    this.form?.markAsDirty();
    this.closeDataEditor();
  }

  public getTileCoords(tile?: TextTile): string {
    if (!tile) {
      tile = this.selectedTile();
    }
    if (!tile) {
      return '';
    } else {
      let y = 0;
      for (let i = 0; i < this.rows.value.length; i++) {
        if (this.rows.value[i].tiles.indexOf(tile) > -1) {
          y = i + 1;
          break;
        }
      }
      return `${y},${tile.x}`;
    }
  }
}
