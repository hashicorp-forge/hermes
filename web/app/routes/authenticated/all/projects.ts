import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";
import FetchService from "hermes/services/fetch";
import { HermesDocument } from "hermes/types/document";

export type HermesProject = {
  name: string;
  documents?: HermesDocument[];
  jira?: {
    // not sure if these are accurate
    key: string;
    url: string;
    priority: string;
    status: string;
    assignedTo: string;
  };
  relatedLinks?: RelatedExternalLink[];
  creator: string; // maybe a Google/HermesUser
  dateCreated: number;
  dateModified: number;
};

export default class AuthenticatedAllProjectsRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model(params: any) {
    console.log("params", params);
    return await this.fetchSvc
      .fetch("/api/v1/projects")
      .then((response) => response?.json())
      .catch((e) => {
        console.log("error", e);
      });
  }
}
