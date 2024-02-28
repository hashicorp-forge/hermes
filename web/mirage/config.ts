// https://www.ember-cli-mirage.com/docs/advanced/server-configuration

import { Collection, Response, createServer } from "miragejs";
import { getTestDocNumber } from "./factories/document";
import algoliaHosts from "./algolia/hosts";
import { ProjectStatus } from "hermes/types/project-status";
import { HITS_PER_PAGE } from "hermes/services/algolia";
import { assert as emberAssert } from "@ember/debug";

import {
  TEST_WEB_CONFIG,
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_GIVEN_NAME,
  TEST_USER_PHOTO,
} from "../mirage/utils";
import { getFacetsFromHits } from "./algolia/utils";

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
        const indexName = request.url.split("indexes/")[1].split("/")[0];
        const requestBody = JSON.parse(request.requestBody);

        const page = requestBody?.page ?? 0;
        const docModels = schema.document.all().models;
        const nbHits = docModels.length;
        const nbPages = Math.ceil(nbHits / HITS_PER_PAGE);

        let facets = requestBody?.facets ?? [];

        if (requestBody) {
          const { facetQuery, query } = requestBody;
          let { facetFilters } = requestBody;

          // Ignore the facetFilters if they're empty.
          if (facetFilters) {
            if (facetFilters.length === 0) {
              facetFilters = undefined;
            } else if (facetFilters[0] === "") {
              facetFilters = undefined;
            }
          }

          if (facetFilters) {
            /**
             * Handle requests to the /my/documents route.
             * These arrive like ["owners:foo@bar.com"]
             */
            if (facetFilters.includes(`owners:${TEST_USER_EMAIL}`)) {
              // A request from the my/documents route for published docs
              const hits = docModels.filter((doc) => {
                return (
                  doc.attrs.owners.includes(TEST_USER_EMAIL) &&
                  doc.attrs.status !== "WIP"
                );
              });

              return new Response(
                200,
                {},
                {
                  hits,
                  nbHits: hits.length,
                  nbPages: Math.ceil(hits.length / HITS_PER_PAGE),
                  page,
                  facets: getFacetsFromHits(facets, hits),
                },
              );
            } else {
              // FacetFilters come nested like this:
              // [["product:Vault", "docType:RFC"]]
              // so we need to flatten them

              facetFilters = facetFilters.flat();

              // Create a placeholder object to hold the search params

              let searchParams: Record<string, any> = {};

              // Loop through facetFilters and add them to the params

              facetFilters.forEach((filter: string) => {
                const filterType = filter.split(":")[0];
                const filterValue = filter.split(":")[1];

                emberAssert("filterType must exist", filterType);

                searchParams[filterType] = filterValue;
              });

              // Query Mirage using the search params

              const docResults = this.schema.document.where(searchParams);
              const hits = docResults.models.map((doc) => doc.attrs);

              return new Response(
                200,
                {},
                {
                  hits,
                  nbHits: hits.length,
                  nbPages: Math.ceil(hits.length / HITS_PER_PAGE),
                  page,
                  facets: getFacetsFromHits(facets, hits),
                },
              );
            }
          } else if (facetQuery) {
            // Product/area search
            let facetMatch = docModels.filter((doc) => {
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
             * Typically, this is a query for a document, project or product,
             * but sometimes it's a query by some optionalFilters.
             */
            if (indexName?.includes("projects")) {
              const projects = schema.projects
                .all()
                .models.filter((project) => {
                  return (
                    project.attrs.title
                      .toLowerCase()
                      .includes(query.toLowerCase()) ||
                    project.attrs.description
                      ?.toLowerCase()
                      .includes(query.toLowerCase())
                  );
                });

              const hits = projects.map((project) => {
                return {
                  ...project.attrs,
                  objectID: project.attrs.id,
                };
              });

              return new Response(
                200,
                {},
                {
                  hits,
                  nbHits: hits.length,
                  nbPages: Math.ceil(hits.length / HITS_PER_PAGE),
                  page,
                  facets: getFacetsFromHits(facets, hits),
                },
              );
            }

            let docMatches = [];
            let idsToExclude: string[] = [];

            const setDefaultDocMatches = () => {
              docMatches = docModels.filter((doc) => {
                return (
                  doc.attrs.title.toLowerCase().includes(query.toLowerCase()) ||
                  doc.attrs.product.toLowerCase().includes(query.toLowerCase())
                );
              });
            };

            const filters = requestBody.filters;

            // Used by the dashboard to fetch docs awaiting review.
            if (filters?.includes("approvers")) {
              const approvers = filters.split("approvers:'")[1].split("'")[0];
              docMatches = docModels.filter((doc) => {
                return doc.attrs.approvers.some((approver) => {
                  return approvers.includes(approver);
                });
              });

              return new Response(
                200,
                {},
                {
                  hits: docMatches,
                  nbHits: docMatches.length,
                  nbPages: Math.ceil(docMatches.length / HITS_PER_PAGE),
                  page,
                  facets: getFacetsFromHits(facets, docMatches),
                },
              );
            }

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

              docMatches = docModels.filter((doc) => {
                return doc.attrs.docNumber === docNumber;
              });

              // Duplicates are detected in the front end
              return new Response(
                200,
                {},
                {
                  hits: docMatches,
                  nbHits: docMatches.length,
                  nbPages: Math.ceil(docMatches.length / HITS_PER_PAGE),
                  page,
                  facets: getFacetsFromHits(facets, docMatches),
                },
              );
            } else if (filters) {
              const requestIsForDocsAwaitingReview =
                filters.includes(`approvers:'${TEST_USER_EMAIL}'`) &&
                requestBody.filters.includes("AND status:In-Review");
              const requestIsForProductDocs = filters.includes(`product:`);

              if (requestIsForDocsAwaitingReview) {
                docMatches = docModels.filter((doc) => {
                  return (
                    doc.attrs.approvers.includes(TEST_USER_EMAIL) &&
                    doc.attrs.status.toLowerCase().includes("review")
                  );
                });
              } else if (requestIsForProductDocs) {
                const product = filters.split("product:")[1].split('"')[1];
                docMatches = docModels.filter((doc) => {
                  return doc.attrs.product === product;
                });
              } else {
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

            return new Response(
              200,
              {},
              {
                hits: docMatches.slice(0, HITS_PER_PAGE),
                nbHits: docMatches.length,
                nbPages: Math.ceil(docMatches.length / HITS_PER_PAGE),
                page,
                facets: getFacetsFromHits(facets, docMatches),
              },
            );
          } else {
            /**
             * A request we're not currently handling with any specificity.
             * Returns the entire document index.
             */
            return new Response(
              200,
              {},
              {
                hits: docModels.slice(0, HITS_PER_PAGE),
                nbHits,
                nbPages,
                page,
                facets: getFacetsFromHits(facets, docModels),
              },
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
       * Jira requests
       *
       *************************************************************************/
      // Get issue
      this.get("/jira/issues/:issue_id", (schema, request) => {
        const issue = schema.jiraIssues.findBy({
          key: request.params.issue_id,
        });
        return new Response(200, {}, issue.attrs);
      });

      // Issue picker
      this.get("/jira/issue/picker", (schema, request) => {
        const query = request.queryParams.query;
        const issues = schema.jiraPickerResults.all().models.filter((issue) => {
          return issue.attrs.summary.includes(query);
        });

        return new Response(200, {}, issues);
      });

      /*************************************************************************
       *
       * Project requests
       *
       *************************************************************************/

      // Create a project
      this.post("/projects", (schema, request) => {
        let project = schema.projects.create(JSON.parse(request.requestBody));
        project.update({
          status: ProjectStatus.Active,
        });
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

      // Save a document to a project
      this.post(
        "/projects/:project_id/related-resources",
        (schema, request) => {
          let project = schema.projects.findBy({
            id: request.params.project_id,
          });

          if (project) {
            let attrs = JSON.parse(request.requestBody);

            // update the projects array on the hermesDocuments

            const { hermesDocuments, externalLinks } = attrs;

            let newHermesDocuments: any[] = [];

            hermesDocuments.forEach((doc) => {
              const relatedDocument = this.schema.relatedHermesDocument.findBy({
                googleFileID: doc.googleFileID,
              });

              const fullDocument = this.schema.document.findBy({
                objectID: doc.googleFileID,
              });

              const existingDocuments = project.attrs.hermesDocuments ?? [];

              newHermesDocuments.push(
                ...existingDocuments,
                relatedDocument.attrs,
              );

              //  ignore duplicates
              if (existingDocuments.includes(doc.googleFileID)) {
                return;
              } else {
                fullDocument.update({
                  projects: [...fullDocument.attrs.projects, project.attrs.id],
                });
              }

              fullDocument.update({
                projects: [...fullDocument.attrs.projects, project.attrs.id],
              });
            });

            project.update({
              hermesDocuments: newHermesDocuments,
              externalLinks,
            });

            return new Response(200, {}, project.attrs);
          }
        },
      );

      // Fetch a single project.
      this.get("/projects/:project_id", (schema, request) => {
        const shouldAddToRecentlyViewed =
          request.requestHeaders["Add-To-Recently-Viewed"];

        const project = schema.projects.findBy({
          id: request.params.project_id,
        });

        if (shouldAddToRecentlyViewed) {
          schema.recentlyViewedProjects.create({
            id: project.attrs.id,
            viewedTime: Date.now(),
          });
        }

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

      // Update a project's related resources
      this.put("/projects/:project_id/related-resources", (schema, request) => {
        let project = schema.projects.findBy({
          id: request.params.project_id,
        });

        if (project) {
          let attrs = JSON.parse(request.requestBody);

          const { hermesDocuments, externalLinks } = attrs;

          // need to compare current hermesDocuments
          // to the new ones being requested

          // documents that are in the current project but not in the new request
          // need to have their projects array updated to remove the project id

          // documents that are in the new request but not in the current project
          // need to have their projects array updated to add the project id

          // documents that are in both the current project and the new request

          const currentHermesDocuments = project.attrs.hermesDocuments ?? [];
          const incomingHermesDocuments = attrs.hermesDocuments ?? [];

          const documentsToRemove = currentHermesDocuments.filter((doc) => {
            return !incomingHermesDocuments.includes(doc);
          });

          const documentsToAdd = incomingHermesDocuments.filter((doc) => {
            return !currentHermesDocuments.includes(doc);
          });

          documentsToRemove.forEach((doc) => {
            const mirageDocument = this.schema.document.findBy({
              objectID: doc.googleFileID,
            });

            mirageDocument?.update({
              projects: mirageDocument.attrs.projects.filter(
                (projectID) => projectID.toString() !== project.attrs.id,
              ),
            });
          });

          documentsToAdd.forEach((doc) => {
            const mirageDocument = this.schema.document.findBy({
              objectID: doc,
            });
            mirageDocument?.update({
              projects: [...mirageDocument.attrs.projects, project.attrs.id],
            });
          });

          project.update({
            hermesDocuments,
            externalLinks,
          });
          return new Response(200, {}, project.attrs);
        }
      });

      /*************************************************************************
       *
       * Draft requests
       *
       *************************************************************************/

      // Create a new draft
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

      // Return all the user's drafts
      this.get("/drafts", (schema, request) => {
        const params = request.queryParams;
        const { facetFilters } = params;
        const allDocs = this.schema.document.all().models;
        const drafts = allDocs.filter((doc) => {
          if (facetFilters.includes(`owners:${TEST_USER_EMAIL}`)) {
            return (
              doc.attrs.isDraft && doc.attrs.owners.includes(TEST_USER_EMAIL)
            );
          } else {
            return doc.attrs.isDraft;
          }
        });

        return new Response(
          200,
          {},
          {
            Hits: drafts,
            params: "",
            page: 0,
          },
        );
      });

      // Return a draft by ID
      this.get("/drafts/:document_id", (schema, request) => {
        return new Response(
          200,
          {},
          schema.document.findBy({
            objectID: request.params.document_id,
          }).attrs,
        );
      });

      // Determine if a draft is shareable
      this.get("/drafts/:document_id/shareable", (schema, request) => {
        const document = schema.document.findBy({
          objectID: request.params.document_id,
        });
        return new Response(
          200,
          {},
          { isShareable: document.attrs.isShareable },
        );
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

      // Fetch a draft's related resources
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

      // Save a draft's related resources
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

      // Save a draft
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

      // Delete a draft
      this.delete("/drafts/:document_id", (schema, request) => {
        const document = schema.document.findBy({
          objectID: request.params.document_id,
        });

        if (document) {
          document.destroy();
          return new Response(200, {}, {});
        }

        return new Response(404, {}, {});
      });

      /*************************************************************************
       *
       * Document approvals
       *
       *************************************************************************/

      /**
       * Used when approving a document.
       * Adds the user's email to the `approvedBy` array.
       */
      this.post("/approvals/:document_id", (schema, request) => {
        const document = schema.document.findBy({
          objectID: request.params.document_id,
        });

        if (document) {
          if (!document.attrs.approvedBy?.includes(TEST_USER_EMAIL)) {
            const approvedBy = document.attrs.approvedBy || [];
            document.update({
              approvedBy: [...approvedBy, TEST_USER_EMAIL],
            });
          }
          return new Response(200, {}, document.attrs);
        }

        return new Response(404, {}, {});
      });

      /**
       * Used when rejecting an FRD.
       */
      this.delete("/approvals/:document_id", (schema, request) => {
        const document = schema.document.findBy({
          objectID: request.params.document_id,
        });

        if (document) {
          document.update({
            changesRequestedBy: [TEST_USER_EMAIL],
          });

          return new Response(200, {}, document.attrs);
        }

        return new Response(404, {}, {});
      });

      /*************************************************************************
       *
       * HEAD requests
       *
       *************************************************************************/

      this.head("/me", (schema, _request) => {
        let isLoggedIn = schema.db.me[0].isLoggedIn;

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
        let matches: Collection<unknown> = schema["google/people"].where(
          (person) => {
            return (
              person.emailAddresses[0].value.includes(query) ||
              person.names[0].displayName.includes(query)
            );
          },
        );

        // Return the Collection models in Response format
        return new Response(200, {}, matches.models);
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
            status: "In-Review",
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
        return new Response(200, {}, TEST_WEB_CONFIG);
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
              flightIcon: "discussion-circle",
            },
            {
              name: "PRD",
              longName: "Product Requirements",
              description:
                "Summarize a problem statement and outline a phased approach to addressing it.",
            },
            {
              name: "FRD",
              longName: "Funding Request",
              description:
                "Capture a budget request, along with the business justification and expected returns.",
            },
          ]);
        } else {
          return new Response(
            200,
            {},
            this.schema.documentTypes
              .all()
              .models.map((docType) => docType.attrs),
          );
        }
      });

      /**
       * Used by the AuthenticatedUserService to get the user's profile.
       */
      this.get("/me", (schema) => {
        // If the test has explicitly set a user, return it.
        if (schema.me.first()) {
          return schema.me.first().attrs;
        } else {
          // Otherwise, create and return a new user.
          return schema.me.create({
            id: TEST_USER_EMAIL,
            name: TEST_USER_NAME,
            email: TEST_USER_EMAIL,
            given_name: TEST_USER_GIVEN_NAME,
            picture: TEST_USER_PHOTO,
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
       * Used by the Dashboard route to get a user's recently viewed documents.
       */
      this.get("/me/recently-viewed-docs", (schema) => {
        let index = schema.recentlyViewedDocs.all().models.map((doc) => {
          return doc.attrs;
        });

        return new Response(200, {}, index.length === 0 ? null : index);
      });

      /**
       * Used in the dashboard to show recently viewed projects
       */
      this.get("/me/recently-viewed-projects", (schema) => {
        let index = schema.recentlyViewedProjects
          .all()
          .models.map((project) => {
            return project.attrs;
          });

        return new Response(200, {}, index.length === 0 ? null : index);
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
       * Used by the sidebar to update a document,
       * e.g., to change a its status.
       */
      this.patch("/documents/:document_id", (schema, request) => {
        let document = schema.document.findBy({
          objectID: request.params.document_id,
        });
        if (document) {
          let attrs = JSON.parse(request.requestBody);
          document.update(attrs);
          return new Response(200, {}, document.attrs);
        }
      });

      /*************************************************************************
       *
       * PUT requests
       *
       *************************************************************************/

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
    },
  };

  return createServer(finalConfig);
}
