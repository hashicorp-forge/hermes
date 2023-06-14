import Component from "@glimmer/component";

interface HeaderUserMenuHighlightSignature {
  Args: {};
}

export default class HeaderUserMenuHighlight extends Component<HeaderUserMenuHighlightSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::UserMenuHighlight": typeof HeaderUserMenuHighlight;
  }
}
