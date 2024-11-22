import { Pipe, PipeTransform } from '@angular/core';
import { Part } from '@myrmidon/cadmus-core';

/**
 * A pipe used locally in the item editor to determine whether
 * any of its parts can be previewed. To this end, this pipe requires
 * the part plus the list of available renderers keys and flatteners
 * keys. When the part is a base text, it is checked against flatteners
 * and renderers; else, it is checked against renderers only.
 * Ideally, a text part should have a flattener, while any other part
 * should have a renderer. When there is no flattener, we fallback
 * to the renderer if any.
 */
@Pipe({
    name: 'hasPreview',
    standalone: false
})
export class HasPreviewPipe implements PipeTransform {
  /**
   * Transform the received part into a boolean value telling whether
   * that part can be previewed or not.
   *
   * @param value The part.
   * @param rKeys The list of available renderers keys.
   * @param fKeys The list of available flatteners keys.
   * @returns True if preview available; else false.
   */
  transform(
    value: Part | undefined | null,
    rKeys: string[] | undefined | null,
    fKeys: string[] | undefined | null
  ): boolean {
    if (!value) {
      return false;
    }
    // the preview key is equal to the typeId, optionally followed by
    // | and the roleId when present (except when it's "base-text")
    if (value.roleId === 'base-text') {
      return fKeys?.find((k) => k === value.typeId) ||
        rKeys?.find((k) => k === value.typeId)
        ? true
        : false;
    }
    const key = value.roleId ? `${value.typeId}|${value.roleId}` : value.typeId;
    return rKeys?.find((k) => k === key) ? true : false;
  }
}
