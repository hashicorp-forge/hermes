import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { HermesDocumentType } from "hermes/types/document-type";

interface AdminProductAreasSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AdminProductAreas extends Component<AdminProductAreasSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::ProductAreas": typeof AdminProductAreas;
  }
}
