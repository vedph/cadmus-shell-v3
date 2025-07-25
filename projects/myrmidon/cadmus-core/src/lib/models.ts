/**
 * Interface implemented by versioned storage objects.
 */
export interface HasVersion {
  timeCreated: Date;
  creatorId: string;
  timeModified: Date;
  userId: string;
}

/**
 * Item's properties, excluding its parts.
 */
export interface Item extends HasVersion {
  id: string;
  title: string;
  description: string;
  facetId: string;
  groupId: string;
  sortKey: string;
  flags: number;
  parts?: Part[];
}

/**
 * Flags matching mode.
 */
export enum FlagMatching {
  // the none value is frontend-side only, as in the backend
  // the flags property in ItemFilter is nullable
  none = -1,
  bitsAllSet = 0,
  bitsAnySet,
  bitsAllClear,
  bitsAnyClear,
}

/**
 * Filter for items.
 */
export interface ItemFilter {
  title?: string;
  description?: string;
  facetId?: string;
  groupId?: string;
  flags?: number;
  flagMatching?: FlagMatching;
  minModified?: Date;
  maxModified?: Date;
  userId?: string;
}

/**
 * Essential information about an item.
 */
export interface ItemInfo extends HasVersion {
  id: string;
  title: string;
  description: string;
  facetId: string;
  groupId: string;
  sortKey: string;
  flags: number;
  payload?: any;
}

/**
 * Information about a data pin; returned by pins search.
 */
export interface DataPinInfo {
  itemId: string;
  partId: string;
  roleId: string | null;
  partTypeId: string;
  name: string;
  value: string;
  tag?: string;
}

/**
 * Data pin value type in a DataPinDefinition.
 */
export enum DataPinValueType {
  string = 0,
  boolean,
  integer,
  decimal,
}

/**
 * Definition of a data pin.
 */
export interface DataPinDefinition {
  name: string;
  type: DataPinValueType;
  tip?: string;
  attributes?: string;
}

/**
 * Part type and role IDs.
 */
export interface PartTypeIds {
  typeId: string;
  roleId?: string;
}

/**
 * Part. This is the minimal set of properties present in all the
 * parts. Each part then adds its own properties, extending this interface.
 */
export interface Part extends HasVersion, PartTypeIds {
  id: string;
  itemId: string;
  thesaurusScope?: string;
}

/**
 * Essential information about a layer part.
 */
export interface LayerPartInfo extends HasVersion, PartTypeIds {
  id: string;
  itemId: string;
  fragmentCount: number;
  isAbsent: boolean;
}

/**
 * Text layer fragment. This is the minimal set of properties present in all the
 * fragments. Each fragment then adds its own properties, extending this
 * interface.
 * Every fragment has a location, and can be enriched with the corresponding
 * base text when used in views.
 */
export interface Fragment {
  location: string;
  baseText?: string;
}

/**
 * Text layer part. This represents a special type of part,
 * whose only content is a collection of fragments.
 */
export interface TextLayerPart extends Part {
  fragments: Fragment[];
}

/**
 * A text line in a base text part.
 */
export interface TokenTextLayerLine {
  y: number;
  tokens: string[];
}

/**
 * Token-based text coordinates.
 */
export interface TextCoords {
  y: number;
  x: number;
  at?: number;
  run?: number;
}

/**
 * Layer reconciliation hint for a single fragment.
 */
export interface LayerHint {
  location: string;
  editOperation: string;
  patchOperation?: string;
  impactLevel: number;
  description?: string;
}

/**
 * A single entry in a thesaurus.
 */
export interface ThesaurusEntry {
  id: string;
  value: string;
}

/**
 * A set of thesaurus entries.
 */
export interface Thesaurus {
  id: string;
  language?: string;
  targetId?: string;
  entries?: ThesaurusEntry[];
}

/**
 * A set of thesauri which get passed to an editor component.
 * In the set, each thesaurus is identified by an arbitrarily
 * defined key, which is unique only within the context of the editor
 * consuming the set, and refers to frontend only.
 */
export interface ThesauriSet {
  [key: string]: Thesaurus;
}

/**
 * Filter for thesauri.
 */
export interface ThesaurusFilter {
  id?: string;
  isAlias?: boolean;
  language?: string;
}

/**
 * Part definition in a facet.
 */
export interface PartDefinition extends PartTypeIds {
  name: string;
  description?: string;
  isRequired?: boolean;
  colorKey?: string;
  groupKey?: string;
  sortKey?: string;
  settings?: string;
}

/**
 * Fragment definition in a facet.
 */
/**
 * Facet definition.
 */
export interface FacetDefinition {
  id: string;
  label: string;
  colorKey: string;
  description: string;
  partDefinitions: PartDefinition[];
}

/**
 * Flag definition.
 */
export interface FlagDefinition {
  id: number;
  label: string;
  description: string;
  colorKey: string;
  isAdmin?: boolean;
}

/**
 * The group key for a part type. This is used in EditorKeys objects
 * to map a specific part ID with all its fragment IDs into group key(s).
 * The part ID is used alone with normal parts; for layer parts, it is
 * used in conjunction with 1 or more fragment type IDs, each mapped to
 * a corresponding editor key.
 */
export interface PartGroupKey {
  part: string;
  fragments?: { [key: string]: string };
}

/**
 * Part type IDs to editor keys mappings. This contains a set of component
 * type IDs (parts and parts + fragments) mapped to editor keys, which are
 * used to build their routes in the UI.
 */
export interface PartEditorKeys {
  [key: string]: PartGroupKey;
}

/**
 * An index lookup definition, used in dynamic lookup to provide the set
 * of parameters required for a data pins based search.
 */
export interface IndexLookupDefinition {
  typeId?: string;
  roleId?: string;
  name: string;
}

/**
 * A dictionary of index lookup definitions.
 */
export interface IndexLookupDefinitions {
  [key: string]: IndexLookupDefinition;
}

/**
 * A group of parts. Usually the item's parts are grouped according
 * to their metadata, and presented in this way.
 */
export interface PartGroup {
  key: string;
  label: string;
  parts: Part[];
}

/**
 * Essential information about a user.
 */
export interface UserInfo {
  userName: string;
  firstName: string;
  lastName: string;
}

/**
 * Login credentials.
 */
export interface LoginCredentials {
  name: string;
  password: string;
}

// (from @myrmidon/cadmus-ui model editor component base)
/**
 * The identifiers for an edited part.
 */
export interface PartIdentity {
  itemId: string;
  typeId: string;
  partId: string | null;
  roleId: string | null;
}

/**
 * The identifiers for an edited fragment.
 */
export interface FragmentIdentity extends PartIdentity {
  frTypeId: string;
  frRoleId: string | null;
  loc: string;
}

/**
 * An edited part or fragment.
 */
export interface EditedObject<T extends Part | Fragment> {
  value: T | null;
  thesauri: ThesauriSet;
  layerPart?: TextLayerPart;
  baseText?: string;
}
