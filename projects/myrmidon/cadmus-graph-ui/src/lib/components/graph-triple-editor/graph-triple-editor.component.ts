import {
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';
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

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { GraphService, UriNode, UriTriple } from '@myrmidon/cadmus-api';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { GraphNodeLookupService } from '../../services/graph-node-lookup.service';

@Component({
  selector: 'cadmus-graph-triple-editor',
  templateUrl: './graph-triple-editor.component.html',
  styleUrls: ['./graph-triple-editor.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
})
export class GraphTripleEditorComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  public readonly triple = model<UriTriple>();

  /**
   * The optional set of thesaurus entries for triple's tags.
   */
  // public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * Emitted when the user requested to close the editor.
   */
  public readonly editorClose = output();

  public isNew: boolean;

  public subjectNode: FormControl<UriNode | null>;
  public predicateNode: FormControl<UriNode | null>;
  public objectNode: FormControl<UriNode | null>;
  public isLiteral: FormControl<boolean>;
  public literal: FormControl<string | null>;
  public literalLang: FormControl<string | null>;
  public literalType: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    public lookupService: GraphNodeLookupService,
    private _snackbar: MatSnackBar,
    private _graphService: GraphService
  ) {
    this.isNew = true;
    // form
    this.subjectNode = formBuilder.control(null, Validators.required);
    this.predicateNode = formBuilder.control(null, Validators.required);
    this.objectNode = formBuilder.control(null, {
      validators: NgxToolsValidators.conditionalValidator(
        () => !this.isLiteral.value,
        Validators.required
      ),
    });
    this.isLiteral = formBuilder.control(true, { nonNullable: true });
    this.literal = formBuilder.control(null, {
      validators: [Validators.required, Validators.maxLength(15000)],
      updateOn: 'change',
    });
    this.literalLang = formBuilder.control(null, Validators.maxLength(10));
    this.literalType = formBuilder.control(null, Validators.maxLength(100));
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.form = formBuilder.group({
      subjectNode: this.subjectNode,
      predicateNode: this.predicateNode,
      objectNode: this.objectNode,
      isLiteral: this.isLiteral,
      literal: this.literal,
      literalLang: this.literalLang,
      literalType: this.literalType,
      tag: this.tag,
    });

    effect(() => {
      this.updateForm(this.triple());
    });
  }

  public ngOnInit(): void {
    this._sub = this.isLiteral.valueChanges.subscribe((value) => {
      if (value) {
        this.objectNode.setValidators(null);
        this.literal.setValidators([
          Validators.required,
          Validators.maxLength(15000),
        ]);
      } else {
        this.objectNode.setValidators(Validators.required);
        this.literal.setValidators(null);
      }
      this.literal.updateValueAndValidity();
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onSubjectChange(node?: unknown): void {
    this.subjectNode.setValue((node as UriNode) || null);
    this.subjectNode.updateValueAndValidity();
    this.subjectNode.markAsDirty();
  }

  public onPredicateChange(node?: unknown): void {
    this.predicateNode.setValue((node as UriNode) || null);
    this.predicateNode.updateValueAndValidity();
    this.predicateNode.markAsDirty();
  }

  public onObjectChange(node?: unknown): void {
    this.objectNode.setValue((node as UriNode) || null);
    this.objectNode.updateValueAndValidity();
    this.objectNode.markAsDirty();

    if (node) {
      this.isLiteral.setValue(false);
      this.isLiteral.updateValueAndValidity();
      this.isLiteral.markAsDirty();
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

  private updateForm(triple?: UriTriple): void {
    if (!triple) {
      this.form.reset();
      this.isLiteral.setValue(true);
      this.isNew = true;
      return;
    }

    if (triple.subjectId) {
      this.getNode(triple.subjectId).then((node) => {
        this.subjectNode.setValue(node || null);
        this.subjectNode.updateValueAndValidity();
        this.subjectNode.markAsDirty();
      });
    } else {
      this.subjectNode.reset();
    }
    if (triple.predicateId) {
      this.getNode(triple.predicateId).then((node) => {
        this.predicateNode.setValue(node || null);
        this.predicateNode.updateValueAndValidity();
        this.predicateNode.markAsDirty();
      });
    } else {
      this.predicateNode.reset();
    }
    if (triple.objectId) {
      this.isLiteral.setValue(false);
      this.getNode(triple.objectId).then((node) => {
        this.objectNode.setValue(node || null);
        this.objectNode.updateValueAndValidity();
        this.objectNode.markAsDirty();
      });
    } else {
      this.isLiteral.setValue(true);
      this.literal.setValue(triple.objectLiteral || null);
      this.literalLang.setValue(triple.literalLanguage || null);
      this.literalType.setValue(triple.literalType || null);
    }
    this.isNew = triple.id ? false : true;
    this.form.markAsPristine();
  }

  private getTriple(): UriTriple {
    return {
      id: this.triple()?.id || 0,
      subjectId: this.subjectNode.value?.id || 0,
      predicateId: this.predicateNode.value?.id || 0,
      objectId: this.isLiteral.value
        ? undefined
        : this.objectNode.value?.id || 0,
      objectLiteral: this.isLiteral.value ? this.literal.value! : undefined,
      literalLanguage: this.isLiteral.value
        ? this.literalLang.value || undefined
        : undefined,
      literalType: this.isLiteral.value
        ? this.literalType.value || undefined
        : undefined,
      subjectUri: this.subjectNode.value?.uri || '',
      predicateUri: this.predicateNode.value?.uri || '',
      objectUri: this.isLiteral.value
        ? undefined
        : this.objectNode.value?.uri || '',
    };
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.triple.set(this.getTriple());
  }
}
