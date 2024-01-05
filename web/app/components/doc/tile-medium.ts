import Component from "@glimmer/component";
import { RelatedHermesDocument } from "../related-resources";
import { HermesDocument } from "hermes/types/document";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
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

  /**
   * The URL of the owner's avatar. If one isn't available,
   * we'll attempt to fetch it.
   */
  @tracked protected imgURL = this.args.doc.ownerPhotos?.[0];

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

  @action protected maybeLoadAvatar() {
    if (!this.imgURL) {
      this.getOwnerPhoto.perform(this.docID);
    }
  }

  /**
   * The task to get the owner photo for a document.
   */
  private getOwnerPhoto = task(async (docID: string) => {
    console.log("getOwnerPhoto");
    const doc = await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/documents/${docID}`)
      .then((response) => response?.json());

    this.imgURL = doc.ownerPhotos[0];
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::TileMedium": typeof DocTileMediumComponent;
  }
}
