import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { AsyncPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';

import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { DataPage } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  Thesaurus,
  ThesaurusEntry,
  ThesaurusFilter,
} from '@myrmidon/cadmus-core';
import { ComponentSignal as ComponentRequest } from '@myrmidon/cadmus-profile-core';

import { ThesaurusNodeComponent } from '../thesaurus-node/thesaurus-node.component';
import { ThesaurusLookupComponent } from '../thesaurus-lookup/thesaurus-lookup.component';
import {
  ThesaurusNode,
  ThesaurusNodeFilter,
  ThesaurusNodesService,
} from '../../services/thesaurus-nodes.service';
import { ThesaurusNodeListRepository } from '../../state/thesaurus-node-list.repository';

const THES_ID_PATTERN = '^[a-zA-Z0-9][.\\-_a-zA-Z0-9]*@[a-z]{2,3}$';

/**
 * Thesaurus editor. This edits a thesaurus per pages. Each page
 * contains a set of thesauri nodes, which are a representation of
 * thesaurus entries used to ease facilitate the editing of hierarchical
 * thesauri, but can be equally used with normal thesauri.
 * Obsoleted, use cadmus-thesaurus-editor-feature instead.
 */
/**
 * The editable shape behind the thesaurus form. Text fields use '' as
 * their empty value, as they are bound to native inputs.
 */
interface ThesaurusControls {
  id: string;
  alias: boolean;
  targetId: string;
}

function toDraft(thesaurus: Thesaurus | undefined): ThesaurusControls {
  return {
    id: thesaurus?.id || '',
    alias: !!thesaurus?.targetId,
    targetId: thesaurus?.targetId || '',
  };
}

@Component({
  selector: 'cadmus-thesaurus-editor',
  templateUrl: './thesaurus-editor.component.html',
  styleUrls: ['./thesaurus-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatCheckbox,
    ThesaurusLookupComponent,
    MatSelect,
    MatOption,
    MatIconButton,
    MatTooltip,
    MatIcon,
    ThesaurusNodeComponent,
    MatButton,
    MatPaginator,
    AsyncPipe,
  ],
})
export class ThesaurusEditorComponent {
  /**
   * The thesaurus being edited.
   */
  public readonly thesaurus = model<Thesaurus>();

  /**
   * The lookup function used to lookup thesauri when editing aliases.
   */
  public readonly lookupFn =
    input<(filter?: ThesaurusFilter, limit?: number) => Observable<string[]>>();

  /**
   * Emitted when user requests to close the editor.
   */
  public readonly editorClose = output();

  public loading$: Observable<boolean | undefined>;
  public page$: Observable<DataPage<ThesaurusNode>>;
  public filter$: Observable<ThesaurusNodeFilter>;

  /**
   * The count of the edited nodes (i.e. of the thesaurus entries).
   */
  private readonly _nodeCount = toSignal(
    inject(ThesaurusNodesService)
      .selectNodes()
      .pipe(map((nodes) => nodes.length)),
    { initialValue: 0 },
  );

  /**
   * The thesaurus form, rebuilt from the bound thesaurus whenever it
   * changes (as the old form was, including after save).
   */
  private readonly _draft = linkedSignal(() => toDraft(this.thesaurus()));

  public readonly form = form(this._draft, (path) => {
    required(path.id);
    maxLength(path.id, 50);
    pattern(path.id, new RegExp(THES_ID_PATTERN));
    // alias: target ID required and valid, no entries
    required(path.targetId, { when: ({ valueOf }) => valueOf(path.alias) });
    maxLength(path.targetId, 50, {
      when: ({ valueOf }) => valueOf(path.alias),
    });
    pattern(path.targetId, new RegExp(THES_ID_PATTERN), {
      when: ({ valueOf }) => valueOf(path.alias),
    });
    // not an alias: entries required, no target ID. Entries are the nodes
    // being edited, so their count is live
    validate(path, ({ valueOf }) =>
      !valueOf(path.alias) && this._nodeCount() < 1
        ? { kind: 'noEntries' }
        : null,
    );
  });

  // filter
  public readonly filterForm = form(
    signal<{ idOrValue: string; parentId: string | null }>({
      idOrValue: '',
      parentId: null,
    }),
  );

