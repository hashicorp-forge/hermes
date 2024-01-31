import Component from "@glimmer/component";
import LatestDocsService from "hermes/services/latest-docs";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";

interface DashboardLatestDocsComponentSignature {}

export default class DashboardLatestDocsComponent extends Component<DashboardLatestDocsComponentSignature> {
  @service("latest-docs") declare latestDocs: LatestDocsService;

  protected get fetchIsRunning(): boolean {
    return this.latestDocs.fetchAll.isRunning;
  }

  protected get linkToAllDocsIsShown(): boolean {
    return this.latestDocs.nbPages > 1;
  }

  protected get docs(): HermesDocument[] | null {
    return this.latestDocs.index;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::LatestDocs": typeof DashboardLatestDocsComponent;
  }
}
