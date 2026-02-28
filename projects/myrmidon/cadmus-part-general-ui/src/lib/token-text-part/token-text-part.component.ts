import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
  Validators,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { take } from 'rxjs/operators';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import {
  TokenTextPart,
  TOKEN_TEXT_PART_TYPEID,
  TokenTextLine,
} from '../token-text-part';
import { EditedObject } from '@myrmidon/cadmus-core';
import { MonacoEditorHelper } from '../monaco-editor-helper';

/**
 * Editor component for base text, as referenced by token-based layers.
 * Thesauri: none.
 */
@Component({
  selector: 'cadmus-token-text-part',
  templateUrl: './token-text-part.component.html',
  styleUrls: ['./token-text-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MatIconButton,
    MatTooltip,
    NgeMonacoModule,
    MatError,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class TokenTextPartComponent
  extends ModelEditorComponentBase<TokenTextPart>
  implements OnInit, OnDestroy
{
  private _textHelper!: MonacoEditorHelper;

  public citation: FormControl<string | null>;
  public text: FormControl<string | null>;

  public transform: FormControl<string | null>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
    super(authService, formBuilder);
    // form
    this.citation = formBuilder.control(null);
    this.text = formBuilder.control(null, Validators.required);
    this.transform = formBuilder.control('ws');
    // Monaco helper (using 'txt' for plain text)
    this._textHelper = new MonacoEditorHelper(this.text, 'txt');
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();
    this._textHelper.dispose();
  }

  public onCreateEditor(editor: monaco.editor.IEditor) {
    this._textHelper.initEditor(editor);
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      citation: this.citation,
      text: this.text,
    });
  }

  private getTextFromModel(model: TokenTextPart): string | null {
    if (!model || !model.lines) {
      return null;
    }
    return model.lines.map((l) => l.text).join('\n');
  }

  private getLinesFromText(text?: string | null): TokenTextLine[] {
    if (!text) {
      return [];
    }
    // ensure that we just have LF rather than CRLF
    text = text.replace('\r\n', '\n');

    const lines: TokenTextLine[] = [];
    const textLines = text.split('\n');
    let y = 1;
    for (const line of textLines) {
      lines.push({
        y,
        text: line,
      });
      y++;
    }
    return lines;
  }

  private updateForm(part?: TokenTextPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.citation.setValue(part.citation || null);
    this.text.setValue(this.getTextFromModel(part));
    this._textHelper.setValue(this.text.value || '');
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<TokenTextPart>): void {
    this.updateForm(data?.value);
  }

  protected getValue(): TokenTextPart {
    let part = this.getEditedPart(TOKEN_TEXT_PART_TYPEID) as TokenTextPart;
    part.citation = this.citation.value
      ? this.citation.value.trim()
      : undefined;
    part.lines = this.getLinesFromText(this.text.value);
    return part;
  }

  private normalizeWs(text: string): string {
    text = text.replace(/[ \t]+/g, ' ').trim();
    text = text.replace(/[ \t]+([\r\n])/g, '$1');
    text = text.replace(/([\r\n])[ \t]+/g, '$1');
    return text;
  }

  private splitAtStops(text: string): string {
    const crLf = text.indexOf('\r\n') > -1;
    const r = new RegExp('([.?!]+)', 'g');
    const parts: string[] = [];
    let start = 0;
    let m: RegExpExecArray | null;

    while ((m = r.exec(text))) {
      console.log(m[1].length);
      const end = m.index + m[1].length;
      if (end < text.length) {
        parts.push(text.substring(start, end));
        start = end;
      }
    }
    if (start < text.length) {
      parts.push(text.substring(start));
    }
    return parts.map((s) => s.trim()).join(crLf ? '\r\n' : '\n');
  }

  public applyTransform(): void {
    let name: string;
    switch (this.transform.value) {
      case 'ws':
        name = 'whitespace normalization';
        break;
      case 'split':
        name = 'text splitting';
        break;
      default:
        return;
    }

    this._dialogService
      .confirm('Transform Text', `Apply ${name}?`)
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          let text: string = this.text.value || '';

          switch (this.transform.value) {
            case 'ws':
              text = this.normalizeWs(text);
              break;
            case 'split':
              text = this.splitAtStops(text);
              break;
          }
          this.text.setValue(text);
          this._textHelper.setValue(text);
          this.text.updateValueAndValidity();
          this.text.markAsDirty();
        }
      });
  }
}
