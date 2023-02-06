import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { DocumentsRouteParams } from "hermes/types/document-routes";

export default class ToolbarService extends Service {
  @tracked docTypeFilters: string[] = [];
  @tracked productFilters: string[] = [];
  @tracked statusFilters: string[] = [];
  @tracked ownerFilters: string[] = [];

  get filtersAreShown() {
    return (
      this.docTypeFilters.length > 0 ||
      this.productFilters.length > 0 ||
      this.statusFilters.length > 0 ||
      this.ownerFilters.length > 0
    );
  }

  updateFilters(params: DocumentsRouteParams) {
    this.docTypeFilters = params.docType;
    this.productFilters = params.product;
    this.statusFilters = params.status;
    this.ownerFilters = params.owners;
  }
}
