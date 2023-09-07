import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/related-resources";
import FetchService from "hermes/services/fetch";

export type HermesProject = {
  id: string; // at least in mirage...
  name: string;
  documents?: RelatedHermesDocument[];
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

export default class AuthenticatedProjectsRoute extends Route {
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
