export const enum SortByValues {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export const enum FacetNames {
  DocType = "docType",
  Owners = "owners",
  Product = "product",
  Status = "status",
}

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
