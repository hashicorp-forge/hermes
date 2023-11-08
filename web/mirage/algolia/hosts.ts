/**
 * Algolia has one static endpoint and several wildcard hosts, e.g.,
 * - appID-1.algolianet.com
 * - appID-2.algolianet.com
 *
 * Mirage lacks wildcard support, so we create a route for each.
 * Used in tests to mock Algolia endpoints.
 */

import config from "hermes/config/environment";

// these probably need to be broken into document indexes and project indexes.
// there needs to be some way of knowing which index is being searched.

// Start with the static route.
let algoliaHosts = [
  `https://${config.algolia.appID}-dsn.algolia.net/1/indexes/**`,
];

// Add wildcard routes.
for (let i = 1; i <= 9; i++) {
  algoliaHosts.push(
    `https://${config.algolia.appID}-${i}.algolianet.com/1/indexes/**`,
  );
}

export default algoliaHosts;
