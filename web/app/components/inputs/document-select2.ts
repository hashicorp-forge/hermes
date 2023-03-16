import Component from "@glimmer/component";
import { A } from "@ember/array";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import { HermesDocument } from "hermes/types/document";

import { restartableTask } from "ember-concurrency";
interface InputsDocumentSelect2ComponentSignature {
  Args: {};
}

export default class InputsDocumentSelect2Component extends Component<InputsDocumentSelect2ComponentSignature> {
  @service declare algolia: AlgoliaService;

  @tracked relatedResources = A();

  @tracked inputValue = "";
  @tracked query = "";

  @tracked inputValueIsValid = false;
  @tracked popoverIsShown = false;
  @tracked popoverTrigger: HTMLElement | null = null;
  @tracked shownDocuments: HermesDocument[] | null = null;

  @tracked searchInput: HTMLInputElement | null = null;

  get userHasSearched() {
    return this.query.length > 0;
  }

  get searchButtonIsShown() {
    return this.inputValue.length === 0;
  }

  @action maybeAddResource() {
    if (!this.inputValueIsValid) {
      alert("invalid url");
    } else {
      this.relatedResources.pushObject(this.inputValue);
      this.clearSearch();
    }
  }

  @action togglePopover() {
    this.popoverIsShown = !this.popoverIsShown;
  }

  @action hidePopover() {
    this.popoverIsShown = false;
  }

  @action onInputFocusin(e: FocusEvent) {
    const input = e.target as HTMLInputElement;
    input.placeholder = "";

    this.popoverIsShown = true;
  }

  @action registerPopoverTrigger(e: HTMLElement) {
    this.popoverTrigger = e;
  }

  @action onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.maybeAddResource();
    }

    if (event.key === "Escape") {
      this.clearSearch();
    }
  }

  @action onInput(event: Event) {
    this.inputValue = (event.target as HTMLInputElement).value;
    this.checkURL.perform();
  }

  @action clearSearch() {
    this.inputValue = "";
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
      // optionalFilters: ["product:" + this.args.productArea],
    });

    if (algoliaResponse) {
      this.shownDocuments = algoliaResponse.hits as HermesDocument[];
    }
  });

  protected checkURL = restartableTask(async () => {
    const url = this.inputValue;
    try {
      this.inputValueIsValid = Boolean(new URL(url));
    } catch (e) {
      this.inputValueIsValid = false;
    }
  });
}
