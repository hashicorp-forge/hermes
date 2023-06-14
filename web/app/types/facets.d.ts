import { FacetName } from "hermes/components/floating-u-i/header/toolbar";

/**
 * E.g., { docType: { "API": { count: 1, selected: false }}}
 */
export type FacetDropdownGroups = {
  [name in FacetName]: FacetDropdownObjects;
};

/**
 * E.g., { "API": { count: 1, selected: false }}
 */
export interface FacetDropdownObjects {
  [key: string]: FacetDropdownObjectDetails;
}

/**
 * E.g., {count: 1, selected: false}
 */
export type FacetDropdownObjectDetails = {
  count: number;
  selected: boolean;
};

export type FacetRecord = Record<string, FacetDropdownObjectDetails>;
export type FacetRecords = Record<string, FacetRecord>;
