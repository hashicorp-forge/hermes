import { HITS_PER_PAGE } from "hermes/services/algolia";

export function createDraftURLSearchParams(options: {
  ownerEmail: string;
  hitsPerPage?: number;
  page?: number;
  facetFilters?: string[];
}): URLSearchParams {
  const { ownerEmail, page, hitsPerPage, facetFilters } = options;
  return new URLSearchParams(
    Object.entries({
      hitsPerPage: hitsPerPage ?? HITS_PER_PAGE,
      maxValuesPerFacet: 1,
      page: page ? page - 1 : 0,
      ownerEmail,
      facetFilters,
    })
      .map(([key, val]) => `${key}=${val}`)
      .join("&"),
  );
}
