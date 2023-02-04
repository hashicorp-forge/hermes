export enum SortByValues {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export enum FacetNames {
  DocType = "docType",
  Owners = "owners",
  Product = "product",
  Status = "status",
}

export interface FacetDropdownObjectDetails {
  count: number;
  selected: boolean;
}

export interface FacetDropdownObjects {
  [key: string]: FacetDropdownObjectDetails;
}

export interface FacetDropdownGroups {
  [name in FacetNames]: FacetDropdownObjects;
}

export type FacetRecord = Record<string, FacetDropdownObjectDetails>;
export type FacetRecords = Record<string, FacetRecord>;
