import { EditOperation, OperationType, ParseException } from './edit-operation';

// Insert before edit operation
export class InsertBeforeEditOperation extends EditOperation {
  public get type(): OperationType {
    return OperationType.InsertBefore;
  }

  constructor() {
    super();
    this.text = '';
  }

  public execute(input: string): string {
    if (this.at === 0) return this.text + input;

    EditOperation.validatePosition(input, this.at);
    return input.slice(0, this.at - 1) + this.text + input.slice(this.at - 1);
  }

  public parse(text: string): void {
    if (!text) {
      throw new Error('Text cannot be null or undefined');
    }

    // pattern: @N+="B"
    const pattern = /@(\d+)\s*\+=\s*"([^"]*)"/i;
    const match = pattern.exec(text);

    if (!match) {
      throw new ParseException(
        'Invalid insert-before operation format. Expected: @position+="text"',
        text
      );
    }

    const position = parseInt(match[1], 10);
    if (isNaN(position) || position < 0) {
      throw new ParseException(
        'Position must be a non-negative integer',
        match[1]
      );
    }
    this.at = position;

    this.text = match[2];
    this.parseNoteAndTags(text);
  }

  public override toString(): string {
    let result = `@${this.at}+="${this.text}"`;

    if (this.note) result += ` (${this.note})`;
    if (this.tags && this.tags.length > 0)
      result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}
