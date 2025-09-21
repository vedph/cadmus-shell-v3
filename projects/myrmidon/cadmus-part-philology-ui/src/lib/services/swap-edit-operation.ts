import { EditOperation, OperationType, ParseException } from './edit-operation';

// Swap edit operation
export class SwapEditOperation extends EditOperation {
  public inputText2?: string;

  public get type(): OperationType {
    return OperationType.Swap;
  }

  constructor() {
    super();
    this.at = 1;
    this.run = 1;
    this.to = 1;
    this.toRun = 1;
  }

  public execute(input: string): string {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }

    EditOperation.validatePosition(input, this.at, this.run);
    EditOperation.validatePosition(input, this.to!, this.toRun);

    if (
      this.at === this.to! ||
      (this.at < this.to! && this.at + this.run > this.to!) ||
      (this.to! < this.at && this.to! + this.toRun! > this.at)
    ) {
      throw new Error('Swap positions cannot overlap');
    }

    const firstText = input.slice(this.at - 1, this.at - 1 + this.run);
    const secondText = input.slice(this.to! - 1, this.to! - 1 + this.toRun!);

    let result = input;

    // replace in order of highest position first to avoid index shifting
    if (this.at > this.to!) {
      result =
        result.slice(0, this.at - 1) +
        secondText +
        result.slice(this.at - 1 + this.run);
      result =
        result.slice(0, this.to! - 1) +
        firstText +
        result.slice(this.to! - 1 + this.toRun!);
    } else {
      result =
        result.slice(0, this.to! - 1) +
        firstText +
        result.slice(this.to! - 1 + this.toRun!);
      result =
        result.slice(0, this.at - 1) +
        secondText +
        result.slice(this.at - 1 + this.run);
    }

    return result;
  }

  public parse(text: string): void {
    if (!text) {
      throw new Error('Text cannot be null or undefined');
    }

    // pattern: "A"@NxN<>"B"@MxM or @NxN<>@MxM
    const pattern =
      /(?:"([^"]*)")?\s*@(\d+)(?:[x×](\d+))?\s*<>\s*(?:"([^"]*)")?\s*@(\d+)(?:[x×](\d+))?/i;
    const match = pattern.exec(text);

    if (!match) {
      throw new ParseException(
        'Invalid swap operation format. Expected: "text1"@position1<>"text2"@position2',
        text
      );
    }

    this.inputText = match[1] || undefined;

    const position = parseInt(match[2], 10);
    if (isNaN(position) || position < 1) {
      throw new ParseException(
        'First position must be a positive integer',
        match[2]
      );
    }
    this.at = position;

    this.run = 1;
    if (match[3]) {
      const length = parseInt(match[3], 10);
      if (isNaN(length) || length < 1) {
        throw new ParseException(
          'First length must be a positive integer',
          match[3]
        );
      }
      this.run = length;
    }

    this.inputText2 = match[4] || undefined;

    const secondPosition = parseInt(match[5], 10);
    if (isNaN(secondPosition) || secondPosition < 1) {
      throw new ParseException(
        'Second position must be a positive integer',
        match[5]
      );
    }
    this.to = secondPosition;

    this.toRun = 1;
    if (match[6]) {
      const secondLength = parseInt(match[6], 10);
      if (isNaN(secondLength) || secondLength < 1) {
        throw new ParseException(
          'Second length must be a positive integer',
          match[6]
        );
      }
      this.toRun = secondLength;
    }

    this.parseNoteAndTags(text);
  }

  public override toString(): string {
    let result = '';

    if (this.inputText) result += `"${this.inputText}"`;

    result += `@${this.at}`;
    if (this.run > 1) result += `x${this.run}`;
    result += '<>';

    if (this.inputText2) result += `"${this.inputText2}"`;

    result += `@${this.to}`;
    if (this.toRun! > 1) result += `x${this.toRun!}`;

    if (this.note) result += ` (${this.note})`;
    if (this.tags && this.tags.length > 0)
      result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}
