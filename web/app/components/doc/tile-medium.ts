import Component from "@glimmer/component";
import { RelatedHermesDocument } from "../related-resources";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import ConfigService from "hermes/services/config";
import { task } from "ember-concurrency";

interface DocTileMediumComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    doc: RelatedHermesDocument | HermesDocument;
    avatarIsLoading?: boolean;
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
   * The task to get the owner photo for a document.
   */
  private getOwnerPhoto = task(async (docID: string) => {
    const doc = await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/documents/${docID}`)
      .then((response) => response?.json());
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::TileMedium": typeof DocTileMediumComponent;
  }
}
