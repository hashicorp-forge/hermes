/**
 * Algolia search is now proxied through the Hermes backend at /1/indexes/*
 * This eliminates direct calls to Algolia's infrastructure and removes the need
 * for Algolia credentials in the web build.
 * 
 * For tests, we mock the backend proxy endpoint instead of Algolia directly.
 */

// Mock the backend Algolia proxy endpoint
let algoliaHosts = ["/1/indexes/**"];

export default algoliaHosts;
