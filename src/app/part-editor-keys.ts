import {
  BIBLIOGRAPHY_PART_TYPEID,
  CATEGORIES_PART_TYPEID,
  CHRONOLOGY_FRAGMENT_TYPEID,
  COMMENT_PART_TYPEID,
  COMMENT_FRAGMENT_TYPEID,
  DOC_REFERENCES_PART_TYPEID,
  KEYWORDS_PART_TYPEID,
  HISTORICAL_EVENTS_PART_TYPEID,
  HISTORICAL_DATE_PART_TYPEID,
  INDEX_KEYWORDS_PART_TYPEID,
  METADATA_PART_TYPEID,
  NAMES_PART_TYPEID,
  NOTE_PART_TYPEID,
  TOKEN_TEXT_PART_TYPEID,
  TILED_TEXT_PART_TYPEID,
  CHRONOTOPES_PART_TYPEID,
  EXTERNAL_IDS_PART_TYPEID,
  PHYSICAL_MEASUREMENTS_PART_TYPEID,
  PHYSICAL_STATES_PART_TYPEID,
  PIN_LINKS_PART_TYPEID,
  PIN_LINKS_FRAGMENT_TYPEID,
  DECORATED_COUNTS_PART_TYPEID,
} from '../../projects/myrmidon/cadmus-part-general-ui/src/public-api';
import {
  APPARATUS_FRAGMENT_TYPEID,
  ORTHOGRAPHY_FRAGMENT_TYPEID,
  WITNESSES_FRAGMENT_TYPEID,
  QUOTATIONS_FRAGMENT_TYPEID,
} from '../../projects/myrmidon/cadmus-part-philology-ui/src/public-api';
import { PartEditorKeys } from '../../projects/myrmidon/cadmus-core/src/public-api';
import { DISTRICT_LOCATION_PART_TYPEID } from '../../projects/myrmidon/cadmus-part-general-ui/src/public-api';

const GENERAL = 'general';
const PHILOLOGY = 'philology';
const TOKEN_TEXT_LAYER_PART_TYPEID = 'it.vedph.token-text-layer';
const TILED_TEXT_LAYER_PART_TYPEID = 'it.vedph.tiled-text-layer';

/**
 * The parts and fragments editor keys for this UI.
 * Each property is a part type ID, mapped to a value of type PartGroupKey,
 * having a part property with the part's editor key, and a fragments property
 * with the mappings between fragment type IDs and their editor keys.
 */
export const PART_EDITOR_KEYS: PartEditorKeys = {
  // general parts
  [BIBLIOGRAPHY_PART_TYPEID]: {
    part: GENERAL,
  },
  [CATEGORIES_PART_TYPEID]: {
    part: GENERAL,
  },
  [COMMENT_PART_TYPEID]: {
    part: GENERAL,
  },
  [DECORATED_COUNTS_PART_TYPEID]: {
    part: GENERAL,
  },
  [DISTRICT_LOCATION_PART_TYPEID]: {
    part: GENERAL,
  },
  [DOC_REFERENCES_PART_TYPEID]: {
    part: GENERAL,
  },
  [HISTORICAL_DATE_PART_TYPEID]: {
    part: GENERAL,
  },
  [CHRONOTOPES_PART_TYPEID]: {
    part: GENERAL,
  },
  [EXTERNAL_IDS_PART_TYPEID]: {
    part: GENERAL,
  },
  [HISTORICAL_EVENTS_PART_TYPEID]: {
    part: GENERAL,
  },
  [INDEX_KEYWORDS_PART_TYPEID]: {
    part: GENERAL,
  },
  [KEYWORDS_PART_TYPEID]: {
    part: GENERAL,
  },
  [METADATA_PART_TYPEID]: {
    part: GENERAL,
  },
  [NAMES_PART_TYPEID]: {
    part: GENERAL,
  },
  [NOTE_PART_TYPEID]: {
    part: GENERAL,
  },
  [PHYSICAL_MEASUREMENTS_PART_TYPEID]: {
    part: GENERAL,
  },
  [PHYSICAL_STATES_PART_TYPEID]: {
    part: GENERAL,
  },
  [PIN_LINKS_PART_TYPEID]: {
    part: GENERAL,
  },
  [TILED_TEXT_PART_TYPEID]: {
    part: GENERAL,
  },
  [TOKEN_TEXT_PART_TYPEID]: {
    part: GENERAL,
  },
  // layer parts
  [TOKEN_TEXT_LAYER_PART_TYPEID]: {
    part: GENERAL,
    fragments: {
      [CHRONOLOGY_FRAGMENT_TYPEID]: GENERAL,
      [COMMENT_FRAGMENT_TYPEID]: GENERAL,
      [APPARATUS_FRAGMENT_TYPEID]: PHILOLOGY,
      [ORTHOGRAPHY_FRAGMENT_TYPEID]: PHILOLOGY,
      [PIN_LINKS_FRAGMENT_TYPEID]: GENERAL,
      [QUOTATIONS_FRAGMENT_TYPEID]: PHILOLOGY,
      [WITNESSES_FRAGMENT_TYPEID]: PHILOLOGY,
    },
  },
  [TILED_TEXT_LAYER_PART_TYPEID]: {
    part: GENERAL,
    fragments: {
      [CHRONOLOGY_FRAGMENT_TYPEID]: GENERAL,
      [COMMENT_FRAGMENT_TYPEID]: GENERAL,
      [APPARATUS_FRAGMENT_TYPEID]: PHILOLOGY,
      [ORTHOGRAPHY_FRAGMENT_TYPEID]: PHILOLOGY,
      [PIN_LINKS_FRAGMENT_TYPEID]: GENERAL,
      [QUOTATIONS_FRAGMENT_TYPEID]: PHILOLOGY,
      [WITNESSES_FRAGMENT_TYPEID]: PHILOLOGY,
    },
  },
};
