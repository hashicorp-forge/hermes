import Component from "@glimmer/component";
import { OverflowItem } from "../related-resources/overflow-menu";

interface ProjectResourceComponentSignature {
  Element: HTMLDivElement;
  Args: {
    overflowMenuItems: Record<string, OverflowItem>;
  };
  Blocks: {
    default: [];
  };
}

export default class ProjectResourceComponent extends Component<ProjectResourceComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Resource": typeof ProjectResourceComponent;
  }
}
