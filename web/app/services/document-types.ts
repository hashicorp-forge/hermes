import Service, { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "./fetch";
import { HermesDocumentType } from "hermes/types/document-type";

export default class DocumentTypesService extends Service {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked index: HermesDocumentType[] | null = null;

  fetch = task(async () => {
    this.index = (await this.fetchSvc
      .fetch("/api/v2/document-types")
      .then((r) => r?.json())) as HermesDocumentType[];
  });

  getFlightIcon(type: string): string | undefined {
    const docType = this.index?.find((t) => t.name === type);

    if (!docType) {
      return;
    }

    return docType.flightIcon;
  }
}