  public parentIds$: Observable<ThesaurusEntry[]>;

  constructor(
    private _nodesService: ThesaurusNodesService,
    private _dialogService: DialogService,
    private _repository: ThesaurusNodeListRepository,
  ) {
    this.loading$ = _repository.loading$;
    this.filter$ = _repository.filter$;
    this.page$ = _repository.page$;

    // the list of all the parent nodes IDs in the edited thesaurus
    this.parentIds$ = this._nodesService.selectParentIds();
    // a thesaurus was bound (including the echo of our own save): clear
    // interaction state and load its entries as nodes
    effect(() => {
      const thesaurus = this.thesaurus();
      untracked(() => {
        this.form().reset();
        if (thesaurus) {
          this.importNodes(thesaurus);
        }
      });
    });
  }

  private reset(): void {
    this._repository.reset();
  }

  public onTargetIdChange(id: string | null): void {
    this.form.targetId().value.set(id || '');
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  public applyFilter(): void {
    this._repository.setFilter({
      idOrValue: this.filterForm.idOrValue().value() || undefined,
      parentId: this.filterForm.parentId().value() || undefined,
    });
  }

  public addNode(node: ThesaurusNode): void {
    this._nodesService.add(node);
    this.reset();
  }

  public expandAll(): void {
    this._nodesService.toggleAll(false);
    this.reset();
  }

  public collapseAll(): void {
    this._nodesService.toggleAll(true);
    this.reset();
  }

  public onRequest(request: ComponentRequest<ThesaurusNode>): void {
    const node = request.payload as ThesaurusNode;
    switch (request.id) {
      case 'expand':
        this._nodesService.add({ ...node, collapsed: false });
        this.reset();
        break;
      case 'collapse':
        this._nodesService.add({ ...node, collapsed: true });
        this.reset();
        break;
      case 'move-up':
        this._nodesService.moveUp(node.id);
        this.reset();
        break;
      case 'move-down':
        this._nodesService.moveDown(node.id);
        this.reset();
        break;
      case 'delete':
        this._dialogService
          .confirm('Confirm Deletion', 'Delete node\n' + node.id + '?')
          .subscribe((result) => {
            if (!result) {
              return;
            }
            this._nodesService.delete(node.id);
            this.reset();
          });
        break;
      case 'add-sibling':
        // add sibling
        const sibling: ThesaurusNode = {
          id: '',
          value: '',
          level: node.level,
          // will add after the current node
          ordinal: node.ordinal + 1,
          parentId: node.parentId,
        };
        this._nodesService.add(sibling);
        this.reset();
        break;
      case 'add-child':
        // add child
        const child: ThesaurusNode = {
          id: '',
          value: '',
          level: node.level + 1,
          ordinal: 0,
          parentId: node.id,
        };
        this._nodesService.add(child);
        // expand parent if collapsed
        if (node.collapsed) {
          this._nodesService.add({ ...node, collapsed: false });
        }
        this.reset();
        break;
    }
  }

  public appendNode(): void {
    const node: ThesaurusNode = {
      id: '',
      value: '',
      level: 1,
      ordinal: 1,
    };
    this._nodesService.add(node);
    this.reset();
  }

  private importNodes(thesaurus: Thesaurus): void {
    const entries: ThesaurusEntry[] = [];
    thesaurus.entries?.forEach((e: ThesaurusEntry) => {
      entries.push({ ...e });
    });
    this._nodesService.importEntries(
      entries,
      thesaurus.id?.startsWith('model-types@'),
    );
    this.reset();
  }

  private getThesaurus(): Thesaurus {
    const v = this._draft();
    const thesaurus: Thesaurus = {
      id: v.id,
      language: 'en',
      entries: [],
    };

    if (v.alias) {
      thesaurus.targetId = v.targetId;
    } else {
      thesaurus.entries = this._nodesService.getNodes().map((n) => {
        return {
          id: n.id,
          value: n.value,
        };
      });
    }

    return thesaurus;
  }

  public close(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      return;
    }
    this.thesaurus.set(this.getThesaurus());
  }
}
