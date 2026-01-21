/**
 * Search is now proxied through the Hermes backend at /1/indexes/*
 * This eliminates direct calls to the search provider's infrastructure and removes
 * the need for search credentials in the web build.
 * 
 * For tests, we mock the backend search proxy endpoint.
 */

// Mock the backend search proxy endpoint
let searchHosts = ["/1/indexes/**"];

export default searchHosts;
