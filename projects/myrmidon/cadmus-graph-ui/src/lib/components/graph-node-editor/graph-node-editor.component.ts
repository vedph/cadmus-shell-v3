import { Component, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

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
 * Graph node editor.
 */
@Component({
  selector: 'cadmus-graph-node-editor',
  templateUrl: './graph-node-editor.component.html',
  styleUrls: ['./graph-node-editor.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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

  public isNew: boolean;

  public uri: FormControl<string | null>;
  public label: FormControl<string | null>;
  public isClass: FormControl<boolean>;
  public tag: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.isNew = true;
    // form
    this.uri = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.label = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.isClass = formBuilder.control(false, { nonNullable: true });
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.form = formBuilder.group({
      uri: this.uri,
      label: this.label,
      isClass: this.isClass,
      tag: this.tag,
    });

    effect(() => {
      this.updateForm(this.node());
    });
  }

  private updateForm(node?: UriNode): void {
    if (!node) {
      this.form.reset();
      this.isNew = true;
      return;
    }
    this.uri.setValue(node.uri);
    this.label.setValue(node.label);
    this.isClass.setValue(node.isClass ? true : false);
    this.tag.setValue(node.tag || null);
    this.isNew = node.id ? false : true;
    this.form.markAsPristine();
  }

  private getNode(): UriNode {
    return {
      id: this.node()?.id || 0,
      sourceType: this.node()?.sourceType || NodeSourceType.User,
      uri: this.uri.value?.trim() || '',
      label: this.label.value?.trim() || '',
      isClass: this.isClass.value,
      tag: this.tag.value?.trim(),
    };
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.node.set(this.getNode());
  }
}
