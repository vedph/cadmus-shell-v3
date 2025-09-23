import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import {
  BrowserTreeNodeComponent,
  PagedTreeStore,
  PageChangeRequest,
} from '@myrmidon/paged-data-browsers';

import {
  renderLabelFromLastColon,
  StaticThesPagedTreeStoreService,
  ThesEntryNodeFilter,
  ThesEntryPagedTreeNode,
} from '../thesaurus-tree/static-thes-paged-tree-store.service';
import { ThesPagedTreeFilterComponent } from '../thes-paged-tree-filter/thes-paged-tree-filter.component';

@Component({
  selector: 'cadmus-thes-paged-tree-browser',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    ThesPagedTreeFilterComponent,
    BrowserTreeNodeComponent,
  ],
  templateUrl: './thes-paged-tree-browser.component.html',
  styleUrl: './thes-paged-tree-browser.component.css',
})
export class ThesPagedTreeBrowserComponent implements OnInit, OnDestroy {
  private _dialog = inject(MatDialog);
  private _sub?: Subscription;

  /**
   * The service to use to load the nodes.
   */
  public readonly service = input<StaticThesPagedTreeStoreService>(
    new StaticThesPagedTreeStoreService([], renderLabelFromLastColon)
  );

  /**
   * Emitted when a node is clicked.
   */
  public readonly nodePick = output<ThesEntryPagedTreeNode>();

  /**
   * The store instance, built from the service.
   */
  public readonly store = computed(() => {
    const service = this.service();
    const store = new PagedTreeStore<
      ThesEntryPagedTreeNode,
      ThesEntryNodeFilter
    >(service);
    this.nodes$ = store.nodes$;
    this.filter$ = store.filter$;
    return store;
  });

  public readonly loading = signal<boolean>(false);

  public debug: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public hideLoc: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public hideFilter: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });

  public filter$: Observable<Readonly<ThesEntryNodeFilter>>;
  public nodes$: Observable<Readonly<ThesEntryPagedTreeNode[]>>;

  public label: FormControl<string | null> = new FormControl(null);
  public form = new FormGroup({
    label: this.label,
  });

  constructor() {
    const store = this.store();
    this.nodes$ = store.nodes$;
    this.filter$ = store.filter$;
  }

  public ngOnInit(): void {
    if (!this.store().getNodes().length) {
      this.loading.set(true);
      this.store()
        .setFilter({})
        .finally(() => {
          this.loading.set(false);
          console.log('nodes loaded', this.store().getNodes());
        });
    }
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public reset(): void {
    this.loading.set(true);
    this.store()
      .reset()
      .finally(() => {
        this.loading.set(false);
      });
  }

  public onToggleExpanded(node: ThesEntryPagedTreeNode): void {
    this.loading.set(true);
    if (node.expanded) {
      this.store()
        .collapse(node.id)
        .finally(() => {
          this.loading.set(false);
        });
    } else {
      this.store()
        .expand(node.id)
        .finally(() => {
          this.loading.set(false);
        });
    }
  }

  public onPageChangeRequest(request: PageChangeRequest): void {
    this.loading.set(true);
    this.store()
      .changePage(request.node.id, request.paging.pageNumber)
      .finally(() => {
        this.loading.set(false);
      });
  }

  public onFilterChange(filter: ThesEntryNodeFilter | null | undefined): void {
    console.log('filter change', filter);
    this.loading.set(true);
    this.store()
      .setFilter(filter || {})
      .finally(() => {
        this.loading.set(false);
      });
  }

  public onEditFilterRequest(node: ThesEntryPagedTreeNode): void {
    const dialogRef = this._dialog.open(ThesPagedTreeFilterComponent, {
      data: {
        filter: node.filter,
      },
    });
    dialogRef.afterClosed().subscribe((filter) => {
      // undefined = user dismissed without changes
      if (filter === null) {
        this.store().setNodeFilter(node.id, null);
      } else if (filter) {
        this.store().setNodeFilter(node.id, filter);
      }
    });
  }

  public expandAll(): void {
    this.store().expandAll();
  }

  public collapseAll(): void {
    this.store().collapseAll();
  }

  public clear(): void {
    this.store().clear();
  }

  public onNodeClick(node: ThesEntryPagedTreeNode): void {
    if (!node.hasChildren) {
      this.nodePick.emit(node);
    }
  }

  public findLabels(): void {
    if (!this.label.value) {
      return;
    }
    this.store().findLabels(this.label.value);
  }

  public removeHilites(): void {
    this.store().removeHilites();
  }
}
