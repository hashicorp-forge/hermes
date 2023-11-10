export function createDraftURLSearchParams(
  ownerEmail: string,
  page?: number,
): URLSearchParams {
  return new URLSearchParams(
    Object.entries({
      hitsPerPage: 100,
      maxValuesPerFacet: 1,
      page: page ?? 0,
      ownerEmail,
    })
      .map(([key, val]) => `${key}=${val}`)
      .join("&"),
  );
}
