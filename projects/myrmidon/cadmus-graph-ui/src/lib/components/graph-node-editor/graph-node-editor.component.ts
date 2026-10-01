import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { UriNode, NodeSourceType } from '@myrmidon/cadmus-api';

/**
 * The editable shape behind the form. Text fields use '' as their empty
 * value, as they are bound to native inputs (tag may also be bound to a
 * mat-select, whose "no tag" option has value '').
 */
interface GraphNodeControls {
  uri: string;
  label: string;
  isClass: boolean;
  tag: string;
}

function toDraft(node: UriNode | undefined): GraphNodeControls {
  return {
    uri: node?.uri || '',
    label: node?.label || '',
    isClass: !!node?.isClass,
    tag: node?.tag || '',
  };
}

/**
 * Build a node from the draft, keeping the ID and source type of the
 * edited node if any.
 */
function toNode(v: GraphNodeControls, node: UriNode | undefined): UriNode {
  return {
    id: node?.id || 0,
    sourceType: node?.sourceType || NodeSourceType.User,
    uri: v.uri.trim(),
    label: v.label.trim(),
    isClass: v.isClass,
    tag: v.tag.trim() || undefined,
  };
}

/**
 * Graph node editor.
 */
@Component({
  selector: 'cadmus-graph-node-editor',
  templateUrl: './graph-node-editor.component.html',
  styleUrls: ['./graph-node-editor.component.css'],
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatCheckbox,
    MatSelect,
    MatOption,
    MatIconButton,
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphNodeEditorComponent {
  /**
   * The node being edited. A new node has ID=0 and no uri.
   */
  public readonly node = model<UriNode>();

  /**
   * The optional set of thesaurus entries for node's tags.
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * Emitted when the user requested to close the editor.
   */
  public readonly editorClose = output();

  /**
   * True if the edited node is new (it has no ID).
   */
  public readonly isNew = computed<boolean>(() => !this.node()?.id);

  /**
   * The editable draft, derived from node. On the echo of our own save the
   * live draft is kept, as toNode() normalizes (trims) its values.
   */
  private readonly _draft = linkedSignal<UriNode | undefined, GraphNodeControls>(
    {
      source: () => this.node(),
      computation: (node, previous) =>
        previous &&
        JSON.stringify(node) === JSON.stringify(toNode(previous.value, node))
          ? previous.value
          : toDraft(node),
    }
  );

  public readonly form = form(this._draft, (path) => {
    required(path.uri);
    maxLength(path.uri, 500);
    required(path.label);
    maxLength(path.label, 500);
    maxLength(path.tag, 50);
  });

  constructor() {
    // once the draft mirrors the bound node again, clear interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toDraft(this.node()))) {
          this.form().reset();
        }
      });
    });
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.node.set(toNode(this._draft(), this.node()));
    this.form().reset();
  }
}
