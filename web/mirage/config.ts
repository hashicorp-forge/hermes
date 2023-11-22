// https://www.ember-cli-mirage.com/docs/advanced/server-configuration

import { Collection, Response, createServer } from "miragejs";
import { getTestDocNumber } from "./factories/document";
import algoliaHosts from "./algolia/hosts";

// @ts-ignore - Mirage not detecting file
import config from "../config/environment";

import {
  TEST_SUPPORT_URL,
  TEST_SHORT_LINK_BASE_URL,
} from "hermes/utils/hermes-urls";

import {
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_GIVEN_NAME,
} from "hermes/utils/mirage-utils";

export default function (mirageConfig) {
  let finalConfig = {
    ...mirageConfig,

    routes() {
      this.namespace = "api/v1";

      /*************************************************************************
       *
       * Algolia requests
       *
       *************************************************************************/

      /**
       * A triage function for all Algolia requests.
       * Reviews the request and determines how to respond.
       */
      const handleAlgoliaRequest = (schema, request) => {
        const requestBody = JSON.parse(request.requestBody);

        if (requestBody) {
          const { facetQuery, query } = requestBody;
          if (facetQuery) {
            let facetMatch = schema.document.all().models.filter((doc) => {
              return doc.attrs.product
                .toLowerCase()
                .includes(facetQuery.toLowerCase());
            })[0];
            if (facetMatch) {
              return new Response(
                200,
                {},
                { facetHits: [{ value: facetMatch.attrs.product }] },
              );
            } else {
              return new Response(200, {}, { facetHits: [] });
            }
          } else if (query !== undefined) {
            /**
             * A query exists, but may be empty.
             * Typically, this is a query for a document title or product,
             * but sometimes it's a query by some optionalFilters.
             */

            let docMatches = [];
            let idsToExclude: string[] = [];

            const setDefaultDocMatches = () => {
              docMatches = schema.document.all().models.filter((doc) => {
                return (
                  doc.attrs.title.toLowerCase().includes(query.toLowerCase()) ||
                  doc.attrs.product.toLowerCase().includes(query.toLowerCase())
                );
              });
            };

            const filters = requestBody.filters;

            if (filters?.includes("NOT objectID")) {
              // there can be a number of objectIDs in the format of
              // NOT objectID:"1234" AND NOT objectID:"5678"
              // we need to parse these and use them to filter the results below.
              filters.split("NOT objectID:").forEach((filter: string) => {
                if (filter) {
                  const id = filter.split('"')[1];
                  if (id) {
                    idsToExclude.push(id);
                  }
                }
              });
            }

            const optionalFilters = requestBody.optionalFilters;

            if (optionalFilters?.includes("docNumber")) {
              const docNumber = optionalFilters
                .split('docNumber:"')[1]
                .split('"')[0];

              docMatches = schema.document.all().models.filter((doc) => {
                return doc.attrs.docNumber === docNumber;
              });

              // Duplicates are detected in the front end
              return new Response(200, {}, { hits: docMatches });
            } else if (filters) {
              const requestIsForDocsAwaitingReview =
                filters.includes(`approvers:'${TEST_USER_EMAIL}'`) &&
                requestBody.filters.includes("AND status:In-Review");
              if (requestIsForDocsAwaitingReview) {
                docMatches = schema.document.all().models.filter((doc) => {
                  return (
                    doc.attrs.approvers.includes(TEST_USER_EMAIL) &&
                    doc.attrs.status.toLowerCase().includes("review")
                  );
                });
              } else {
                // This
                setDefaultDocMatches();
              }
            } else {
              setDefaultDocMatches();
            }

            if (idsToExclude) {
              docMatches = docMatches.filter((doc) => {
                return !idsToExclude.includes(doc.attrs.objectID);
              });
            }

            return new Response(200, {}, { hits: docMatches });
          } else {
            /**
             * A request we're not currently handling with any specificity.
             * Returns the entire document index.
             */
            return new Response(
              200,
              {},
              { hits: schema.document.all().models },
            );
          }
        } else {
          /**
           * This is a `getObject` request, (a search by a :document_id),
           * which arrives like this: { *: "index-name/id" }.
           * We use the ID to search Mirage.
           * If an object is found, we return it.
           * If not, we return a 404.
           */
          const docID = request.params["*"].split("/")[1];
          const doc = schema.document.findBy({ id: docID });

          if (doc) {
            return new Response(200, {}, doc.attrs);
          } else {
            // Mimic Algolia's response when its getObject method fails.
            return new Response(404, {}, {});
          }
        }
      };

      /**
       * Algolia has several search hosts, e.g.,
       * - appID-1.algolianet.com
       * - appID-2.algolianet.com
       *
       * And Mirage lacks wildcards, so we create a route for each.
       *
       * Additionally, we support the remaining Algolia routes.
       */

      algoliaHosts.forEach((host) => {
        this.post(host, (schema, request) => {
          return handleAlgoliaRequest(schema, request);
        });

        this.get(host, (schema, request) => {
          return handleAlgoliaRequest(schema, request);
        });
      });

      /*************************************************************************
       *
       * Project requests
       *
       *************************************************************************/
      // Create a project
      this.post("/projects", (schema, request) => {
        let project = schema.projects.create(JSON.parse(request.requestBody));
        return new Response(200, {}, project.attrs);
      });

      // Fetch a list of projects.
      this.get("/projects", () => {
        const projects = this.schema.projects.all().models;
        return new Response(
          200,
          {},
          projects.map((project) => project.attrs),
        );
      });

      // Fetch a single project.
      this.get("/projects/:project_id", (schema, request) => {
        const project = schema.projects.findBy({
          id: request.params.project_id,
        });
        return new Response(200, {}, project.attrs);
      });

      // Update a project.
      this.patch("/projects/:project_id", (schema, request) => {
        const project = schema.projects.findBy({
          id: request.params.project_id,
        });

        if (project) {
          project.update(JSON.parse(request.requestBody));
          return new Response(200, {}, project.attrs);
        }
      });

      /**
       * Fetch a project's related resources.
       * Since Mirage doesn't yet know the relationship between projects and resources,
       * so simply return the documents and links created within tests via
       * `project.update({ hermesDocuments, externalLinks })`.
       */
      this.get("/projects/:project_id/related-resources", (schema, request) => {
        const projectID = request.params.project_id;
        const project = schema.projects.findBy({ id: projectID });
        const { hermesDocuments, externalLinks } = project.attrs;
        return new Response(200, {}, { hermesDocuments, externalLinks });
      });

      // Fetch a project's related resources
      this.put("/projects/:project_id/related-resources", (schema, request) => {
        let project = schema.projects.findBy({
          id: request.params.project_id,
        });

        if (project) {
          let attrs = JSON.parse(request.requestBody);

          project.update(attrs);
          return new Response(200, {}, project.attrs);
        }
      });

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
       * Called when a user creates a new document.
       */
      this.post("/drafts", (schema, request) => {
        const document = schema.document.create({
          ...JSON.parse(request.requestBody),
        });

        document.update({
          objectID: document.id,
          owners: [TEST_USER_EMAIL],
          appCreated: true,
          status: "WIP",
        });

        return new Response(200, {}, document.attrs);
      });

      /**
       * Used when publishing a draft for review.
       * Updates the document's status and isDraft properties.
       *
       * TODO: Add docNumber assignment.
       */
      this.post("/reviews/:document_id", (schema, request) => {
        const document = schema.document.findBy({
          objectID: request.params.document_id,
        });

        if (document) {
          document.update({
            status: "In Review",
            isDraft: false,
          });

          return new Response(200, {}, document.attrs);
        }

        return new Response(404, {}, {});
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
       * Used by the config service for environment variables.
       */
      this.get("/web/config", () => {
        // TODO: allow this to be overwritten in the request
        return new Response(
          200,
          {},
          {
            algolia_docs_index_name: config.algolia.docsIndexName,
            algolia_drafts_index_name: config.algolia.draftsIndexName,
            algolia_internal_index_name: config.algolia.internalIndexName,
            feature_flags: {
              projects: true,
            },
            google_doc_folders: "",
            short_link_base_url: TEST_SHORT_LINK_BASE_URL,
            skip_google_auth: false,
            google_analytics_tag_id: undefined,
            support_link_url: TEST_SUPPORT_URL,
            version: "1.2.3",
            short_revision: "abc123",
          },
        );
      });

      /**
       * Used in the /new routes when creating a document.
       */
      this.get("/document-types", () => {
        if (this.schema.documentTypes.all().models.length === 0) {
          return new Response(200, {}, [
            {
              name: "RFC",
              longName: "Request for Comments",
              description:
                "Present a proposal to colleagues for their review and feedback.",
              moreInfoLink: {
                text: "More-info link",
                url: "example.com",
              },
            },
            {
              name: "PRD",
              longName: "Product Requirements",
              description:
                "Summarize a problem statement and outline a phased approach to addressing it.",
            },
          ]);
        }
        return new Response(
          200,
          {},
          this.schema.documentTypes.all().models.map((docType) => {
            return docType.attrs;
          }),
        );
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
            name: TEST_USER_NAME,
            email: TEST_USER_EMAIL,
            given_name: TEST_USER_GIVEN_NAME,
            picture: "",
            subscriptions: [],
            isLoggedIn: true,
          }).attrs;
        }
      });

      /**
       * Used by the PeopleSelect component to get a list of people.
       * Used to confirm that an approver has access to a document.
       */
      this.get("/people", (schema, request) => {
        // This allows the test user to view docs they're an approver on.
        if (request.queryParams.emails === TEST_USER_EMAIL) {
          return new Response(200, {}, []);
        }

        if (request.queryParams.emails !== "") {
          const emails = request.queryParams.emails.split(",");

          if (emails.length === 0) {
            return new Response(200, {}, []);
          }

          const hermesUsers = emails.map((email: string) => {
            return { emailAddresses: [{ value: email }], photos: [] };
          });

          return new Response(200, {}, hermesUsers);
        }

        return schema.people.all();
      });

      /**
       * Used by the Document route to get a document.
       */
      this.get("/documents/:document_id", (schema, request) => {
        return new Response(
          200,
          {},
          schema.document.findBy({
            objectID: request.params.document_id,
          }).attrs,
        );
      });

      /**
       * Used by the Document route to get a document's draft.
       */
      this.get("/drafts/:document_id", (schema, request) => {
        return new Response(
          200,
          {},
          schema.document.findBy({
            objectID: request.params.document_id,
          }).attrs,
        );
      });

      /**
       * Used by the document sidebar to determine if a draft `isShareable`.
       */
      this.get("/documents/:document_id/shareable", () => {
        return new Response(200, {}, { isShareable: false });
      });

      /**
       * Used by the RelatedResources component when the doc is a draft.
       */
      this.get("drafts/:document_id/related-resources", (schema, request) => {
        let hermesDocuments = schema.relatedHermesDocument
          .all()
          .models.map((doc) => {
            return doc.attrs;
          });
        let externalLinks = schema.relatedExternalLinks
          .all()
          .models.map((link) => {
            return link.attrs;
          });

        return new Response(200, {}, { hermesDocuments, externalLinks });
      });

      /**
       * Used by the RelatedResources component when the doc is published.
       */
      this.get(
        "documents/:document_id/related-resources",
        (schema, request) => {
          let hermesDocuments = schema.relatedHermesDocument
            .all()
            .models.map((doc) => {
              return doc.attrs;
            });
          let externalLinks = schema.relatedExternalLinks
            .all()
            .models.map((link) => {
              return link.attrs;
            });

          return new Response(200, {}, { hermesDocuments, externalLinks });
        },
      );

      /**
       * Used by the /drafts route's getDraftResults method to fetch
       * a list of facets and draft results.
       */
      this.get("/drafts", () => {
        const allDocs = this.schema.document.all().models;
        const drafts = allDocs.filter((doc) => {
          return doc.attrs.isDraft;
        });

        return new Response(
          200,
          {},
          {
            facets: [],
            Hits: drafts,
            params: "",
            page: 0,
          },
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
        let currentProducts = this.schema.products.all().models;
        if (currentProducts.length === 0) {
          return new Response(
            200,
            {},
            { "Default Fetched Product": { abbreviation: "NONE" } },
          );
        } else {
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
        }
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
        },
      );

      /**
       * Used by the sidebar to save document properties, e.g., productArea.
       */
      this.patch("/drafts/:document_id", (schema, request) => {
        let document = schema.document.findBy({
          objectID: request.params.document_id,
        });
        if (document) {
          let attrs = JSON.parse(request.requestBody);

          if ("customFields" in attrs) {
            attrs.customFields.forEach((field) => {
              document.attrs[field.name] = field.value;
            });
          }

          if ("product" in attrs) {
            attrs.docNumber = getTestDocNumber(attrs.product);
          }

          document.update(attrs);

          return new Response(200, {}, document.attrs);
        }
      });

      /*************************************************************************
       *
       * PUT requests
       *
       *************************************************************************/

      // Related resources (drafts)

      this.put("/drafts/:document_id/related-resources", (schema, request) => {
        let requestBody = JSON.parse(request.requestBody);
        let { hermesDocuments, externalLinks } = requestBody;

        let doc = schema.document.findBy({
          objectID: request.params.document_id,
        });

        if (doc) {
          doc.update({
            hermesDocuments,
            externalLinks,
          });
          return new Response(200, {}, doc.attrs);
        }
      });

      // Related resources (published docs)

      this.put(
        "documents/:document_id/related-resources",
        (schema, request) => {
          let requestBody = JSON.parse(request.requestBody);
          let { hermesDocuments, externalLinks } = requestBody;

          // we're not yet saving this to the document;
          // currently we're just just overwriting the global mirage objects

          this.schema.db.relatedHermesDocument.remove();
          this.schema.db.relatedExternalLinks.remove();

          hermesDocuments.forEach(
            (doc: { googleFileID: string; sortOrder: number }) => {
              const mirageDocument = this.schema.document.findBy({
                objectID: doc.googleFileID,
              }).attrs;

              this.schema.relatedHermesDocument.create({
                googleFileID: doc.googleFileID,
                sortOrder: hermesDocuments.indexOf(doc) + 1,
                title: mirageDocument.title,
                type: mirageDocument.docType,
                documentNumber: mirageDocument.docNumber,
              });
            },
          );

          externalLinks.forEach((link) => {
            this.schema.relatedExternalLinks.create({
              name: link.name,
              url: link.url,
              sortOrder:
                externalLinks.indexOf(link) + 1 + hermesDocuments.length,
            });
          });

          return new Response(200, {}, {});
        },
      );

      // Project related resources
      this.put("projects/:project_id", (schema, request) => {
        let project = schema.projects.findBy({
          id: request.params.project_id,
        });

        if (project) {
          let attrs = JSON.parse(request.requestBody);

          project.update(attrs);
          return new Response(200, {}, project.attrs);
        }
      });

      // Update whether a draft is shareable.
      this.put("/drafts/:document_id/shareable", (schema, request) => {
        const isShareable = JSON.parse(request.requestBody).isShareable;

        let doc = schema.document.findBy({
          objectID: request.params.document_id,
        });

        if (doc) {
          doc.update({ isShareable });
          return new Response(200, {}, doc.attrs);
        }
      });
    },
  };

  return createServer(finalConfig);
}
