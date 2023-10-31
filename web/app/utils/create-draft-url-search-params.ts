export function createDraftURLSearchParams(
  ownerEmail: string,
): URLSearchParams {
  return new URLSearchParams(
    Object.entries({
      hitsPerPage: 12,
      maxValuesPerFacet: 1,
      page: 0,
      ownerEmail,
    })
      .map(([key, val]) => `${key}=${val}`)
      .join("&"),
  );
}
