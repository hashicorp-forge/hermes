import Component from "@glimmer/component";

interface ProjectResourceEmptyStateComponentSignature {}

export default class ProjectResourceEmptyStateComponent extends Component<ProjectResourceEmptyStateComponentSignature> {
  <template>
    {{! Extra div for animation purposes }}
    <div data-test-resource-empty-state>
      <div
        class="pb-4 text-display-300 text-color-foreground-disabled opacity-70"
      >
        None
      </div>
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::ResourceEmptyState": typeof ProjectResourceEmptyStateComponent;
  }
}
