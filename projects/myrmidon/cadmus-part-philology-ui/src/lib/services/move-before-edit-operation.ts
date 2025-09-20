import { EditOperation, OperationType, ParseException } from './edit-operation';

// Move before edit operation
export class MoveBeforeEditOperation extends EditOperation {
  public to: number = 0;

  public get type(): OperationType {
    return OperationType.MoveBefore;
  }

  public execute(input: string): string {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }

    EditOperation.validatePosition(input, this.at, this.run);
    EditOperation.validatePosition(input, this.to);

    const textToMove = input.slice(this.at - 1, this.at - 1 + this.run);
    let result =
      input.slice(0, this.at - 1) + input.slice(this.at - 1 + this.run);

    // adjust target position if it's after the removed text
    let adjustedTargetPosition = this.to;
    if (this.to > this.at) {
      adjustedTargetPosition -= this.run;
    }

    // insert at target position
    result =
      result.slice(0, adjustedTargetPosition - 1) +
      textToMove +
      result.slice(adjustedTargetPosition - 1);

    return result;
  }

  public parse(text: string): void {
    if (!text) {
      throw new Error('Text cannot be null or undefined');
    }

    // pattern: "A"@N>@M or @N>@M
    const pattern = /(?:"([^"]*)")?\s*@(\d+)(?:[x×](\d+))?\s*>\s*@(\d+)/i;
    const match = pattern.exec(text);

    if (!match) {
      throw new ParseException(
        'Invalid move-before operation format. ' +
          'Expected: "text"@position>@targetposition or @position>@targetposition',
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

    const targetPosition = parseInt(match[4], 10);
    if (isNaN(targetPosition) || targetPosition < 1) {
      throw new ParseException(
        'Target position must be a positive integer',
        match[4]
      );
    }
    this.to = targetPosition;

    this.parseNoteAndTags(text);
  }

  public override toString(): string {
    let result = '';

    if (this.inputText) result += `"${this.inputText}"`;

    result += `@${this.at}`;
    if (this.run > 1) result += `x${this.run}`;
    result += `>@${this.to}`;

    if (this.note) result += ` (${this.note})`;
    if (this.tags.length > 0) result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}
