// https://www.ember-cli-mirage.com/docs/advanced/server-configuration

import { Collection, Response, createServer } from "miragejs";
import config from "../config/environment";

export default function (mirageConfig) {
  let finalConfig = {
    ...mirageConfig,

    routes() {
      this.namespace = "api/v1";

      /*************************************************************************
       *
       * HEAD requests
       *
       *************************************************************************/

      this.head("/me", (schema, _request) => {
        let isLoggedIn = schema.db.mes[0].isLoggedIn;

        if (isLoggedIn) {
          return new Response(200, {});
        } else {
          return new Response(401, {});
        }
      });

      /*************************************************************************
       *
       * POST requests
       *
       *************************************************************************/

      /**
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

      /**
       * Used by the AuthenticatedUserService to add and remove subscriptions.
       */
      this.post("/me/subscriptions", () => {
        return new Response(200, {});
      });

      /**
       *  Used by the RecentlyViewedDocsService to log a viewed doc.
       */
      this.post("https://www.googleapis.com/upload/drive/v3/files", () => {
        return new Response(200, {});
      });

      /**
       * Used by the AlgoliaSearchService to query Algolia.
       */
      this.post(
        `https://${config.algolia.appID}-dsn.algolia.net/1/indexes/**`,
        () => {
          return {
            facets: [],
            hits: [],
          };
        }
      );

      /**
       * Called by the Document route to log a document view.
       */
      this.post("/web/analytics", () => {
        return new Response(200, {});
      });

      /*************************************************************************
       *
       * GET requests
       *
       *************************************************************************/

      /**
       * Used in the /new routes when creating a document.
       */
      this.get("/document-types", () => {
        return new Response(200, {}, [
          {
            name: "RFC",
            longName: "Request for Comments",
            description:
              "Create a Request for Comments document to present a proposal to colleagues for their review and feedback.",
            moreInfoLink: {
              text: "More-info link",
              url: "example.com",
            },
            checks: [
              {
                label: "I have read the Terms and Conditions",
                helperText:
                  "Please read the Terms and Conditions before proceeding.",
                links: [
                  {
                    text: "Terms and Conditions",
                    url: "example.com",
                  },
                ],
              },
            ],
            customFields: [
              {
                name: "Current Version",
                readOnly: false,
                type: "string",
              },
              {
                name: "Stakeholders",
                readOnly: false,
                type: "people",
              },
            ],
          },
          {
            name: "PRD",
            longName: "Product Requirements",
            description:
              "Create a Product Requirements Document to summarize a problem statement and outline a phased approach to addressing the problem.",
          },
        ]);
      });

      /**
       * Used by the AuthenticatedUserService to get the user's profile.
       */
      this.get("https://www.googleapis.com/userinfo/v2/me", (schema) => {
        // If the test has explicitly set a user, return it.
        if (schema.mes.first()) {
          return schema.mes.first().attrs;
        } else {
          // Otherwise, create and return a new user.
          return schema.mes.create({
            isLoggedIn: true,
          }).attrs;
        }
      });

      /**
       * Used by the PeopleSelect component to get a list of people.
       */
      this.get("/people", (schema) => {
        return schema.people.all();
      });

      /**
       * Used by the Document route to get a document.
       */
      this.get("/documents/:document_id", (schema, request) => {
        return new Response(
          200,
          {},
          schema.document.findBy({ objectID: request.params.document_id }).attrs
        );
      });

      /**
       * Used by the Document route to get a document's draft.
       */
      this.get("/drafts/:document_id", (schema, request) => {
        return new Response(
          200,
          {},
          schema.document.findBy({ objectID: request.params.document_id }).attrs
        );
      });
      /**
       * Used by the AuthenticatedUserService to get the user's subscriptions.
       */
      this.get("/me/subscriptions", () => {
        return new Response(200, {}, []);
      });

      /**
       * Used by /subscriptions to get all possible subscriptions.
       * Also used by the NewDoc route to map the products to their abbreviations.
       */
      this.get("/products", () => {
        return;
      });

      // RecentlyViewedDocsService / fetchIndexID
      this.get("https://www.googleapis.com/drive/v3/files", (schema) => {
        let file = schema.recentlyViewedDocsDatabases.first()?.attrs;

        if (!file) {
          file = schema.recentlyViewedDocsDatabases.create({
            name: "recently_viewed_docs.json",
          }).attrs;
        }

        return new Response(200, {}, { files: [file] });
      });

      // RecentlyViewedDocsService / fetchAll
      this.get("https://www.googleapis.com/drive/v3/files/:id", (schema) => {
        let index = schema.recentlyViewedDocs.all().models.map((doc) => {
          if (doc.attrs.isLegacy) {
            return doc.attrs.id;
          } else {
            return doc.attrs;
          }
        });
        return new Response(200, {}, index);
      });

      /*************************************************************************
       *
       * PATCH requests
       *
       *************************************************************************/

      // RecentlyViewedDocsService / markViewed
      this.patch(
        "https://www.googleapis.com/upload/drive/v3/files/:id",
        (schema, request) => {
          let index = JSON.parse(request.requestBody);
          schema.db.recentlyViewedDocs.remove();
          schema.db.recentlyViewedDocs.insert(index);
          return new Response(200, {}, schema.recentlyViewedDocs.all().models);
        }
      );
    },
  };

  return createServer(finalConfig);
}
