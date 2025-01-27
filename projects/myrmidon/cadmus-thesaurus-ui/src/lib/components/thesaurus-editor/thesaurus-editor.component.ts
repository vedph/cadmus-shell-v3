import { Component, effect, input, model, OnInit, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

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

import { DataPage, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  Thesaurus,
  ThesaurusEntry,
  ThesaurusFilter,
} from '@myrmidon/cadmus-core';
import { ComponentSignal } from '@myrmidon/cadmus-profile-core';

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
 */
@Component({
  selector: 'cadmus-thesaurus-editor',
  templateUrl: './thesaurus-editor.component.html',
  styleUrls: ['./thesaurus-editor.component.css'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    FormsModule,
    ReactiveFormsModule,
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
export class ThesaurusEditorComponent implements OnInit {
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

  // thesaurus form
  public id: FormControl<string | null>;
  public alias: FormControl<boolean>;
  public targetId: FormControl<string | null>;
  public entryCount: FormControl<number>;
  public form: FormGroup;

  // filter
  public parentId: FormControl<string | null>;
  public idOrValue: FormControl<string | null>;
  public filterForm: FormGroup;

  public parentIds$: Observable<ThesaurusEntry[]>;

  constructor(
    private _nodesService: ThesaurusNodesService,
    private _dialogService: DialogService,
    private _repository: ThesaurusNodeListRepository,
    formBuilder: FormBuilder
  ) {
    this.loading$ = _repository.loading$;
    this.filter$ = _repository.filter$;
    this.page$ = _repository.page$;

    // the list of all the parent nodes IDs in the edited thesaurus
    this.parentIds$ = this._nodesService.selectParentIds();
    // thesaurus form
    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(new RegExp(THES_ID_PATTERN)),
    ]);
    this.alias = formBuilder.control(false, { nonNullable: true });
    this.targetId = formBuilder.control(null);
    this.entryCount = formBuilder.control(0, {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    this.form = formBuilder.group({
      id: this.id,
      alias: this.alias,
      targetId: this.targetId,
      entryCount: this.entryCount,
    });
    // filter form
    this.idOrValue = formBuilder.control(null);
    this.parentId = formBuilder.control(null);
    this.filterForm = formBuilder.group({
      idOrValue: this.idOrValue,
      parentId: this.parentId,
    });

    effect(() => {
      this.updateForm(this.thesaurus());
    });
  }

  private reset(): void {
    this._repository.reset();
  }

  /**
   * Update the form's validators according to whether the edited
   * thesaurus is just an alias or a full thesaurus.
   */
  private updateValidators(): void {
    if (this.alias.value) {
      // alias: target ID required and valid, no entries
      this.entryCount.setValidators(null);
      this.targetId.setValidators([
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(new RegExp(THES_ID_PATTERN)),
      ]);
    } else {
      // not an alias: entries required, no target ID
      this.entryCount.setValidators(
        NgxToolsValidators.strictMinLengthValidator(1)
      );
      this.targetId.setValidators(null);
    }

    this.entryCount.updateValueAndValidity();
    this.targetId.updateValueAndValidity();
  }

  ngOnInit(): void {
    // change validation according to whether this is an alias
    this.alias.valueChanges.subscribe((_) => {
      this.updateValidators();
    });

    // load
    this.updateForm(this.thesaurus());
  }

  public onTargetIdChange(id: string | null): void {
    this.targetId.setValue(id);
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  public applyFilter(): void {
    this._repository.setFilter({
      idOrValue: this.idOrValue.value || undefined,
      parentId: this.parentId.value || undefined,
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

  public onSignal(signal: ComponentSignal<ThesaurusNode>): void {
    const node = signal.payload as ThesaurusNode;
    switch (signal.id) {
      case 'expand':
        node.collapsed = false;
        this._nodesService.add(node);
        this.reset();
        break;
      case 'collapse':
        node.collapsed = true;
        this._nodesService.add(node);
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
          node.collapsed = false;
          this._nodesService.add(node);
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

  private updateForm(thesaurus?: Thesaurus): void {
    if (!thesaurus) {
      this.form.reset();
      return;
    }
    this.id.setValue(thesaurus.id);
    this.targetId.setValue(thesaurus.targetId || null);
    this.entryCount.setValue(thesaurus.entries?.length || 0);
    this.alias.setValue(thesaurus.targetId ? true : false);
    this.form.markAsPristine();

    // nodes
    const entries: ThesaurusEntry[] = [];
    thesaurus.entries?.forEach((e: ThesaurusEntry) => {
      entries.push({ ...e });
    });
    this._nodesService.importEntries(
      entries,
      thesaurus.id?.startsWith('model-types@')
    );
    this.reset();
  }

  private getThesaurus(): Thesaurus {
    const thesaurus: Thesaurus = {
      id: this.id.value!,
      language: 'en',
      entries: [],
    };

    if (this.alias.value) {
      thesaurus.targetId = this.targetId.value!;
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
    if (this.form.invalid) {
      return;
    }
    this.thesaurus.set(this.getThesaurus());
  }
}
