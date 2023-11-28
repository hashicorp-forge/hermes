import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesDocument } from "hermes/types/document";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsProjectRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

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

    let { hermesDocuments, externalLinks } = projectResources;

    let documentPromises: Promise<HermesDocument>[] = [];

    hermesDocuments?.forEach((doc: RelatedHermesDocument) => {
      documentPromises.push(
        this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/documents/${doc.googleFileID}`,
          )
          .then((response) => response?.json()),
      );
    });

    const documents: HermesDocument[] = await Promise.all(documentPromises);

    hermesDocuments = hermesDocuments?.map((doc: RelatedHermesDocument) => {
      const document = documents.find((d) => d.objectID === doc.googleFileID);

      return {
        ...doc,
        summary: document?.summary,
        product: document?.product,
        status: document?.status,
        owners: document?.owners,
        docType: document?.docType,
        ownerPhotos: document?.ownerPhotos,
      };
    }) as RelatedHermesDocument[];

    return {
      ...project,
      hermesDocuments,
      externalLinks,
    };
  }
}
