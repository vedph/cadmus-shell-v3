import { Fragment } from '@myrmidon/cadmus-core';

/**
 * The orthography layer fragment server model.
 */
export interface OrthographyFragment extends Fragment {
  reference: string;
  language?: string;
  tags?: string[];
  note?: string;
  operations?: string[];
  isTextTarget?: boolean;
}

export const ORTHOGRAPHY_FRAGMENT_TYPEID = 'fr.it.vedph.orthography';

export const ORTHOGRAPHY_FRAGMENT_SCHEMA = {
  definitions: {},
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/fragments/philology/' +
    ORTHOGRAPHY_FRAGMENT_TYPEID +
    '.json',
  type: 'object',
  title: 'OrthographyFragment',
  required: ['location', 'reference'],
  properties: {
    location: {
      $id: '#/properties/location',
      type: 'string',
    },
    baseText: {
      $id: '#/properties/baseText',
      type: 'string',
    },
    reference: {
      $id: '#/properties/reference',
      type: 'string',
    },
    language: {
      $id: '#/properties/language',
      type: 'string',
    },
    tags: {
      $id: '#/properties/tags',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    note: {
      $id: '#/properties/note',
      type: 'string',
    },
    operations: {
      $id: '#/properties/operations',
      type: 'array',
      items: {
        $id: '#/properties/operations/items',
        type: 'string',
        pattern:
          '(?:"([^"]+)")?\\@(\\d+)(?:[x×](\\d+))?\\s*([=>~])\\s*(?:"([^"]*)")?(?:\\@(\\d+)(?:[x×](\\d+))?)?(?:\\s*\\[([^\\]{]+)\\])?(?:\\s*\\{([^}]+)})?',
      },
    },
    isTextTarget: {
      $id: '#/properties/isTextTarget',
      type: 'boolean',
    },
  },
};
