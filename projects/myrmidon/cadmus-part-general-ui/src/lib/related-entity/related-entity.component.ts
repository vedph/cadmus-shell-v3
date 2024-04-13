import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

import { RelatedEntity } from '../historical-events-part';

/**
 * Related entity component to edit the entity related to a historical event.
 */
@Component({
  selector: 'cadmus-related-entity',
  templateUrl: './related-entity.component.html',
  styleUrls: ['./related-entity.component.css'],
})
export class RelatedEntityComponent {
  private _entity: RelatedEntity | undefined;

  @Input()
  public get entity(): RelatedEntity | undefined | null {
    return this._entity;
  }
  public set entity(value: RelatedEntity | undefined | null) {
    if (this._entity === value) {
      return;
    }
    this._entity = value || undefined;
    this.updateForm(this._entity);
  }

  // relation entries
  @Input()
  public relationEntries: ThesaurusEntry[] | undefined;

  @Input()
  public idScopeEntries?: ThesaurusEntry[];
  /**
   * Thesaurus asserted-id-tags.
   */
  @Input()
  public idTagEntries?: ThesaurusEntry[];
  /**
   * Thesaurus assertion-tags.
   */
  @Input()
  public assTagEntries?: ThesaurusEntry[];
  /**
   * Thesaurus doc-reference-tags.
   */
  @Input()
  public refTagEntries?: ThesaurusEntry[];
  /**
   * Thesaurus doc-reference-types.
   */
  @Input()
  public refTypeEntries?: ThesaurusEntry[];

  // settings for lookup
  // by-type: true/false
  @Input()
  public pinByTypeMode?: boolean;
  // switch-mode: true/false
  @Input()
  public canSwitchMode?: boolean;
  // edit-target: true/false
  @Input()
  public canEditTarget?: boolean;

  @Output()
  public editorClose: EventEmitter<any>;

  @Output()
  public entityChange: EventEmitter<RelatedEntity>;

  // form
  public relation: FormControl<string | null>;
  public id: FormControl<AssertedCompositeId | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.editorClose = new EventEmitter<any>();
    this.entityChange = new EventEmitter<RelatedEntity>();
    // form
    this.relation = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.form = formBuilder.group({
      relation: this.relation,
      id: this.id,
    });
  }

  private updateForm(entity: RelatedEntity | undefined): void {
    if (!entity) {
      this.form.reset();
      return;
    }
    this.relation.setValue(entity.relation);
    this.id.setValue(entity.id);
    this.form.markAsPristine();
  }

  private getEntity(): RelatedEntity {
    return {
      relation: this.relation.value?.trim()!,
      id: this.id.value!,
    };
  }

  public onIdChange(id: AssertedCompositeId): void {
    this.id.setValue(id);
    this.id.updateValueAndValidity();
    this.id.markAsDirty();
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this._entity = this.getEntity();
    this.entityChange.emit(this._entity);
  }
}
