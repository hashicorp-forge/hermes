import Component from "@glimmer/component";
import { RelatedHermesDocument } from "../related-resources";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import ConfigService from "hermes/services/config";
import { DEFAULT_FILTERS } from "hermes/services/active-filters";

interface DocTileMediumComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    doc: RelatedHermesDocument | HermesDocument;
    avatarIsLoading?: boolean;

    /**
     * The search query associated with the current view.
     * Used to highlight search terms in the document title.
     */
    query?: string | null;
  };
  Blocks: {
    default: [];
  };
}

export default class DocTileMediumComponent extends Component<DocTileMediumComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  protected get docID() {
    if ("googleFileID" in this.args.doc) {
      return this.args.doc.googleFileID;
    } else {
      return this.args.doc.objectID;
    }
  }

  protected get docNumber() {
    if ("documentNumber" in this.args.doc) {
      return this.args.doc.documentNumber;
    } else {
      return this.args.doc.docNumber;
    }
  }

  protected get docType() {
    if ("documentType" in this.args.doc) {
      return this.args.doc.documentType;
    } else {
      return this.args.doc.docType;
    }
  }

  protected get docIsDraft() {
    return this.args.doc.status?.toLowerCase() === "wip";
  }

  /**
   * The snippet, if the doc is a search result.
   * We show this instead of the doc description if it exists.
   */
  protected get snippet() {
    if ("_snippetResult" in this.args.doc) {
      return this.args.doc._snippetResult?.content.value;
    }
  }
  /**
   * The query parameters for the doc-owner LinkTos.
   * Sets the "owners" filter to the owner of the document,
   * and default values for the rest.
   */
  protected get ownerQuery() {
    return {
      ...DEFAULT_FILTERS,
      owners: this.args.doc.owners,
      page: 1,
    };
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::TileMedium": typeof DocTileMediumComponent;
  }
}
