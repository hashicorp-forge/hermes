import Component from "@glimmer/component";
import LatestDocsService from "hermes/services/latest-docs";
import { HermesDocument } from "hermes/types/document";
import { service } from "@ember/service";
import { DEFAULT_FILTERS } from "hermes/services/active-filters";

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

  /**
   * The query of the "See older docs" link.
   * Resets any active filters and sets the page to 2.
   */
  protected get query() {
    return {
      ...DEFAULT_FILTERS,
      page: 2,
    };
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::LatestDocs": typeof DashboardLatestDocsComponent;
  }
}
