import Component from "@glimmer/component";

interface ProjectResourceEmptyStateComponentSignature {}

export default class ProjectResourceEmptyStateComponent extends Component<ProjectResourceEmptyStateComponentSignature> {
  <template>
    <div
      class="py-4 text-display-300 text-color-foreground-disabled opacity-70"
    >
      None
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::ResourceEmptyState": typeof ProjectResourceEmptyStateComponent;
  }
}
