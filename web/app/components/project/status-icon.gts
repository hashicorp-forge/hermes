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

const FOLDER_HIGHLIGHT_BG = "#EAD2FE";
const FOLDER_HIGHLIGHT_OUTLINE = "#A737FF";
const FOLDER_HIGHLIGHT_ICON = "#7b00db";

const FOLDER_SUCCESS_BG = "#CCEEDA";
const FOLDER_SUCCESS_OUTLINE = "#008A22";
const FOLDER_SUCCESS_ICON = "#00781E";

const FOLDER_GRAY_BG = "#E2E2E2";
const FOLDER_GRAY_OUTLINE = "#8C909C";

export default class ProjectStatusIconComponent extends Component<ProjectStatusIconComponentSignature> {
  protected get isActive(): boolean {
    return this.args.status === ProjectStatus.Active;
  }

  protected get isCompleted(): boolean {
    return this.args.status === ProjectStatus.Completed;
  }

  protected get folderColor(): string {
    if (this.isActive) {
      return FOLDER_HIGHLIGHT_BG;
    } else if (this.isCompleted) {
      return FOLDER_SUCCESS_BG;
    } else {
      return FOLDER_GRAY_BG;
    }
  }

  protected get folderOutlineColor(): string {
    if (this.isActive) {
      return FOLDER_HIGHLIGHT_OUTLINE;
    } else if (this.isCompleted) {
      return FOLDER_SUCCESS_OUTLINE;
    } else {
      return FOLDER_GRAY_OUTLINE;
    }
  }

  protected get folderIconColor(): string {
    if (this.isActive) {
      return FOLDER_HIGHLIGHT_ICON;
    } else if (this.isCompleted) {
      return FOLDER_SUCCESS_ICON;
    } else {
      return FOLDER_HIGHLIGHT_ICON;
    }
  }

  // TODO: make sure all exports are based on 16x16 viewBoxes

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
        d="M3.743 2a2.25 2.25 0 0 0-2.25 2.25v7.5A2.25 2.25 0 0 0 3.743 14h9.5a2.25 2.25 0 0 0 2.25-2.25v-5.5A2.25 2.25 0 0 0 13.243 4h-2.879a.75.75 0 0 1-.53-.22L8.713 2.66A2.25 2.25 0 0 0 7.122 2h-3.38Z"
        clip-rule="evenodd"
      />
      {{! STROKE FILL }}
      <path
        fill={{this.folderOutlineColor}}
        fill-rule="evenodd"
        d="M2.627 1a2.25 2.25 0 0 0-2.25 2.25v9.5A2.25 2.25 0 0 0 2.627 15h11.5a2.25 2.25 0 0 0 2.25-2.25v-7.5A2.25 2.25 0 0 0 14.127 3h-3.879a.75.75 0 0 1-.53-.22L8.597 1.66A2.25 2.25 0 0 0 7.006 1h-4.38Zm-.75 2.25a.75.75 0 0 1 .75-.75h4.379a.75.75 0 0 1 .53.22L8.657 3.84a2.25 2.25 0 0 0 1.591.659h3.879a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75h-11.5a.75.75 0 0 1-.75-.75V7h5.81a.75.75 0 0 0 0-1.5h-5.81V3.25Z"
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
          d="m8.493 9.289 1.411 2.018 2.758-4.425"
        />
      {{else}}
        {{! FIXME: opacity is showing }}
        <path
          stroke={{this.folderOutlineColor}}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12.438 8.91H1.136M12.519 11.533H1.136"
          opacity=".6"
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
