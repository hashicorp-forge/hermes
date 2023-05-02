import Component from "@glimmer/component";

interface DocSnippetComponentSignature {
  Args: {
    snippet: string;
  };
}

export default class DocSnippetComponent extends Component<DocSnippetComponentSignature> {}
