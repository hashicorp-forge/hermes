/**
 * The function to return facet objects from an array of hits.
 * Takes an array of hits and array of facet names and returns
 * an object formatted like this:
 * {
 *    owners: {
 *      test@hashicorp.com: 21,
 *      test2@hashicorp.com: 4
 *    },
 *    product: {
 *      "Terraform": 21,
 *       etc...
 *    }
 *  }
 *
 *
 */
export function getFacetsFromHits(facetNames: string[], hits: any[]) {
  let facets: Record<string, Record<string, number>> = {};

  // Initialize the facets object
  facetNames.forEach((facet) => {
    // facet, e.g., "owners"
    // now need to get the unique values for this facet
    // and count how many times they appear in the hits
    facets[facet] = {};

    // now we have a facet object like this:
    // { owners: {}, product: {} }

    // Get the unique values for this facet
    let uniqueValues = new Set(hits.map((hit) => hit[facet]));

    // Count how many times each unique value appears in the hits
    uniqueValues.forEach((value) => {
      let count = hits.filter((hit) => hit[facet] === value).length;

      const obj = facets[facet];

      if (!obj) {
        throw new Error("facet not found");
      }

      obj[value] = count;
    });
  });

  return facets;
}
