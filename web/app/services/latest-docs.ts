import Service from "@ember/service";
import { inject as service } from "@ember/service";
import { keepLatestTask, timeout } from "ember-concurrency";
import { tracked } from "@glimmer/tracking";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import AlgoliaService from "./algolia";

export default class LatestDocsService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare session: any;

  @tracked index: HermesDocument[] | null = null;

  @tracked nbPages = 0;

  fetchAll = keepLatestTask(async () => {
    const response = await this.algolia.searchIndex
      .perform(
        this.configSvc.config.algolia_docs_index_name + "_modifiedTime_desc",
        "",
        {
          hitsPerPage: 12,
        },
      )
      .then((response) => response);

    assert("response must exist", response);

    this.index = response.hits as HermesDocument[];
    this.nbPages = response.nbPages;
  });
}

declare module "@ember/service" {
  interface Registry {
    "latest-docs": LatestDocsService;
  }
}
