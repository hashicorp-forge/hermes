export interface DocumentsRouteParams {
  docType: string[];
  owners: string[];
  page: number;
  product: string[];
  sortBy: string;
  status: string[];
}

export interface ResultsRouteParams extends DocumentsRouteParams {
  q: string;
}
