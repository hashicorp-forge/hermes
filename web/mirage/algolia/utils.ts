import { assert } from "@ember/debug";

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

  facetNames.forEach((facetName) => {
    facets[facetName] = {};

    let uniqueValues = new Set(hits.map((hit) => hit[facetName]));

    // Calculate count

    uniqueValues.forEach((value) => {
      let count = hits.filter((hit) => hit[facetName] === value).length;

      const obj = facets[facetName];

      if (!obj) {
        throw new Error("facet not found");
      }

      obj[value] = count;
    });

    // Sort by highest count

    const facet = facets[facetName];
    assert("facet must exist", facet);

    const sorted = Object.fromEntries(
      Object.entries(facet).sort(([, a], [, b]) => b - a),
    );

    facets[facetName] = sorted;
  });

  return facets;
}
