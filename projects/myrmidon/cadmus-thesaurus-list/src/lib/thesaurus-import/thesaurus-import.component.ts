import { Component, EventEmitter, Output } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { EnvService } from '@myrmidon/ng-tools';
import { UploadService } from '@myrmidon/cadmus-api';

class FileExtensionValidator {
  constructor(private allowedExtensions: string[]) {}

  validate(control: AbstractControl): ValidationErrors | null {
    const file = control.value as File | null;
    if (file) {
      const fileName = file.name;
      const extension = fileName.split('.').pop();
      if (!this.allowedExtensions.includes(extension!)) {
        return { invalidExtension: true };
      }
    }
    return null;
  }
}

interface UploadResult {
  importedIds: string[];
  error?: string;
}

@Component({
  selector: 'cadmus-thesaurus-import',
  templateUrl: './thesaurus-import.component.html',
  styleUrls: ['./thesaurus-import.component.css'],
  standalone: false,
})
export class ThesaurusImportComponent {
  private _sub?: Subscription;

  public file: FormControl<File | null>;
  public mode: FormControl<string>;
  public excelSheet: FormControl<number>;
  public excelRow: FormControl<number>;
  public excelColumn: FormControl<number>;
  public dryRun: FormControl<boolean>;
  public form: FormGroup;

  public uploadProgress: number = 0;
  public uploading: boolean = false;
  public result?: UploadResult;

  @Output()
  public uploadStart: EventEmitter<void>;
  @Output()
  public uploadEnd: EventEmitter<boolean>;

  constructor(
    formBuilder: FormBuilder,
    private _env: EnvService,
    private _uploadService: UploadService
  ) {
    const fileExtensionValidator = new FileExtensionValidator([
      'json',
      'csv',
      'xls',
      'xlsx',
    ]);
    this.file = formBuilder.control(null, [
      Validators.required,
      (control) => fileExtensionValidator.validate(control),
    ]);

    this.mode = formBuilder.control('R', {
      validators: Validators.required,
      nonNullable: true,
    });
    this.excelSheet = formBuilder.control(1, {
      nonNullable: true,
      validators: [Validators.min(1)],
    });
    this.excelRow = formBuilder.control(1, {
      nonNullable: true,
      validators: [Validators.min(1)],
    });
    this.excelColumn = formBuilder.control(1, {
      nonNullable: true,
      validators: [Validators.min(1)],
    });
    this.dryRun = formBuilder.control(false, {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      file: this.file,
      mode: this.mode,
      excelSheet: this.excelSheet,
      excelRow: this.excelRow,
      excelColumn: this.excelColumn,
      dryRun: this.dryRun,
    });

    // events
    this.uploadStart = new EventEmitter();
    this.uploadEnd = new EventEmitter<boolean>();
  }

  public onFileSelected(event: any) {
    this.file.setValue(event.target.files[0]);
  }

  public upload() {
    if (!this.form.valid) {
      return;
    }
    this.result = undefined;
    this.uploading = true;
    this.uploadStart.emit();

    // URL
    const sb: string[] = [];
    sb.push(this._env.get('apiUrl')!);
    sb.push('thesauri/import');
    // mode
    if (this.mode.value !== 'R') {
      sb.push('?mode=');
      sb.push(this.mode.value);
    }
    // excel
    if (this.excelSheet.value !== 1) {
      sb.push('?excelSheet=');
      sb.push(`${this.excelSheet.value}`);
    }
    if (this.excelRow.value !== 1) {
      sb.push('?excelRow=');
      sb.push(`${this.excelRow.value}`);
    }
    if (this.excelColumn.value !== 1) {
      sb.push('?excelColumn=');
      sb.push(`${this.excelColumn.value}`);
    }
    // dry
    if (this.dryRun.value) {
      sb.push('?dryRun=true');
    }

    this._sub = this._uploadService
      .uploadFile(this.file.value!, sb.join(''), {
        reportProgress: true,
      })
      .subscribe((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round((event.loaded / event.total!) * 100);
        } else if (event.type === HttpEventType.Response) {
          this.uploading = false;
          this.result = event.body as UploadResult;
          this.uploadEnd.emit(true);
        }
      });
  }

  public onCancel() {
    // cancel the upload request
    this._sub?.unsubscribe();
    this.uploading = false;
    this.uploadProgress = 0;
    this.uploadEnd.emit(false);
  }
}
