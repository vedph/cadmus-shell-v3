import {
  Component,
  effect,
  ElementRef,
  model,
  output,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { ComponentSignal } from '@myrmidon/cadmus-profile-core';

import { ThesaurusNode } from '../../services/thesaurus-nodes.service';

/**
 * A single thesaurus node used to display and edit a thesaurus entry.
 */
@Component({
  selector: 'cadmus-thesaurus-node',
  templateUrl: './thesaurus-node.component.html',
  styleUrls: ['./thesaurus-node.component.css'],
  imports: [
    MatIconButton,
    MatTooltip,
    MatIcon,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
  ],
})
export class ThesaurusNodeComponent {
  public editing: boolean;

  public id: FormControl<string | null>;
  public value: FormControl<string | null>;
  public form: FormGroup;

  public indent: string;

  @ViewChild('nodeVal') nodeValRef: ElementRef | undefined;

  public readonly node = model<ThesaurusNode>();

  public readonly signal = output<ComponentSignal<ThesaurusNode>>();

  constructor(formBuilder: FormBuilder) {
    this.editing = false;
    this.indent = '';
    // form
    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.value = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(1000),
    ]);
    this.form = formBuilder.group({
      id: this.id,
      value: this.value,
    });

    effect(() => {
      this.updateForm(this.node());
    });
  }

  private updateForm(node: ThesaurusNode | undefined): void {
    this.editing = false;
    if (!node) {
      this.form.reset();
      this.indent = '';
      return;
    }
    this.id.setValue(node.id);
    this.value.setValue(node.value);
    this.indent = '\u2022'.repeat((node.level || 1) - 1);
  }

  public toggleEdit(on: boolean): void {
    this.editing = on;
    if (on) {
      setTimeout(() => {
        this.nodeValRef?.nativeElement.focus();
      }, 300);
    }
  }

  private getNode(): ThesaurusNode {
    const node = this.node();
    return {
      ...node,
      id: this.id.value?.trim() || '',
      value: this.value.value?.trim() || '',
      level: node?.level || 0,
      ordinal: node?.ordinal || 0,
    };
  }

  public save(): void {
    if (!this.editing || this.form.invalid) {
      return;
    }
    this.form.markAsPristine();
    this.editing = false;
    this.node.set(this.getNode());
  }

  public emitSignal(id: string) {
    this.signal.emit({
      id: id,
      payload: this.getNode(),
    });
  }
}
