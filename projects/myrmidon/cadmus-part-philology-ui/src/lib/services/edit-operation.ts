// Operation type enumeration
export enum OperationType {
  Replace = 'Replace',
  Delete = 'Delete',
  InsertBefore = 'InsertBefore',
  InsertAfter = 'InsertAfter',
  MoveBefore = 'MoveBefore',
  MoveAfter = 'MoveAfter',
  Swap = 'Swap',
}

// Custom exception for parsing errors
export class ParseException extends Error {
  public readonly inputSubstring: string;
  public readonly position: number;

  constructor(message: string, inputSubstring: string, position: number = -1) {
    super(message);
    this.name = 'ParseException';
    this.inputSubstring = inputSubstring;
    this.position = position;
  }

  public override toString(): string {
    return (
      `${this.name}: ${this.message} at "${this.inputSubstring}"` +
      (this.position >= 0 ? ` (position ${this.position})` : '')
    );
  }
}

// Base class for edit operations
export abstract class EditOperation {
  protected static readonly coordinateRegex = /@(\d+)(?:[x×](\d+))?/i;
  protected static readonly noteRegex = /\(([^)]*)\)/;
  protected static readonly tagsRegex = /\[([^\]]*)\]/;

  public type: OperationType = OperationType.Replace;
  public inputText?: string;
  public at: number = 1;
  public run: number = 1;
  public note?: string;
  public tags?: string[];

  public text?: string; // for insert/replace operations
  public to?: number; // for move/swap operations
  public toRun?: number; // for move/swap operations

  public abstract execute(input: string): string;
  public abstract parse(text: string): void;

  protected parseCoordinates(text: string): [number, number] {
    const coordsMatch = EditOperation.coordinateRegex.exec(text);
    if (!coordsMatch) {
      throw new ParseException(
        'Invalid coordinate format. Expected @N or @NxN',
        text
      );
    }

    const position = parseInt(coordsMatch[1], 10);
    if (isNaN(position) || position < 1) {
      throw new ParseException(
        'Position must be a positive integer',
        coordsMatch[1]
      );
    }

    let length = 1;
    if (coordsMatch[2]) {
      length = parseInt(coordsMatch[2], 10);
      if (isNaN(length) || length < 1) {
        throw new ParseException(
          'Length must be a positive integer',
          coordsMatch[2]
        );
      }
    }
    return [position, length];
  }

  protected parseNoteAndTags(input: string): void {
    const noteMatch = EditOperation.noteRegex.exec(input);
    if (noteMatch) {
      this.note = noteMatch[1].trim();
    }

    const tagsMatch = EditOperation.tagsRegex.exec(input);
    if (tagsMatch) {
      const tagsText = tagsMatch[1].trim();
      if (tagsText) {
        this.tags = tagsText.split(/[\s\t]+/).filter((tag) => tag.length > 0);
      }
    }
  }

  protected static extractQuotedText(input: string, pattern: string): string {
    const match = new RegExp(pattern, 'i').exec(input);
    return match ? match[1] : '';
  }

  protected static validatePosition(
    input: string,
    position: number,
    length: number = 1
  ): void {
    if (position < 1 || position > input.length) {
      throw new RangeError(
        `Position ${position} is out of range for input string of length ${input.length}`
      );
    }
    if (position + length - 1 > input.length) {
      throw new RangeError(
        `Length ${length} at position ${position} exceeds input string length ${input.length}`
      );
    }
  }

  public static parseOperation(text: string): EditOperation {
    if (!text || text.trim().length === 0) {
      throw new ParseException('DSL text cannot be empty', text);
    }

    try {
      // Determine operation type based on operators
      if (text.includes('!')) {
        return this.parseTypedOperation<DeleteEditOperation>(
          DeleteEditOperation,
          text
        );
      } else if (text.includes('+=')) {
        return this.parseTypedOperation<InsertBeforeEditOperation>(
          InsertBeforeEditOperation,
          text
        );
      } else if (text.includes('=+')) {
        return this.parseTypedOperation<InsertAfterEditOperation>(
          InsertAfterEditOperation,
          text
        );
      } else if (text.includes('<>')) {
        return this.parseTypedOperation<SwapEditOperation>(
          SwapEditOperation,
          text
        );
      } else if (text.includes('->')) {
        return this.parseTypedOperation<MoveAfterEditOperation>(
          MoveAfterEditOperation,
          text
        );
      } else if (text.includes('>')) {
        return this.parseTypedOperation<MoveBeforeEditOperation>(
          MoveBeforeEditOperation,
          text
        );
      } else if (text.includes('=')) {
        return this.parseTypedOperation<ReplaceEditOperation>(
          ReplaceEditOperation,
          text
        );
      } else {
        throw new ParseException('Unknown operation type', text);
      }
    } catch (error) {
      if (error instanceof ParseException) {
        throw error;
      }
      throw new ParseException(`Error parsing operation: ${error}`, text);
    }
  }

  public static createOperation(type: OperationType): EditOperation {
    switch (type) {
      case OperationType.Delete:
        return new DeleteEditOperation();
      case OperationType.Replace:
        return new ReplaceEditOperation();
      case OperationType.InsertBefore:
        return new InsertBeforeEditOperation();
      case OperationType.InsertAfter:
        return new InsertBeforeEditOperation();
      case OperationType.MoveBefore:
        return new MoveBeforeEditOperation();
      case OperationType.MoveAfter:
        return new MoveAfterEditOperation();
      case OperationType.Swap:
        return new SwapEditOperation();
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  private static parseTypedOperation<T extends EditOperation>(
    ctor: new () => T,
    dslText: string
  ): T {
    const operation = new ctor();
    operation.parse(dslText);
    return operation;
  }

  private static isUniqueAddedText(
    ops: EditOperation[],
    text: string,
    excludeIndex: number,
    insertOnly: boolean
  ): boolean {
    let count = 0;

    for (let i = 0; i < ops.length; i++) {
      if (i === excludeIndex) continue;

      const op = ops[i];
      let addedText: string | undefined;

      if (op instanceof InsertBeforeEditOperation) {
        addedText = op.text;
      } else if (op instanceof InsertAfterEditOperation) {
        addedText = op.text;
      } else if (!insertOnly && op instanceof ReplaceEditOperation) {
        addedText = op.text;
      }

      if (addedText === text) {
        count++;
        if (count > 0) return false; // more than one operation adds this text
      }
    }

    return true;
  }

  private static getTargetPositionForMove(
    addOp: EditOperation,
    deleteOp: DeleteEditOperation
  ): number {
    let targetPos = addOp.at;

    // adjust for the delete operation that would have been applied before
    // this add operation. If the add operation's position is after the
    // delete position, we need to account for the deleted characters when
    // mapping back to original coordinates
    if (targetPos > deleteOp.at) targetPos += deleteOp.run;

    if (addOp instanceof InsertBeforeEditOperation) {
      return targetPos;
    } else if (addOp instanceof InsertAfterEditOperation) {
      return targetPos + 1;
    } else if (addOp instanceof ReplaceEditOperation) {
      return targetPos;
    }
    return targetPos;
  }

  private static adjustDiffOperations(
    ops: EditOperation[],
    insertOnly: boolean = false
  ): EditOperation[] {
    if (ops.length < 2) return [...ops];

    const adjusted: EditOperation[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < ops.length; i++) {
      if (processed.has(i)) continue;

      const currentOp = ops[i];

      // look for delete operations
      if (currentOp instanceof DeleteEditOperation && currentOp.inputText) {
        const deletedText = currentOp.inputText;
        let matchingOpIndex = -1;

        // find a matching insert or replace operation
        for (let j = 0; j < ops.length; j++) {
          if (j === i || processed.has(j)) continue;

          const otherOp = ops[j];
          let addedText: string | undefined;

          // check insert operations
          if (otherOp instanceof InsertBeforeEditOperation) {
            addedText = otherOp.text;
          } else if (otherOp instanceof InsertAfterEditOperation) {
            addedText = otherOp.text;
          } else if (!insertOnly && otherOp instanceof ReplaceEditOperation) {
            addedText = otherOp.text;
          }

          // check if the deleted text matches the added text
          if (addedText === deletedText) {
            // verify this is the only operation adding this text
            if (this.isUniqueAddedText(ops, deletedText, j, insertOnly)) {
              matchingOpIndex = j;
              break;
            }
          }
        }

        if (matchingOpIndex >= 0) {
          // create a move operation instead
          const addOp = ops[matchingOpIndex];

          const moveOp = new MoveBeforeEditOperation();
          moveOp.at = currentOp.at;
          moveOp.run = currentOp.run;
          moveOp.to = this.getTargetPositionForMove(addOp, currentOp);
          moveOp.inputText = currentOp.inputText;
          moveOp.note = currentOp.note;
          moveOp.tags = currentOp.tags ? [...currentOp.tags] : [];

          // copy notes and tags from the add operation if
          // the delete operation doesn't have them
          if (!moveOp.note && addOp.note) {
            moveOp.note = addOp.note;
          }

          if (moveOp.tags.length === 0 && addOp.tags && addOp.tags.length > 0) {
            moveOp.tags = [...addOp.tags];
          }

          adjusted.push(moveOp);
          processed.add(i);
          processed.add(matchingOpIndex);
        } else {
          adjusted.push(currentOp);
          processed.add(i);
        }
      } else {
        adjusted.push(currentOp);
        processed.add(i);
      }
    }

    return adjusted;
  }

  public static diff(
    source: string,
    target: string,
    includeInputText: boolean = true,
    adjust: boolean = true,
    insertOnly: boolean = false
  ): EditOperation[] {
    const operations: EditOperation[] = [];

    if ((!source || source.length === 0) && (!target || target.length === 0)) {
      return operations;
    }

    if (!source || source.length === 0) {
      // insert all characters from target
      const insert = new InsertAfterEditOperation();
      insert.at = 0;
      insert.text = target;
      insert.inputText = includeInputText ? '' : undefined;
      operations.push(insert);
      return operations;
    }

    if (!target || target.length === 0) {
      // Delete entire source
      const deleteOp = new DeleteEditOperation();
      deleteOp.at = 1;
      deleteOp.run = source.length;
      deleteOp.inputText = includeInputText ? source : undefined;
      operations.push(deleteOp);
      return operations;
    }

    // simple character-by-character comparison
    let sourceIndex = 0;
    let targetIndex = 0;
    let currentPosition = 1;

    while (sourceIndex < source.length && targetIndex < target.length) {
      if (source[sourceIndex] === target[targetIndex]) {
        sourceIndex++;
        targetIndex++;
        currentPosition++;
      } else {
        // look ahead to see if we can find a match
        const nextMatchInSource = this.findNextMatch(
          source,
          sourceIndex,
          target[targetIndex]
        );
        const nextMatchInTarget = this.findNextMatch(
          target,
          targetIndex,
          source[sourceIndex]
        );

        if (
          nextMatchInSource >= 0 &&
          (nextMatchInTarget < 0 || nextMatchInSource <= nextMatchInTarget)
        ) {
          // delete characters from source
          const deletedText = source.slice(sourceIndex, nextMatchInSource);
          const deleteOp = new DeleteEditOperation();
          deleteOp.at = currentPosition;
          deleteOp.run = deletedText.length;
          deleteOp.inputText = includeInputText ? deletedText : undefined;
          operations.push(deleteOp);
          sourceIndex = nextMatchInSource;
        } else if (nextMatchInTarget >= 0) {
          // insert characters into target
          const insertedText = target.slice(targetIndex, nextMatchInTarget);
          const insert = new InsertBeforeEditOperation();
          insert.at = currentPosition;
          insert.text = insertedText;
          insert.inputText = includeInputText ? '' : undefined;
          operations.push(insert);
          targetIndex = nextMatchInTarget;
          currentPosition += insertedText.length;
        } else {
          // replace single character
          const replace = new ReplaceEditOperation();
          replace.at = currentPosition;
          replace.run = 1;
          replace.text = target[targetIndex];
          replace.inputText = includeInputText
            ? source[sourceIndex]
            : undefined;
          operations.push(replace);
          sourceIndex++;
          targetIndex++;
          currentPosition++;
        }
      }
    }

    // handle remaining characters
    if (sourceIndex < source.length) {
      const remainingSource = source.slice(sourceIndex);
      const deleteOp = new DeleteEditOperation();
      deleteOp.at = currentPosition;
      deleteOp.run = remainingSource.length;
      deleteOp.inputText = includeInputText ? remainingSource : undefined;
      operations.push(deleteOp);
    }

    if (targetIndex < target.length) {
      const remainingTarget = target.slice(targetIndex);
      const insert = new InsertAfterEditOperation();
      insert.at = currentPosition - 1;
      insert.text = remainingTarget;
      insert.inputText = includeInputText ? '' : undefined;
      operations.push(insert);
    }

    // apply adjustments if requested
    if (adjust) {
      return this.adjustDiffOperations(operations, insertOnly);
    }

    return operations;
  }

  private static findNextMatch(
    text: string,
    startIndex: number,
    target: string
  ): number {
    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === target) {
        return i;
      }
    }
    return -1;
  }
}

