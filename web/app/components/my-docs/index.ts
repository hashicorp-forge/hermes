import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";

interface MyDocsIndexComponentSignature {
  Element: null;
  Args: {
    draftsAndDocs: HermesDocument[];
    documents: HermesDocument[];
    drafts: HermesDocument[];
  };
  Blocks: {
    default: [];
  };
}

export default class MyDocsIndexComponent extends Component<MyDocsIndexComponentSignature> {
  @tracked selectedTab = "all";

  get docsToShow() {
    switch (this.selectedTab) {
      case "all":
        return this.args.draftsAndDocs;
      case "drafts":
        return this.args.drafts;
      case "documents":
        return this.args.documents;
      default:
        return [];
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    MyDocs: typeof MyDocsIndexComponent;
  }
}
