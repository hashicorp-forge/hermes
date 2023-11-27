import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import {
  BackEndHermesProject,
  BackEndProjectResources,
} from "hermes/types/project";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  async model() {
    // FIXME: Route is slow and its data isn't cached
    // FIXME: May need a service to cache the data
    // FIXME: Try skeleton screen if loading remains slow

    // Get the basic project information
    const projects: BackEndHermesProject[] = await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/projects`)
      .then((response) => response?.json());

    return await Promise.all(
      [
        // Grab the related resources for each project
        ...projects.map(async (project: BackEndHermesProject) => {
          const resources: BackEndProjectResources = await this.fetchSvc
            .fetch(
              `/api/${this.configSvc.config.api_version}/projects/${project.id}/related-resources`,
            )
            .then((response) => response?.json());

          let { hermesDocuments, externalLinks } = resources;

          // Get the full document information for each `project.hermesDocument`
          const documents = await Promise.all(
            hermesDocuments?.map((doc) =>
              this.fetchSvc
                .fetch(
                  `/api/${this.configSvc.config.api_version}/documents/${doc.googleFileID}`,
                )
                .then((response) => response?.json()),
            ) ?? [],
          );

          // Format the documents to what the front end expects
          hermesDocuments = hermesDocuments?.map((doc) => {
            const document = documents.find(
              (d) => d.objectID === doc.googleFileID,
            );

            return {
              ...doc,
              product: document?.product,
              status: document?.status,
              owners: document?.owners,
              docType: document?.docType,
              ownerPhotos: document?.ownerPhotos,
            };
          });

          return { ...project, hermesDocuments, externalLinks };
        }),
      ],
      // TODO:
      // Fetch the full JiraIssue by `jiraIssueId`
    );
  }
}
