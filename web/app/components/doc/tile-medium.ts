import Component from "@glimmer/component";
import type { RelatedHermesDocument } from "../related-resources";
import type { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import type FetchService from "hermes/services/fetch";
import type ConfigService from "hermes/services/config";

interface DocTileMediumComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    doc: RelatedHermesDocument | HermesDocument;
    avatarIsLoading?: boolean;

    /**
     * Whether the tile is part of a list that can be reordered.
     * If true, we extend the hover/focus affordance into the gutter
     * where the grab handle will be.
     */
    canBeReordered?: boolean;

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
    if ("FileID" in this.args.doc) {
      return this.args.doc.FileID;
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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::TileMedium": typeof DocTileMediumComponent;
  }
}
