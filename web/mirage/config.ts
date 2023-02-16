// https://www.ember-cli-mirage.com/docs/advanced/server-configuration

import { Collection, Response, createServer } from "miragejs";

export default function (config) {
  let finalConfig = {
    ...config,
    routes() {
      this.namespace = "api/v1";

      /**
       * The People POST endpoint.
       * Used by the `PeopleSelect` component to query for people
       * without exposing personal information like a GET request might.
       */
      this.post("/people", (schema, request) => {
        // Grab the query from the request body
        let query: string = JSON.parse(request.requestBody).query;

        // Search everyone's first emailAddress for matches
        let matches: Collection<unknown> = schema.people.where((person) => {
          return person.emailAddresses[0].value.includes(query);
        });

        // Return the Collection models in Response format
        return new Response(200, {}, matches.models);
      });

      this.get("/people", (schema) => {
        return schema.people.all();
      });

      this.post("/me/subscriptions", (schema, request) => {
        return new Response(200, {});
      });
    },
  };
  return createServer(finalConfig);
}
