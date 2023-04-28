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
      this.get("/me", (schema) => {
        // If the test has explicitly set a user, return it.
        if (schema.mes.first()) {
          return schema.mes.first().attrs;
        } else {
          // Otherwise, create and return a new user.
          return schema.mes.create({
            id: "1",
            name: "Test User",
            email: "testuser@example.com",
            given_name: "Test",
            picture: "",
            subscriptions: [],
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
       * Used by the /drafts route's getDraftResults method to fetch
       * a list of facets and draft results.
       */
      this.get("/drafts", () => {
        return new Response(
          200,
          {},
          {
            facets: [],
            Hits: [],
            params: "",
            page: 0,
          }
        );
      });

      /**
       * Used by the Dashboard route to get a user's recently viewed documents.
       */
      this.get("/me/recently-viewed-docs", (schema) => {
        let index = schema.recentlyViewedDocs.all().models.map((doc) => {
          return doc.attrs;
        });
        return new Response(200, {}, index);
      });

      /**
       * Used by the AuthenticatedUserService to get the user's subscriptions.
       */
      this.get("/me/subscriptions", () => {
        return new Response(200, {}, []);
      });

      /**
       * Used by /subscriptions to get all possible subscriptions.
       * Used by the NewDoc route to map the products to their abbreviations.
       * Used by the sidebar to populate a draft's product/area dropdown.
       */
      this.get("/products", () => {
        let objects = this.schema.products.all().models.map((product) => {
          return {
            [product.attrs.name]: {
              abbreviation: product.attrs.abbreviation,
            },
          };
        });

        // The objects currently look like:
        // [
        //  0: { "Labs": { abbreviation: "LAB" } },
        //  1: { "Vault": { abbreviation: "VLT"} }
        // ]

        // We reformat them to match the API's response:
        // {
        //  "Labs": { abbreviation: "LAB" },
        //  "Vault": { abbreviation: "VLT" }
        // }

        let formattedObjects = {};

        objects.forEach((object) => {
          let key = Object.keys(object)[0];
          formattedObjects[key] = object[key];
        });

        return new Response(200, {}, formattedObjects);
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
