import Component from "@glimmer/component";

interface RowResultsComponentSignature {
  Args: {
    // TODO: Add HermesDocument[] when we have a type for it.
    docs: unknown[];
    isDraft?: boolean;
    nbPages: number;
    currentPage: number;
  };
}
export default class RowResultsComponent extends Component<RowResultsComponentSignature> {}
