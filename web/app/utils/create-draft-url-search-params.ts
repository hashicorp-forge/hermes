import { HITS_PER_PAGE } from "hermes/services/algolia";

export function createDraftURLSearchParams(
  ownerEmail: string,
  page?: number,
): URLSearchParams {
  return new URLSearchParams(
    Object.entries({
      hitsPerPage: HITS_PER_PAGE,
      maxValuesPerFacet: 1,
      page: page ?? 0,
      ownerEmail,
    })
      .map(([key, val]) => `${key}=${val}`)
      .join("&"),
  );
}
