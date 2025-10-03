import { HITS_PER_PAGE } from "hermes/services/algolia";

export function createDraftURLSearchParams(options: {
  ownerEmail: string;
  hitsPerPage?: number;
  page?: number;
  facetFilters?: string | readonly string[] | ReadonlyArray<readonly string[] | string>;
  [key: string]: any; // Allow other Algoliasearch v4+ options
}): URLSearchParams {
  const { ownerEmail, page, hitsPerPage, facetFilters } = options;
  
  // Convert facetFilters to string format for URL encoding
  let facetFiltersString: string | undefined;
  if (facetFilters) {
    if (Array.isArray(facetFilters)) {
      facetFiltersString = facetFilters.flat().join(',');
    } else if (typeof facetFilters === 'string') {
      facetFiltersString = facetFilters;
    }
  }
  
  return new URLSearchParams(
    Object.entries({
      hitsPerPage: hitsPerPage ?? HITS_PER_PAGE,
      maxValuesPerFacet: 1,
      page: page ? page - 1 : 0,
      ownerEmail,
      facetFilters: facetFiltersString,
    })
      .map(([key, val]) => `${key}=${val}`)
      .join("&"),
  );
}
