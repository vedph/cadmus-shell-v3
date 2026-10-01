import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { take } from 'rxjs/operators';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatFormField,
  MatLabel,
  MatError,
  MatHint,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { GraphService, UriNode, UriTriple } from '@myrmidon/cadmus-api';

import { GraphNodeLookupService } from '../../services/graph-node-lookup.service';

/**
 * The editable shape behind the form. Nodes are picked via lookups (not
 * bound to any control) and are null when not set; text fields use '' as
 * their empty value, as they are bound to native inputs.
 */
interface GraphTripleControls {
  subjectNode: UriNode | null;
  predicateNode: UriNode | null;
  objectNode: UriNode | null;
  isLiteral: boolean;
  literal: string;
  literalLang: string;
  literalType: string;
}

/**
 * Bound triple -> draft. Nodes are not part of the triple (only their IDs
 * are), so they start as null and get loaded afterwards.
 */
function toDraft(triple: UriTriple | undefined): GraphTripleControls {
  const isLiteral = !triple?.objectId;
  return {
    subjectNode: null,
    predicateNode: null,
    objectNode: null,
    isLiteral,
    literal: (isLiteral && triple?.objectLiteral) || '',
    literalLang: (isLiteral && triple?.literalLanguage) || '',
    literalType: (isLiteral && triple?.literalType) || '',
  };
}

function toTriple(v: GraphTripleControls, id: number | undefined): UriTriple {
  return {
    id: id || 0,
    subjectId: v.subjectNode?.id || 0,
    predicateId: v.predicateNode?.id || 0,
    objectId: v.isLiteral ? undefined : v.objectNode?.id || 0,
    objectLiteral: v.isLiteral ? v.literal : undefined,
    literalLanguage: v.isLiteral ? v.literalLang || undefined : undefined,
    literalType: v.isLiteral ? v.literalType || undefined : undefined,
    subjectUri: v.subjectNode?.uri || '',
    predicateUri: v.predicateNode?.uri || '',
    objectUri: v.isLiteral ? undefined : v.objectNode?.uri || '',
  };
}

function isSameTriple(
  triple: UriTriple | undefined,
  v: GraphTripleControls
): boolean {
  return (
    !!triple && JSON.stringify(triple) === JSON.stringify(toTriple(v, triple.id))
  );
}

@Component({
  selector: 'cadmus-graph-triple-editor',
  templateUrl: './graph-triple-editor.component.html',
  styleUrls: ['./graph-triple-editor.component.css'],
  imports: [
    FormField,
    RefLookupComponent,
    MatCheckbox,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatHint,
    MatIconButton,
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphTripleEditorComponent {
  public readonly triple = model<UriTriple>();

  /**
   * Emitted when the user requested to close the editor.
   */
  public readonly editorClose = output();

  /**
   * True if the edited triple is new (it has no ID).
   */
  public readonly isNew = computed<boolean>(() => !this.triple()?.id);

  /**
   * The editable draft, derived from triple. On the echo of our own save the
   * live draft is kept (with its already loaded nodes).
   */
  private readonly _draft = linkedSignal<
    UriTriple | undefined,
    GraphTripleControls
  >({
    source: () => this.triple(),
    computation: (triple, previous) =>
      previous && isSameTriple(triple, previous.value)
        ? previous.value
        : toDraft(triple),
  });

  public readonly form = form(this._draft, (path) => {
    required(path.subjectNode);
    required(path.predicateNode);
    required(path.objectNode, {
      when: ({ valueOf }) => !valueOf(path.isLiteral),
    });
    required(path.literal, { when: ({ valueOf }) => valueOf(path.isLiteral) });
    maxLength(path.literal, 15000, {
      when: ({ valueOf }) => valueOf(path.isLiteral),
    });
    maxLength(path.literalLang, 10);
    maxLength(path.literalType, 100);
  });

  constructor(
    public lookupService: GraphNodeLookupService,
    private _snackbar: MatSnackBar,
    private _graphService: GraphService
  ) {
    // a new triple was bound: clear interaction state and load its nodes.
    // Nothing to do on the echo of our own save, as the draft already has
    // those nodes.
    effect(() => {
      const triple = this.triple();
      untracked(() => {
        if (!isSameTriple(triple, this._draft())) {
          this.form().reset();
          this.loadNodes(triple);
        }
      });
    });
  }

  private setNode(
    key: 'subjectNode' | 'predicateNode' | 'objectNode',
    node: UriNode | null
  ): void {
    this.form[key]().value.set(node);
    this.form[key]().markAsDirty();
  }

  public onSubjectChange(node?: unknown): void {
    this.setNode('subjectNode', (node as UriNode) || null);
  }

  public onPredicateChange(node?: unknown): void {
    this.setNode('predicateNode', (node as UriNode) || null);
  }

  public onObjectChange(node?: unknown): void {
    this.setNode('objectNode', (node as UriNode) || null);
    if (node) {
      this.form.isLiteral().value.set(false);
      this.form.isLiteral().markAsDirty();
    }
  }

  private getNode(id: number): Promise<UriNode | undefined> {
    return new Promise((resolve, reject) => {
      this._graphService
        .getNode(id)
        .pipe(take(1))
        .subscribe({
          next: (node) => {
            resolve(node);
          },
          error: (error) => {
            console.error('Error loading node', error);
            this._snackbar.open('Error loading node ' + id, 'OK');
            reject();
          },
        });
    });
  }

  /**
   * Load the nodes referenced by the triple into the draft.
   */
  /**
   * Load the nodes referenced by the triple into the draft. A response
   * arriving after another triple was bound is ignored, unless that
   * triple refers to the same node.
   */
  private loadNodes(triple: UriTriple | undefined): void {
    const keys = [
      ['subjectNode', 'subjectId'],
      ['predicateNode', 'predicateId'],
      ['objectNode', 'objectId'],
    ] as const;
    for (const [key, idKey] of keys) {
      const id = triple?.[idKey];
      if (id) {
        this.getNode(id).then((node) => {
          if (this.triple()?.[idKey] === id) {
            this.setNode(key, node || null);
          }
        });
      }
    }
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.triple.set(toTriple(this._draft(), this.triple()?.id));
    this.form().reset();
  }
}
