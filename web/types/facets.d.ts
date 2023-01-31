import { FacetName } from "hermes/components/header/facet-dropdown";

export enum SortByValues {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export type FacetDropdownObjectDetails = {
  count: number;
  selected: boolean;
};

export type FacetDropdownObjects = {
  [key: string]: FacetDropdownObjectDetails;
};

export type FacetDropdownGroups = {
  [name in FacetName]: FacetDropdownObjects;
};
