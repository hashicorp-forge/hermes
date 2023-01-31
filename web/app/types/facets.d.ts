export type FacetOption = {
  count: number;
  selected: boolean;
};

enum SortByValues {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export enum FacetNames {
  DocType = "docType",
  Owners = "owners",
  Product = "product",
  Status = "status",
}

export type Facets = {
  [name in FacetNames]: { [key: string]: FacetOption };
};

export type FacetRecord = Record<string, FacetOption>;
export type FacetRecords = Record<string, FacetRecord>;
