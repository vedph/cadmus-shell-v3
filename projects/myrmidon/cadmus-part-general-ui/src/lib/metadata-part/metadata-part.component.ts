import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  MetadataPart,
  METADATA_PART_TYPEID,
  Metadatum,
} from '../metadata-part';

/**
 * Metadata part editor component.
 * Thesauri: metadata-types (optional).
 */
@Component({
  selector: 'cadmus-metadata-part',
  templateUrl: './metadata-part.component.html',
  styleUrls: ['./metadata-part.component.css'],
  standalone: false,
})
export class MetadataPartComponent
  extends ModelEditorComponentBase<MetadataPart>
  implements OnInit, OnDestroy
{
  private _subs: Subscription[];
  public metadata: FormArray;

  /**
   * metadata-types thesaurus entries.
   */
  public typeEntries: ThesaurusEntry[] | undefined;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    this._subs = [];
    // form
    this.metadata = formBuilder.array(
      [],
      NgxToolsValidators.strictMinLengthValidator(1)
    );
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      metadata: this.metadata,
    });
  }

  private unsubscribe(): void {
    for (let i = 0; i < this._subs.length; i++) {
      this._subs[i].unsubscribe();
    }
    this._subs.length = 0;
  }

  public override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.unsubscribe();
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const key = 'metadata-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries = thesauri[key].entries;
    } else {
      this.typeEntries = undefined;
    }
  }

  private updateForm(part?: MetadataPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.metadata.clear();
    this.unsubscribe();
    if (part.metadata?.length) {
      for (let m of part.metadata) {
        const g = this.getMetadatumGroup(m);
        this._subs.push(
          g.valueChanges.subscribe((_) => {
            this.metadata.updateValueAndValidity();
            this.metadata.markAsDirty();
          })
        );
        this.metadata.controls.push(g);
      }
    }
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<MetadataPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): MetadataPart {
    let part = this.getEditedPart(METADATA_PART_TYPEID) as MetadataPart;
    part.metadata = this.getMetadata();
    return part;
  }

  private getMetadatumGroup(item?: Metadatum): FormGroup {
    return this.formBuilder.group({
      type: this.formBuilder.control(item?.type, Validators.maxLength(100)),
      name: this.formBuilder.control(item?.name, [
        Validators.required,
        Validators.maxLength(500),
      ]),
      value: this.formBuilder.control(item?.value, [
        Validators.required,
        Validators.maxLength(1000),
      ]),
    });
  }

  public addMetadatum(item?: Metadatum): void {
    const g = this.getMetadatumGroup(item);
    this._subs.push(
      g.valueChanges.subscribe((_) => {
        this.metadata.updateValueAndValidity();
        this.metadata.markAsDirty();
      })
    );
    this.metadata.push(g);
    this.metadata.updateValueAndValidity();
    this.metadata.markAsDirty();
  }

  public removeMetadatum(index: number): void {
    this._subs[index].unsubscribe();
    this._subs.splice(index, 1);
    this.metadata.removeAt(index);
    this.metadata.updateValueAndValidity();
    this.metadata.markAsDirty();
  }

  public moveMetadatumUp(index: number): void {
    if (index < 1) {
      return;
    }
    const s = this._subs[index];
    this._subs.splice(index, 1);
    this._subs.splice(index - 1, 0, s);

    const item = this.metadata.controls[index];
    this.metadata.removeAt(index);
    this.metadata.insert(index - 1, item);
    this.metadata.updateValueAndValidity();
    this.metadata.markAsDirty();
  }

  public moveMetadatumDown(index: number): void {
    if (index + 1 >= this.metadata.length) {
      return;
    }
    const s = this._subs[index];
    this._subs.splice(index, 1);
    this._subs.splice(index + 1, 0, s);

    const item = this.metadata.controls[index];
    this.metadata.removeAt(index);
    this.metadata.insert(index + 1, item);
    this.metadata.updateValueAndValidity();
    this.metadata.markAsDirty();
  }

  private getMetadata(): Metadatum[] {
    const entries: Metadatum[] = [];
    for (let i = 0; i < this.metadata.length; i++) {
      const g = this.metadata.at(i) as FormGroup;
      entries.push({
        type: g.controls['type'].value?.trim(),
        name: g.controls['name'].value?.trim(),
        value: g.controls['value'].value?.trim(),
      });
    }
    return entries;
  }
}
