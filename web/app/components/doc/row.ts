import Component from "@glimmer/component";

interface DocRowComponentSignature {
  Args: {
    productArea: string;
  };
}

export default class DocRowComponent extends Component<DocRowComponentSignature> {
  get productAreaName() {
    if (this.args.productArea === "Cloud Platform") {
      return "HCP";
    } else {
      return this.args.productArea;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Row": typeof DocRowComponent;
  }
}
