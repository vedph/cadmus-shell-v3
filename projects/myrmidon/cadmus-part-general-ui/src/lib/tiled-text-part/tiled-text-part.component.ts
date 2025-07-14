import { Component, OnInit } from '@angular/core';
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

  public selectedTile?: TextTile;
  public citation: FormControl<string | null>;
  public rows: FormControl<TextTileRow[]>;
  public editedData?: Data;
  public editedDataTitle?: string;
  public currentTabIndex: number;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    this.currentTabIndex = 0;
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
    if (!row.tiles) {
      row.tiles = [];
    }
    row.tiles.push({
      x: x,
      data: data,
    });
    this.rows.markAsDirty();
    this.rows.updateValueAndValidity();
  }

  /**
   * Delete the selected tile, if any.
   */
  public deleteSelectedTile(): void {
    if (!this.selectedTile) {
      return;
    }

    for (let i = 0; i < this.rows.value.length; i++) {
      const row = this.rows.value[i];
      if (row.tiles) {
        const index = row.tiles.indexOf(this.selectedTile);
        if (index > -1) {
          this.selectedTile =
            index + 1 < row.tiles.length
              ? row.tiles[index + 1]
              : row.tiles.length > 1
              ? row.tiles[index - 1]
              : undefined;
          row.tiles.splice(index, 1);
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
    moveItemInArray(this.rows.value, rowIndex, rowIndex - 1);
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
    moveItemInArray(this.rows.value, rowIndex, rowIndex + 1);
    this.adjustCoords();
    this.form?.markAsDirty();
  }

  public drop(event: CdkDragDrop<TextTile[]>, row: TextTileRow): void {
    // https://material.angular.io/cdk/drag-drop/overview
    moveItemInArray(row.tiles, event.previousIndex, event.currentIndex);
    this.adjustCoords();
    this.form?.markAsDirty();
  }

  public onTileChange(tile: TextTile): void {
    this.form?.markAsDirty();
  }

  public editRowData(row: TextTileRow): void {
    this._editedDataRow = row;
    this._editedDataTile = undefined;
    this.editedDataTitle = `Row ${row.y}`;
    this.editedData = row.data;
    this.currentTabIndex = 1;
  }

  public editTileData(tile: TextTile): void {
    this._editedDataTile = tile;
    this._editedDataRow = undefined;
    this.editedDataTitle = `Tile ${this.getTileCoords(tile)}`;
    this.editedData = tile.data;
    this.currentTabIndex = 1;
  }

  public closeDataEditor(): void {
    this.currentTabIndex = 0;
    this._editedDataRow = undefined;
    this.editedDataTitle = undefined;
    this.editedData = undefined;
  }

  public saveEditedData(data: Data): void {
    if (this._editedDataTile) {
      this._editedDataTile.data = data;
    } else {
      this._editedDataRow!.data = data;
    }
    this.form?.markAsDirty();
    this.closeDataEditor();
  }

  public getTileCoords(tile?: TextTile): string {
    if (!tile) {
      tile = this.selectedTile;
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
