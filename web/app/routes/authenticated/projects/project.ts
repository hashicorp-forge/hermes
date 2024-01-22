import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesProject } from "hermes/types/project";
import Store from "@ember-data/store";

export default class AuthenticatedProjectsProjectRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare store: Store;

  async model(params: { project_id: string }): Promise<HermesProject> {
    const projectPromise = this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects/${params.project_id}`,
      )
      .then((response) => response?.json());

    const projectResourcesPromise = this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects/${params.project_id}/related-resources`,
      )
      .then((response) => response?.json());

    const [project, projectResources] = await Promise.all([
      projectPromise,
      projectResourcesPromise,
    ]);

    const { hermesDocuments, externalLinks } = projectResources;

    const docOwners = hermesDocuments
      .map((doc: RelatedHermesDocument) => doc.owners?.[0])
      .uniq();

    const docOwnerPromises = docOwners.map((owner: string) => {
      if (!owner) return;

      const cachedRecord = this.store.peekRecord("person", owner);

      if (!cachedRecord) {
        return this.store.queryRecord("person", {
          emails: owner,
        });
      }
    });

    await Promise.all(docOwnerPromises);

    return {
      ...project,
      hermesDocuments,
      externalLinks,
    };
  }
}
