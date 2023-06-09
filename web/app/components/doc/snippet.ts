import Component from "@glimmer/component";

interface DocSnippetComponentSignature {
  Element: HTMLParagraphElement;
  Args: {
    snippet: string;
  };
}

export default class DocSnippetComponent extends Component<DocSnippetComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Snippet": typeof DocSnippetComponent;
  }
}
