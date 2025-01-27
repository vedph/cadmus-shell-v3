import {
  Component,
  OnInit,
  OnDestroy,
  input,
  model,
  output,
  effect,
} from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';

import {
  MatFormField,
  MatLabel,
  MatSuffix,
  MatError,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { Subscription } from 'rxjs';

interface Data {
  [key: string]: any;
}
interface DataKey {
  value: string;
  visible: boolean;
}

/**
 * The maximum allowed length for a datum value. This is just a reasonable
 * limit, having no other specifical reason.
 */
const VALUE_MAX_LEN = 100;

@Component({
  selector: 'cadmus-tiled-data',
  templateUrl: './tiled-data.component.html',
  styleUrls: ['./tiled-data.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatIconButton,
    MatSuffix,
    MatIcon,
    MatTooltip,
    MatError,
  ],
})
export class TiledDataComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _hiddenData: Data;
  public keys: DataKey[];

  public readonly title = input<string>();

  public readonly data = model<Data>({});

  public readonly hiddenKeys = input<string[]>([]);

  public readonly cancel = output();

  public keyFilter: FormControl<string | null>;
  public filterForm: FormGroup;

  public newKey: FormControl<string | null>;
  public newValue: FormControl<string | null>;
  public newForm: FormGroup;

  public form: FormGroup;

  constructor(
    private _formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    this._hiddenData = {};
    this.keys = [];
    // filter form
    this.keyFilter = _formBuilder.control(null);
    this.filterForm = _formBuilder.group({
      keyFilter: this.keyFilter,
    });
    // new datum form
    this.newKey = _formBuilder.control(null, [
      Validators.required,
      Validators.pattern('^[a-zA-Z_$][[a-zA-Z_$0-9]{0,49}$'),
    ]);
    this.newValue = _formBuilder.control(null, [
      Validators.maxLength(VALUE_MAX_LEN),
    ]);
    this.newForm = _formBuilder.group({
      newKey: this.newKey,
      newValue: this.newValue,
    });
    // editing form (controls are dynamically populated)
    this.form = _formBuilder.group({});

    effect(() => {
      this.updateForm(this.data(), this.hiddenKeys());
    });
  }

  public ngOnInit(): void {
    this._sub = this.keyFilter.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((_) => {
        this.updateDataVisibility();
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private matchesFilter(key: string): boolean {
    if (!this.keyFilter.value) {
      return true;
    }
    const filter = this.keyFilter.value.toLowerCase();
    return key.toLowerCase().indexOf(filter) > -1;
  }

  public isVisibleKey(key: string): boolean {
    const dataKey = this.keys.find((k) => {
      return k.value === key;
    });
    return dataKey ? dataKey.visible : false;
  }

  private updateForm(data?: Data, hiddenKeys?: string[]): void {
    // reset
    this.keys = [];
    this._hiddenData = {};
    this.form = this._formBuilder.group({});

    if (!data) {
      return;
    }

    // collect keys from data's own properties and sort the result
    const cache: DataKey[] = [];
    Object.getOwnPropertyNames(data).forEach((key: string) => {
      if (!hiddenKeys || hiddenKeys.indexOf(key) === -1) {
        cache.push({ value: key, visible: this.matchesFilter(key) });
      } else {
        this._hiddenData[key] = data[key];
      }
    });
    cache.sort();

    // add a control for each collected key
    for (let i = 0; i < cache.length; i++) {
      const key = cache[i];
      this.form.addControl(
        key.value,
        this._formBuilder.control(
          data[key.value],
          Validators.maxLength(VALUE_MAX_LEN)
        )
      );
    }
    this.keys = cache;
  }

  private updateDataVisibility(): void {
    for (let i = 0; i < this.keys.length; i++) {
      this.keys[i] = {
        value: this.keys[i].value,
        visible: this.matchesFilter(this.keys[i].value),
      };
    }
  }

  private getData(): Data {
    const data: Data = this._hiddenData ? { ...this._hiddenData } : {};

    for (let i = 0; i < this.keys.length; i++) {
      const keyValue = this.keys[i].value;
      data[keyValue] = this.form.controls[keyValue].value;
    }

    return data;
  }

  public deleteDatum(key: DataKey): void {
    this._dialogService
      .confirm('Confirm Deletion', `Delete datum #"${key.value}"?`)
      .subscribe((ok: boolean) => {
        if (!ok) {
          return;
        }
        delete this.data()![key.value];
        this.updateForm();
      });
  }

  public addDatum(): void {
    if (this.newForm.invalid) {
      return;
    }
    this.data()![this.newKey.value!] = this.newValue.value;
    this.newForm.reset();
    this.updateForm(this.data());
  }

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.data.set(this.getData());
  }
}
