import Component from "@glimmer/component";
import { ProjectStatus } from "hermes/types/project-status";

interface ProjectStatusIconComponentSignature {
  Element: SVGElement;
  Args: {
    status: `${ProjectStatus}`;
  };
  Blocks: {
    default: [];
  };
}

const COLOR_BG_ACTIVE = "var(--token-color-palette-purple-100)";
const COLOR_OUTLINE_ACTIVE = "var(--token-color-palette-purple-200)";
const COLOR_ICON_ACTIVE = "var(--token-color-palette-purple-400)";

const COLOR_BG_COMPLETED = "var(--token-color-palette-green-100)";
const COLOR_OUTLINE_COMPLETED = "var(--token-color-palette-green-200)";
const COLOR_ICON_COMPLETED = "var(--token-color-palette-green-300)";

const COLOR_BG_ARCHIVED = "var(--token-color-palette-neutral-200)";
const COLOR_OUTLINE_ARCHIVED = "var(--token-color-palette-neutral-400)";

export default class ProjectStatusIconComponent extends Component<ProjectStatusIconComponentSignature> {
  protected get isActive(): boolean {
    return this.args.status === ProjectStatus.Active;
  }

  protected get isCompleted(): boolean {
    return this.args.status === ProjectStatus.Completed;
  }

  protected get folderColor(): string {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return COLOR_BG_ACTIVE;
      case ProjectStatus.Completed:
        return COLOR_BG_COMPLETED;
      default:
        return COLOR_BG_ARCHIVED;
    }
  }

  protected get folderOutlineColor(): string {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return COLOR_OUTLINE_ACTIVE;
      case ProjectStatus.Completed:
        return COLOR_OUTLINE_COMPLETED;
      default:
        return COLOR_OUTLINE_ARCHIVED;
    }
  }

  protected get folderIconColor(): string {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return COLOR_ICON_ACTIVE;
      case ProjectStatus.Completed:
        return COLOR_ICON_COMPLETED;
      default:
        return COLOR_OUTLINE_ARCHIVED;
    }
  }

  <template>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-test-project-status-icon
      data-test-status={{this.args.status}}
      ...attributes
    >
      {{! BACKGROUND FILL }}
      <path
        fill={{this.folderColor}}
        fill-rule="evenodd"
        d="M2.25 1A2.25 2.25 0 0 0 0 3.25v9.5A2.25 2.25 0 0 0 2.25 15h11.5A2.25 2.25 0 0 0 16 12.75v-7.5A2.25 2.25 0 0 0 13.75 3H9.871a.75.75 0 0 1-.53-.22L8.22 1.66A2.25 2.25 0 0 0 6.629 1H2.25Z"
        clip-rule="evenodd"
      />

      {{! STROKE FILL }}
      <path
        fill={{this.folderOutlineColor}}
        fill-rule="evenodd"
        d="M2.25 1A2.25 2.25 0 0 0 0 3.25v9.5A2.25 2.25 0 0 0 2.25 15h11.5A2.25 2.25 0 0 0 16 12.75v-7.5A2.25 2.25 0 0 0 13.75 3H9.871a.75.75 0 0 1-.53-.22L8.22 1.66A2.25 2.25 0 0 0 6.629 1H2.25ZM1.5 3.25a.75.75 0 0 1 .75-.75h4.379a.75.75 0 0 1 .53.22L8.28 3.84a2.25 2.25 0 0 0 1.591.659h3.879a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V7h6.13a.75.75 0 0 0 0-1.5H1.5V3.25Z"
        clip-rule="evenodd"
        opacity=".6"
      />

      {{! ICON }}
      {{#if this.isActive}}
        <path
          stroke={{this.folderIconColor}}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M11.221 6.717 9.168 9.536l3.393-.596-2.183 2.775"
          opacity=".75"
        />
      {{else if this.isCompleted}}
        <path
          stroke={{this.folderIconColor}}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="m8.116 9.289 1.411 2.018 2.759-4.425"
        />
      {{else}}
        <path
          fill={{this.folderOutlineColor}}
          fill-rule="evenodd"
          d="M2.25 1A2.25 2.25 0 0 0 0 3.25v9.5A2.25 2.25 0 0 0 2.25 15h11.5A2.25 2.25 0 0 0 16 12.75v-7.5A2.25 2.25 0 0 0 13.75 3H9.871a.75.75 0 0 1-.53-.22L8.22 1.66A2.25 2.25 0 0 0 6.629 1H2.25ZM1.5 3.25a.75.75 0 0 1 .75-.75h4.379a.75.75 0 0 1 .53.22L8.28 3.84a2.25 2.25 0 0 0 1.591.659h3.879a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V7h6.13a.75.75 0 0 0 0-1.5H1.5V3.25Z"
          clip-rule="evenodd"
        />
        <path
          fill={{this.folderOutlineColor}}
          d="M12.44 9.66a.75.75 0 0 0 0-1.5v1.5Zm0-1.5H1.494v1.5H12.44v-1.5ZM12.519 12.283a.75.75 0 1 0 0-1.5v1.5Zm0-1.5H1.494v1.5H12.52v-1.5Z"
        />
      {{/if}}
    </svg>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::StatusIcon": typeof ProjectStatusIconComponent;
  }
}
