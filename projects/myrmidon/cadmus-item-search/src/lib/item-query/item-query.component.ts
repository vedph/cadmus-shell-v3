import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  output,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormField, form, required } from '@angular/forms/signals';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatFormField,
  MatLabel,
  MatError,
  MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatProgressBar } from '@angular/material/progress-bar';

import { ItemService } from '@myrmidon/cadmus-api';
import {
  DataPinDefinition,
  FacetDefinition,
  PartDefinition,
} from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';
import { Subscription } from 'rxjs';

/**
 * The editable shape behind the form. The query uses '' as its empty value,
 * as it is bound to a native textarea.
 */
interface ItemQueryControls {
  queryCtl: string;
  history: string | null;
  partDef: string | null;
}

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardContent,
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    CdkTextareaAutosize,
    MatError,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatButton,
    MatSelect,
    MatOption,
    MatSuffix,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatProgressBar,
  ],
})
export class ItemQueryComponent implements OnInit, AfterViewInit {
  private _sub?: Subscription;

  @ViewChild('queryta', { static: false })
  public queryElement?: ElementRef<HTMLElement>;

  public readonly query = input<string>();

  public readonly lastQueries = input<string[]>([]);

  public readonly disabled = input<boolean>();

  /**
   * Emitted when the query is submitted.
   */
  public readonly querySubmit = output<string>();

  public readonly partDefs = signal<PartDefViewModel[]>([]);
  public readonly pinDefs = signal<DataPinDefinition[]>([]);
  public readonly loadingPinDefs = signal<boolean>(false);

  /**
   * The editable draft: the query text follows the query input, while the
   * history and part definition pickers are not related to it and keep
   * their values.
   */
  private readonly _draft = linkedSignal<string | undefined, ItemQueryControls>(
    {
      source: () => this.query(),
      computation: (query, previous) => ({
        queryCtl: query || '',
        history: previous?.value.history ?? null,
        partDef: previous?.value.partDef ?? null,
      }),
    },
  );

  public readonly form = form(this._draft, (path) => {
    required(path.queryCtl);
  });

  constructor(
    private _clipboard: Clipboard,
    private _appRepository: AppRepository,
    private _itemService: ItemService,
  ) {
    // when selected part def changes, load its pins defs. Unlike the old
    // valueChanges, toObservable also emits the initial null: skip it
    toObservable(this.form.partDef().value)
      .pipe(
        filter((id): id is string => !!id),
        debounceTime(200),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        this.loadingPinDefs.set(true);
        this._itemService.getDataPinDefinitions(id).subscribe({
          next: (defs) => {
            this.loadingPinDefs.set(false);
            this.pinDefs.set(defs);
          },
          error: (err) => {
            console.error(err);
            this.loadingPinDefs.set(false);
          },
        });
      });
  }

  private getTypeId(def: PartDefinition): string {
    return def.roleId?.startsWith('fr.') ? def.roleId : def.typeId;
  }

  private updatePartDefs(facets: FacetDefinition[]): void {
    // reset any pin definitions
    this.pinDefs.set([]);

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
    this.partDefs.set(partDefs);
  }

  public ngOnInit(): void {
    // part definitions
    this._sub = this._appRepository.facets$.subscribe((facets) => {
      this.updatePartDefs(facets);
    });
    // ensure app data is loaded
    this._appRepository.load();
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private focusQuery(): void {
    this.queryElement?.nativeElement.focus();
  }

  public ngAfterViewInit(): void {
    this.focusQuery();
  }

  public setQuery(query: string | null): void {
    if (!query) {
      return;
    }
    this.form.queryCtl().value.set(query);
    this.focusQuery();
  }

  public clearQuery(): void {
    this.form.queryCtl().value.set('');
    this.form.queryCtl().reset();
  }

  public submitQuery(): void {
    if (this.form().invalid()) {
      return;
    }
    this.querySubmit.emit(this.form.queryCtl().value());
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
