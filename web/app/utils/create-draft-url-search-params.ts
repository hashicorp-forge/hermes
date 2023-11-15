import { HITS_PER_PAGE } from "hermes/services/algolia";

export function createDraftURLSearchParams(options: {
  ownerEmail: string;
  hitsPerPage?: number;
  page?: number;
}): URLSearchParams {
  const { ownerEmail, page, hitsPerPage } = options;
  return new URLSearchParams(
    Object.entries({
      hitsPerPage: hitsPerPage ?? HITS_PER_PAGE,
      maxValuesPerFacet: 1,
      page: page ? page - 1 : 0,
      ownerEmail,
    })
      .map(([key, val]) => `${key}=${val}`)
      .join("&"),
  );
}