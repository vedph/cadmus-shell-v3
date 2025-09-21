import { DeleteEditOperation } from './delete-edit-operation';
import { InsertAfterEditOperation } from './insert-after-edit-operation';
import { InsertBeforeEditOperation } from './insert-before-edit-operation';
import { MoveAfterEditOperation } from './move-after-edit-operation';
import { MoveBeforeEditOperation } from './move-before-edit-operation';
import { ReplaceEditOperation } from './replace-edit-operation';
import { SwapEditOperation } from './swap-edit-operation';

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
    return `${this.name}: ${this.message} at "${this.inputSubstring}"` +
      (this.position >= 0 ? ` (position ${this.position})` : '');
  }
}

// Base class for edit operations
export abstract class EditOperation {
  protected static readonly coordinateRegex = /@(\d+)(?:[x×](\d+))?/i;
  protected static readonly noteRegex = /\(([^)]*)\)/;
  protected static readonly tagsRegex = /\[([^\]]*)\]/;

  public abstract get type(): OperationType;
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
