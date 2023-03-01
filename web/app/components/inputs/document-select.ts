import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { restartableTask } from "ember-concurrency";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";

interface InputsDocumentSelectSignature {
  Args: {
    productArea: string;
  };
}

export default class InputsDocumentSelect extends Component<InputsDocumentSelectSignature> {
  @service declare algolia: AlgoliaService;
  @service declare configSvc: ConfigService;

  @tracked shownDocuments: HermesDocument[] | null = null;
  @tracked query = "";
  @tracked selectedDocument: HermesDocument | null = null;

  @action onChange(document: HermesDocument) {
    this.selectedDocument = document;
  }

  protected search = restartableTask(async (inputEvent: InputEvent) => {
    const input = inputEvent.target as HTMLInputElement;
    this.query = input.value;

    if (this.query === "") {
      this.shownDocuments = null;
      return;
    }

    // can this be scoped to title searches?
    // is there a need to search the body?

    let algoliaResponse = await this.algolia.search.perform(this.query, {
      hitsPerPage: 5,
      attributesToRetrieve: ["title", 'product', 'docNumber'],
      // give extra ranking to docs in the same product area
      optionalFilters: ["product:" + this.args.productArea],
    });

    if (algoliaResponse) {
      this.shownDocuments = algoliaResponse.hits as HermesDocument[];
    }
  });
}