// Delete edit operation
export class DeleteEditOperation extends EditOperation {
  constructor() {
    super();
    this.type = OperationType.Delete;
  }

  public execute(input: string): string {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }

    EditOperation.validatePosition(input, this.at, this.run);
    return input.slice(0, this.at - 1) + input.slice(this.at - 1 + this.run);
  }

  public parse(text: string): void {
    if (!text) {
      throw new Error('Text cannot be null or undefined');
    }

    // pattern: "A"@NxN! or @NxN!
    const pattern = /(?:"([^"]*)")?\s*@(\d+)(?:[x×](\d+))?\s*!/i;
    const match = pattern.exec(text);

    if (!match) {
      throw new ParseException(
        'Invalid delete operation format. Expected: "text"@position! or @position!',
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

    this.parseNoteAndTags(text);
  }

  public override toString(): string {
    let result = '';

    if (this.inputText) {
      result += `"${this.inputText}"`;
    }

    result += `@${this.at}`;
    if (this.run > 1) result += `x${this.run}`;
    result += '!';

    if (this.note) result += ` (${this.note})`;
    if (this.tags && this.tags.length > 0)
      result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}

// Insert after edit operation
export class InsertAfterEditOperation extends EditOperation {
  constructor() {
    super();
    this.type = OperationType.InsertAfter;
    this.text = '';
  }

  public execute(input: string): string {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }

    if (this.at === 0) return input + (this.text || '');

    EditOperation.validatePosition(input, this.at);
    return input.slice(0, this.at) + (this.text || '') + input.slice(this.at);
  }

  public parse(text: string): void {
    if (!text) {
      throw new Error('Text cannot be null or undefined');
    }

    // pattern: @N=+"B"
    const pattern = /@(\d+)\s*=\+\s*"([^"]*)"/i;
    const match = pattern.exec(text);

    if (!match) {
      throw new ParseException(
        'Invalid insert-after operation format. Expected: @position=+"text"',
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
    let result = `@${this.at}=+"${this.text || ''}"`;

    if (this.note) result += ` (${this.note})`;
    if (this.tags && this.tags.length > 0)
      result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}

// Insert before edit operation
export class InsertBeforeEditOperation extends EditOperation {
  constructor() {
    super();
    this.type = OperationType.InsertBefore;
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

// Move after edit operation
export class MoveAfterEditOperation extends EditOperation {
  constructor() {
    super();
    this.type = OperationType.MoveAfter;
    this.to = 1;
  }

  public execute(input: string): string {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }

    EditOperation.validatePosition(input, this.at, this.run);
    EditOperation.validatePosition(input, this.to!);

    const textToMove = input.slice(this.at - 1, this.at - 1 + this.run);
    let result =
      input.slice(0, this.at - 1) + input.slice(this.at - 1 + this.run);

    // adjust target position if it's after the removed text
    let adjustedTargetPosition = this.to!;
    if (this.to! > this.at) adjustedTargetPosition -= this.run;

    // insert after target position
    result =
      result.slice(0, adjustedTargetPosition) +
      textToMove +
      result.slice(adjustedTargetPosition);

    return result;
  }

  public parse(text: string): void {
    if (!text) {
      throw new Error('Text cannot be null or undefined');
    }

    // pattern: "A"@N->@M or @N->@M
    const pattern = /(?:"([^"]*)")?\s*@(\d+)(?:[x×](\d+))?\s*->\s*@(\d+)/i;
    const match = pattern.exec(text);

    if (!match) {
      throw new ParseException(
        'Invalid move-after operation format. ' +
          'Expected: "text"@position->@targetposition or @position->@targetposition',
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
    result += `->@${this.to}`;

    if (this.note) result += ` (${this.note})`;
    if (this.tags && this.tags.length > 0)
      result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}

// Move before edit operation
export class MoveBeforeEditOperation extends EditOperation {
  constructor() {
    super();
    this.type = OperationType.MoveBefore;
    this.to = 1;
  }

  public execute(input: string): string {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }

    EditOperation.validatePosition(input, this.at, this.run);
    EditOperation.validatePosition(input, this.to!);

    const textToMove = input.slice(this.at - 1, this.at - 1 + this.run);
    let result =
      input.slice(0, this.at - 1) + input.slice(this.at - 1 + this.run);

    // adjust target position if it's after the removed text
    let adjustedTargetPosition = this.to!;
    if (this.to! > this.at) {
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
    if (this.tags && this.tags.length > 0)
      result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}

// Replace edit operation
export class ReplaceEditOperation extends EditOperation {
  constructor() {
    super();
    this.type = OperationType.Replace;
    this.run = 1;
    this.text = '';
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
      (this.text || '') +
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

    this.text = match[4];
    this.parseNoteAndTags(text);
  }

  public override toString(): string {
    let result = '';

    if (this.inputText) result += `"${this.inputText}"`;

    result += `@${this.at}`;
    if (this.run > 1) result += `x${this.run}`;
    result += `="${this.text || ''}"`;

    if (this.note) result += ` (${this.note})`;
    if (this.tags && this.tags.length > 0)
      result += ` [${this.tags.join(' ')}]`;

    return result;
  }
}

// Swap edit operation
export class SwapEditOperation extends EditOperation {
  public inputText2?: string;

  constructor() {
    super();
    this.type = OperationType.Swap;
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
