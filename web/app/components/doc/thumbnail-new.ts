import Component from "@glimmer/component";

interface DocThumbnailNewComponentSignature {
  Element: null;
  Args: {
    title: string;
    status: string;
    product: string;
    docType: string;
    avatarURL: string;
  };
  Blocks: {
    default: [];
  };
}

export default class DocThumbnailNewComponent extends Component<DocThumbnailNewComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::ThumbnailNew": typeof DocThumbnailNewComponent;
  }
}
