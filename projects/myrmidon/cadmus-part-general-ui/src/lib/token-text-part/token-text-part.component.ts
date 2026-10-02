import {
  ChangeDetectionStrategy,
  Component,
  linkedSignal,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormField, required } from '@angular/forms/signals';
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

import {
  NgxMonacoEditorComponent,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  setFieldFromEditor,
} from '@myrmidon/cadmus-ui';

import {
  TokenTextPart,
  TOKEN_TEXT_PART_TYPEID,
  TokenTextLine,
} from '../token-text-part';

interface TokenTextPartControls {
  citation: string;
  text: string;
}

function getTextFromModel(model?: TokenTextPart | null): string {
  if (!model || !model.lines) {
    return '';
  }
  return model.lines.map((l) => l.text).join('\n');
}

function toDraft(part?: TokenTextPart | null): TokenTextPartControls {
  return {
    citation: part?.citation || '',
    text: getTextFromModel(part),
  };
}

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
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
    NgxMonacoEditorComponent,
    MatError,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class TokenTextPartComponent extends ModelEditorComponentBase<TokenTextPart> {
  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    required(p.text);
  });

  /**
   * Set a text field from its editor. See setFieldFromEditor.
   */
  public setFieldFromEditor = setFieldFromEditor;

  // the selected text transformation (not part of the edited model)
  public readonly transform = signal<string>('ws');

  constructor(private _dialogService: DialogService) {
    super();
  }

  private getLinesFromText(text?: string | null): TokenTextLine[] {
    if (!text) {
      return [];
    }
    // ensure that we just have LF rather than CRLF.
    // NOTE: String.replace() with a plain string pattern (no /g flag) only
    // replaces the FIRST occurrence. With multi-line CRLF text this left a
    // stray '\r' at the end of every line after the first one (e.g.
    // "a\r\nb\r\nc" became "a\nb\r\nc", so splitting on '\n' produced lines
    // "a", "b\r", "c" instead of "a", "b", "c"). Using a global regex fixes
    // this by normalizing every CRLF occurrence.
    text = text.replace(/\r\n/g, '\n');

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

  protected getValue(): TokenTextPart {
    let part = this.getEditedPart(TOKEN_TEXT_PART_TYPEID) as TokenTextPart;
    const draft = this._draft();
    part.citation = draft.citation.trim() || undefined;
    part.lines = this.getLinesFromText(draft.text);
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
    switch (this.transform()) {
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
          let text: string = this.form.text().value() || '';

          switch (this.transform()) {
            case 'ws':
              text = this.normalizeWs(text);
              break;
            case 'split':
              text = this.splitAtStops(text);
              break;
          }
          this.form.text().value.set(text);
          this.form.text().markAsDirty();
        }
      });
  }
}
