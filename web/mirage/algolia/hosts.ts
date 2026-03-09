/**
 * Algolia has one static endpoint and several wildcard hosts, e.g.,
 * - appID-1.algolianet.com
 * - appID-2.algolianet.com
 *
 * Mirage lacks wildcard support, so we create a route for each.
 * Used in tests to mock Algolia endpoints.
 */

import config from "hermes/config/environment";

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
