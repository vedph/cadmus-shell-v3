import { Component, effect, input, output, signal } from '@angular/core';
import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

export interface NumberedChar {
  n: number;
  value: string;
}

interface NumberedCharView extends NumberedChar {
  emSize: number;
  color: string;
  borderColor: string;
  oldColor?: string;
  oldBorderColor?: string;
}

/**
 * A component which displays one or more lines of text character by character.
 */
@Component({
  selector: 'cadmus-char-text-view',
  imports: [ColorToContrastPipe],
  templateUrl: './char-text-view.component.html',
  styleUrl: './char-text-view.component.css',
})
export class CharTextViewComponent {
  private readonly _lastSelectedChar = signal<NumberedChar | undefined>(
    undefined
  );

  /**
   * The default color for the text.
   */
  public readonly defaultColor = input('#DBDBDB');

  /**
   * The default border color for the text.
   */
  public readonly defaultBorderColor = input('#DBDBDB');

  /**
   * The color for the selected text.
   */
  public readonly selectionColor = input('#3E92CC');

  /**
   * True if line numbers should be displayed next to each line.
   */
  public readonly hasLineNumber = input(false);

  /**
   * The lines of text to display. Each line is a string.
   */
  public readonly lines = input<string[]>([]);

  /**
   * An optional callback to get the color of a character.
   * Return null to use the default color.
   */
  public readonly colorCallback = input<
    ((node: string) => string | null) | undefined
  >();

  /**
   * An optional callback to get the color of a character.
   * Return null to use the default color.
   */
  public readonly borderColorCallback = input<
    ((node: string) => string | null) | undefined
  >();

  /**
   * Emitted when a character is picked.
   */
  public readonly charPick = output<NumberedChar>();

  /**
   * Emitted when a range is picked. This is preceded by a character pick event.
   */
  public readonly rangePick = output<NumberedChar[]>();

  /**
   * The rows of characters to display, with their properties.
   */
  public readonly rows = signal<NumberedCharView[][]>([]);

  constructor() {
    // reset _lastSelectedChar when lines change
    effect(() => {
      this.updateRows(this.lines());
      this._lastSelectedChar.set(undefined);
    });
  }

  private updateRows(lines: string[]): void {
    this.rows.set(
      lines.map((line) =>
        line.split('').map((char, index) => ({
          n: index + 1,
          value: char,
          emSize: 1.5,
          color: this.colorCallback()?.(char) || this.defaultColor(),
          borderColor:
            this.borderColorCallback()?.(char) || this.defaultBorderColor(),
        }))
      )
    );
  }

  private resetColors(): void {
    if (!this.rows()) return;

    // set all the colors back to default
    const newRows = this.rows().map((row) =>
      row.map((c) => ({
        ...c,
        color: c.oldColor || this.defaultColor(),
        borderColor: c.oldBorderColor || this.defaultBorderColor(),
      }))
    );
    this.rows.set(newRows);
  }

  public onCharClick(char: NumberedChar, event?: MouseEvent): void {
    // first reset all colors before updating
    this.resetColors();

    const rows = this.rows();
    let newRows = [...rows];

    // find the clicked character's position
    let clickedRowIndex = -1;
    let clickedCharIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const charIndex = rows[i].findIndex(
        (c) => c.n === char.n && c.value === char.value
      );
      if (charIndex !== -1) {
        clickedRowIndex = i;
        clickedCharIndex = charIndex;
        break;
      }
    }

    if (clickedRowIndex === -1) return;

    // check if ctrl key is pressed for range selection
    const isCtrlPressed = event?.ctrlKey || false;

    if (isCtrlPressed && this._lastSelectedChar()) {
      // find the last selected character's position
      const lastSelected = this._lastSelectedChar()!;
      let lastRowIndex = -1;
      let lastCharIndex = -1;

      for (let i = 0; i < rows.length; i++) {
        const charIndex = rows[i].findIndex(
          (c) => c.n === lastSelected.n && c.value === lastSelected.value
        );
        if (charIndex !== -1) {
          lastRowIndex = i;
          lastCharIndex = charIndex;
          break;
        }
      }

      if (lastRowIndex !== -1) {
        // select range between last selected and clicked character
        const selectedChars: NumberedChar[] = [];

        // determine start and end positions
        const startRow = Math.min(lastRowIndex, clickedRowIndex);
        const endRow = Math.max(lastRowIndex, clickedRowIndex);

        for (let rowIdx = startRow; rowIdx <= endRow; rowIdx++) {
          const row = rows[rowIdx];
          let startChar = 0;
          let endChar = row.length - 1;

          if (rowIdx === startRow && rowIdx === endRow) {
            // same row
            startChar = Math.min(lastCharIndex, clickedCharIndex);
            endChar = Math.max(lastCharIndex, clickedCharIndex);
          } else if (rowIdx === startRow) {
            startChar = lastRowIndex < clickedRowIndex ? lastCharIndex : 0;
            endChar =
              lastRowIndex < clickedRowIndex ? row.length - 1 : lastCharIndex;
          } else if (rowIdx === endRow) {
            startChar = lastRowIndex < clickedRowIndex ? 0 : clickedCharIndex;
            endChar =
              lastRowIndex < clickedRowIndex
                ? clickedCharIndex
                : row.length - 1;
          }

          newRows[rowIdx] = row.map((c, idx) => {
            if (idx >= startChar && idx <= endChar) {
              selectedChars.push({ n: c.n, value: c.value });
              return {
                ...c,
                oldColor: c.color,
                oldBorderColor: c.borderColor,
                color: this.selectionColor(),
                borderColor: this.selectionColor(),
              };
            }
            return c;
          });
        }

        this.rows.set(newRows);
        this.rangePick.emit(selectedChars);
        return;
      }
    }

    // single character selection
    newRows[clickedRowIndex] = newRows[clickedRowIndex].map((c, idx) => {
      if (idx === clickedCharIndex) {
        return {
          ...c,
          oldColor: c.color,
          oldBorderColor: c.borderColor,
          color: this.selectionColor(),
          borderColor: this.selectionColor(),
        };
      }
      return c;
    });

    this.rows.set(newRows);
    this._lastSelectedChar.set(char);
    this.charPick.emit(char);
  }
}
