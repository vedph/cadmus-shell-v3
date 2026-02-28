import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  Injector,
  model,
  output,
  signal,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  public readonly node = model<ThesaurusNode>();
  public readonly request = output<ComponentSignal<ThesaurusNode>>();

  public id: FormControl<string | null>;
  public value: FormControl<string | null>;
  public form: FormGroup;

  public readonly editing = signal<boolean>(false);
  public readonly indent = signal<string>('');

  @ViewChild('nodeVal') nodeValRef: ElementRef | undefined;

  constructor(
    formBuilder: FormBuilder,
    private _injector: Injector,
  ) {
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
    this.editing.set(false);
    if (!node) {
      this.form.reset();
      this.indent.set('');
      return;
    }
    this.id.setValue(node.id);
    this.value.setValue(node.value);
    this.indent.set('\u2022'.repeat((node.level || 1) - 1));
  }

  public toggleEdit(on: boolean): void {
    this.editing.set(on);
    if (on) {
      afterNextRender(
        () => {
          this.nodeValRef?.nativeElement.focus();
        },
        { injector: this._injector },
      );
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
    this.editing.set(false);
    this.node.set(this.getNode());
  }

  public emitRequest(id: string) {
    this.request.emit({
      id: id,
      payload: this.getNode(),
    });
  }
}
