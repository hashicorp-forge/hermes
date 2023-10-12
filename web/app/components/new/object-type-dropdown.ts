import Component from "@glimmer/component";

enum HermesObjectType {
  Document = "Document",
  Project = "Project",
}

interface NewObjectTypeDropdownComponentSignature {
  Element: null;
  Args: {
    selected: `${HermesObjectType}`;
  };
  Blocks: {
    default: [];
  };
}

export default class NewObjectTypeDropdownComponent extends Component<NewObjectTypeDropdownComponentSignature> {
  protected objectTypes = {
    Document: {
      route: "authenticated.new.doc",
      icon: "file-text",
    },
    Project: {
      route: "authenticated.new.project",
      icon: "grid",
    },
  };
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::ObjectTypeDropdown": typeof NewObjectTypeDropdownComponent;
  }
}
