import { FacetNames } from "hermes/components/header/facet-dropdown";

export type FacetDropdownObjectDetails = {
  count: number;
  selected: boolean;
};

export type FacetDropdownObjects = {
  [key: string]: FacetDropdownObjectDetails;
};

export type FacetDropdownGroups = {
  [name in FacetNames]: FacetDropdownObjects;
};

export type FacetRecord = Record<string, FacetOption>;
export type FacetRecords = Record<string, FacetRecord>;
