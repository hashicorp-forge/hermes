import Component from "@glimmer/component";

interface AdminProductAreasNewSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AdminProductAreasNew extends Component<AdminProductAreasNewSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::ProductAreas::New": typeof AdminProductAreasNew;
  }
}
