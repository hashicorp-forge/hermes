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
    selectedDocument: HermesDocument | null;
    onChange: (document: HermesDocument | null) => void;
  };
}

export default class InputsDocumentSelect extends Component<InputsDocumentSelectSignature> {
  @service declare algolia: AlgoliaService;
  @service declare configSvc: ConfigService;

  @tracked shownDocuments: HermesDocument[] | null = null;
  @tracked query = "";

  @action save(document: HermesDocument | null) {
    this.args.onChange(document);
    this.shownDocuments = null;
    this.query = "";
  }

  @action remove(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.save(null);
  }

  protected search = restartableTask(async (inputEvent: InputEvent) => {
    const input = inputEvent.target as HTMLInputElement;
    this.query = input.value;

    if (this.query === "") {
      this.shownDocuments = null;
      return;
    }

    let algoliaResponse = await this.algolia.search.perform(this.query, {
      hitsPerPage: 5,
      attributesToRetrieve: ["title", "product", "docNumber"],
      // give extra ranking to docs in the same product area
      optionalFilters: ["product:" + this.args.productArea],
    });

    if (algoliaResponse) {
      this.shownDocuments = algoliaResponse.hits as HermesDocument[];
    }
  });
}
