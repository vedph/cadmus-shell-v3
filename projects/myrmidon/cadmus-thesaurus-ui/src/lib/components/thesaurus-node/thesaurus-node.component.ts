import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  Injector,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { ComponentSignal } from '@myrmidon/cadmus-profile-core';

import { ThesaurusNode } from '../../services/thesaurus-nodes.service';

/**
 * The editable shape behind the form. Text fields use '' as their empty
 * value, as they are bound to native inputs.
 */
interface ThesaurusNodeControls {
  id: string;
  value: string;
}

function toDraft(node: ThesaurusNode | undefined): ThesaurusNodeControls {
  return { id: node?.id || '', value: node?.value || '' };
}

/**
 * Draft -> node. Normalizes values (trimming), so the node saved from a
 * draft may differ from the draft itself.
 */
function toNode(
  v: ThesaurusNodeControls,
  node: ThesaurusNode | undefined,
): ThesaurusNode {
  return {
    ...node!,
    id: v.id.trim(),
    value: v.value.trim(),
    level: node?.level || 0,
    ordinal: node?.ordinal || 0,
  };
}

/**
 * A single thesaurus node used to display and edit a thesaurus entry.
 */
@Component({
  selector: 'cadmus-thesaurus-node',
  templateUrl: './thesaurus-node.component.html',
  styleUrls: ['./thesaurus-node.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconButton,
    MatTooltip,
    MatIcon,
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
  ],
})
export class ThesaurusNodeComponent {
  public readonly node = model<ThesaurusNode>();
  public readonly request = output<ComponentSignal<ThesaurusNode>>();

  /**
   * The editable draft, derived from node. On the echo of our own save the
   * live draft is kept, as toNode() normalizes its values.
   */
  private readonly _draft = linkedSignal<
    ThesaurusNode | undefined,
    ThesaurusNodeControls
  >({
    source: () => this.node(),
    computation: (node, previous) =>
      previous &&
      JSON.stringify(node) ===
        JSON.stringify(toNode(previous.value, previous.source))
        ? previous.value
        : toDraft(node),
  });

  public readonly form = form(this._draft, (path) => {
    required(path.id);
    maxLength(path.id, 100);
    required(path.value);
    maxLength(path.value, 1000);
  });

  public readonly editing = signal<boolean>(false);

  /**
   * The indentation bullets for the node's level.
   */
  public readonly indent = computed<string>(() =>
    '\u2022'.repeat((this.node()?.level || 1) - 1),
  );

  @ViewChild('nodeVal') nodeValRef: ElementRef | undefined;

  constructor(private _injector: Injector) {
    // any node change ends editing
    effect(() => {
      this.node();
      untracked(() => this.editing.set(false));
    });

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

  public toggleEdit(on: boolean): void {
    this.editing.set(on);
    if (!on) {
      // discard: restore the values of the bound node
      this._draft.set(toDraft(this.node()));
      this.form().reset();
    }
    if (on) {
      afterNextRender(
        () => {
          this.nodeValRef?.nativeElement.focus();
        },
        { injector: this._injector },
      );
    }
  }

  public save(): void {
    if (!this.editing() || this.form().invalid()) {
      return;
    }
    this.form().reset();
    this.editing.set(false);
    this.node.set(toNode(this._draft(), this.node()));
  }

  public emitRequest(id: string) {
    this.request.emit({
      id: id,
      payload: toNode(this._draft(), this.node()),
    });
  }
}
