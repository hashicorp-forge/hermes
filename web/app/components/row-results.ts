import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface RowResultsComponentSignature {
  Args: {
    docs: HermesDocument[];
    isDraft?: boolean;
    nbPages: number;
    currentPage: number;
  };
}
export default class RowResultsComponent extends Component<RowResultsComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    RowResults: typeof RowResultsComponent;
  }
}
