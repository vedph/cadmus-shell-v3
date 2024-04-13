import { Clipboard } from '@angular/cdk/clipboard';
import {
  Component,
  OnInit,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ItemService } from '@myrmidon/cadmus-api';
import {
  DataPinDefinition,
  FacetDefinition,
  PartDefinition,
} from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';

interface PartDefViewModel {
  typeId: string;
  name: string;
  description: string;
  groupKey: string;
  colorKey: string;
  sortKey: string;
}

@Component({
  selector: 'cadmus-item-query',
  templateUrl: './item-query.component.html',
  styleUrls: ['./item-query.component.css'],
})
export class ItemQueryComponent implements OnInit, AfterViewInit {
  public form: FormGroup;

  @Input()
  public get query(): string | undefined | null {
    return this.queryCtl.value;
  }
  public set query(value: string | undefined | null) {
    this.queryCtl.setValue(value || null);
    this.queryCtl.markAsDirty();
    this.queryCtl.updateValueAndValidity();
  }

  public queryCtl: FormControl<string | null>;
  public history: FormControl<string | null>;
  public partDef: FormControl<string | null>;

  @ViewChild('queryta', { static: false })
  public queryElement?: ElementRef<HTMLElement>;

  /**
   * Emitted when the query is submitted.
   */
  @Output()
  public querySubmit: EventEmitter<string>;

  @Input()
  public lastQueries?: string[];

  @Input() public disabled?: boolean;

  public partDefs?: PartDefViewModel[];
  public pinDefs?: DataPinDefinition[];
  public loadingPinDefs?: boolean;

  constructor(
    formBuilder: FormBuilder,
    private _clipboard: Clipboard,
    private _appRepository: AppRepository,
    private _itemService: ItemService
  ) {
    // events
    this.querySubmit = new EventEmitter<string>();
    // form
    this.queryCtl = formBuilder.control(null, Validators.required);
    this.history = formBuilder.control(null);
    this.partDef = formBuilder.control(null);
    this.form = formBuilder.group({
      queryCtl: this.queryCtl,
      history: this.history,
      partDef: this.partDef,
    });
  }

  private getTypeId(def: PartDefinition): string {
    return def.roleId?.startsWith('fr.') ? def.roleId : def.typeId;
  }

  private updatePartDefs(facets: FacetDefinition[]): void {
    // reset any pin definitions
    this.pinDefs = undefined;

    // collect definitions VMs
    const partDefs: PartDefViewModel[] = [];
    // for each facet:
    facets.map((facet) => {
      // for each part definition in facet:
      facet.partDefinitions.map((partDef: PartDefinition) => {
        // add it to the part defs if not already present
        const typeId = this.getTypeId(partDef);
        if (!partDefs.find((d) => d.typeId === typeId)) {
          partDefs.push({
            typeId,
            name: partDef.name,
            description: partDef.description || '',
            colorKey: partDef.colorKey || '',
            groupKey: partDef.groupKey || '',
            sortKey: partDef.sortKey || '',
          });
        }
      });
    });
    // sort them by sortKey
    partDefs.sort((a, b) => {
      return a.sortKey.localeCompare(b.sortKey);
    });
    this.partDefs = partDefs;
  }

  ngOnInit(): void {
    // part definitions
    this._appRepository.facets$.subscribe((facets) => {
      this.updatePartDefs(facets);
    });
    // when selected part def changes, load its pins defs
    this.partDef.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((id) => {
        this.loadingPinDefs = true;
        this._itemService.getDataPinDefinitions(id!).subscribe({
          next: (defs) => {
            this.loadingPinDefs = false;
            this.pinDefs = defs;
          },
          error: (err) => {
            console.error(err);
            this.loadingPinDefs = false;
          },
        });
      });
  }

  private focusQuery(): void {
    if (this.queryElement) {
      setTimeout(() => {
        this.queryElement?.nativeElement.focus();
      }, 500);
    }
  }

  ngAfterViewInit(): void {
    this.focusQuery();
  }

  public setQuery(query: string | null): void {
    if (!query) {
      return;
    }
    this.queryCtl.setValue(query);
    this.focusQuery();
  }

  public submitQuery(): void {
    if (this.form.invalid) {
      return;
    }
    this.querySubmit.emit(this.queryCtl.value!);
  }

  public pinTypeIdToString(id: number): string {
    switch (id) {
      case 1:
        return 'boolean';
      case 2:
        return 'integer';
      case 3:
        return 'decimal';
      default:
        return 'string';
    }
  }

  public copyToClipboard(text: string): void {
    this._clipboard.copy(text);
  }
}
