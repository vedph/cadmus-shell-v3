import { of } from 'rxjs';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { Part } from '@myrmidon/cadmus-core';
import { PartEditorService } from '@myrmidon/cadmus-state';
import { deepCopy } from '@myrmidon/ngx-tools';

/**
 * The error message returned when trying to save from a history view.
 */
export const HISTORY_READONLY_MESSAGE =
  'This is a version from history and cannot be saved from here';

/**
 * Create a `PartEditorService` replacing the default one for a part editor
 * wrapper (feature) displaying the specified version of a part from
 * history. This loads the specified part (rather than the one with the
 * routed ID) with the thesauri requested by the wrapper, honoring the
 * thesaurus scope of the version; and always refuses to save.
 *
 * This lets the history view reuse unchanged any part editor wrapper
 * derived from `EditPartFeatureBase`, which loads its data via
 * `PartEditorService.load` in its `ngOnInit`.
 *
 * @param part The part version to load.
 * @param thesaurusService The thesaurus service.
 * @returns The service.
 */
export function createHistoryPartEditorService(
  part: Part,
  thesaurusService: ThesaurusService,
): PartEditorService {
  // reuse the loading logic of the default service (thesauri, scopes...)
  // with an item service which returns the version from history
  const itemService = {
    getPart: () => of(deepCopy(part)),
  } as unknown as ItemService;
  const service = new PartEditorService(itemService, thesaurusService);
  service.save = () =>
    Promise.reject({
      message: HISTORY_READONLY_MESSAGE,
      error: HISTORY_READONLY_MESSAGE,
    });
  return service;
}
