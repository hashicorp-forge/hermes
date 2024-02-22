import { SearchScope } from "hermes/routes/authenticated/results";

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
  page: number;
  scope: SearchScope;
}
