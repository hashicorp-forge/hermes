create a structured TODO for the following ideas in this document
---
for adding a narrowly defined rest API around workspace generally that conforms to the existing API would provide unique value to the frontend
---
for adding Meilisearch to the local docker compose as an image
---
for making pkg/search adapters that handle the search needs of the main api
use angolia as the first adapter that satisfies this internal api, see pkg/storage for inspiration
---
add a search adapter for Meilisearch that satisfies the api
---
write an integration test for search that can run against the local api hitting meilisearch in a docker-compose with postgresql
---