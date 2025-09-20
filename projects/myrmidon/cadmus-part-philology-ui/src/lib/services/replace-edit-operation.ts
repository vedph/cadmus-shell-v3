import { EditOperation, OperationType, ParseException } from './edit-operation';

// Replace edit operation
export class ReplaceEditOperation extends EditOperation {
  public replacementText: string = '';

  public get type(): OperationType {
    return OperationType.Replace;
  }

  public execute(input: string): string {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }

    if (this.run < 1) {
      throw new RangeError(`Run ${this.run} is out of range for a replace`);
    }

    EditOperation.validatePosition(input, this.at, this.run);
    return (
      input.slice(0, this.at - 1) +
      this.replacementText +
      input.slice(this.at - 1 + this.run)
    );
  }

  public parse(text: string): void {
    if (!text) {
      throw new Error('Text cannot be null or undefined');
    }

    // pattern: "A"@NxN="B" or @NxN="B"
    const pattern = /(?:"([^"]*)")?\s*@(\d+)(?:[x×](\d+))?\s*=\s*"([^"]*)"/i;
    const match = pattern.exec(text);

    if (!match) {
      throw new ParseException(
        'Invalid replace operation format. Expected: "oldtext"@position="newtext" or @position="newtext"',
        text
      );
    }

    this.inputText = match[1] || undefined;

    const position = parseInt(match[2], 10);
    if (isNaN(position) || position < 1) {
      throw new ParseException('Position must be a positive integer', match[2]);
    }
    this.at = position;

    this.run = 1;
    if (match[3]) {
      const length = parseInt(match[3], 10);
      if (isNaN(length) || length < 1) {
        throw new ParseException('Length must be a positive integer', match[3]);
      }
      this.run = length;
    }

    this.replacementText = match[4];
    this.parseNoteAndTags(text);
  }

  public override toString(): string {
    let result = '';

    if (this.inputText) result += `"${this.inputText}"`;

    result += `@${this.at}`;
    if (this.run > 1) result += `x${this.run}`;
    result += `="${this.replacementText}"`;

    if (this.note) result += ` (${this.note})`;
    if (this.tags.length > 0) result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}
