import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";
import FetchService from "hermes/services/fetch";
import { HermesDocument } from "hermes/types/document";

export type HermesProject = {
  id: string; // at least in mirage...
  name: string;
  documents?: HermesDocument[];
  description?: string;
  jiraObject?: {
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

  async model(_params: any) {
    return await this.fetchSvc
      .fetch("/api/v1/projects")
      .then((response) => response?.json())
      .catch((e) => {
        console.error(e);
        return null;
      });
  }
}
