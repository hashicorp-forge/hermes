import Component from "@glimmer/component";
import {
  ProjectStatus,
  COLOR_BG_ACTIVE,
  COLOR_BG_COMPLETED,
  COLOR_BG_ARCHIVED,
  COLOR_OUTLINE_ACTIVE,
  COLOR_OUTLINE_COMPLETED,
  COLOR_OUTLINE_ARCHIVED,
  COLOR_ICON_ACTIVE,
  COLOR_ICON_COMPLETED,
} from "hermes/types/project-status";

interface ProjectStatusIconComponentSignature {
  Element: SVGElement;
  Args: {
    status: `${ProjectStatus}`;
  };
}

export default class ProjectStatusIconComponent extends Component<ProjectStatusIconComponentSignature> {
  /**
   * Whether the current project status is active.
   * Determines if the "zap" icon is shown.
   */
  protected get isActive(): boolean {
    return this.args.status === ProjectStatus.Active;
  }

  /**
   * Whether the current project status is completed.
   * Determines if the "check" icon is shown.
   */
  protected get isCompleted(): boolean {
    return this.args.status === ProjectStatus.Completed;
  }

  /**
   * The background color of the folder.
   */
  protected get bgColor(): string {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return COLOR_BG_ACTIVE;
      case ProjectStatus.Completed:
        return COLOR_BG_COMPLETED;
      default:
        return COLOR_BG_ARCHIVED;
    }
  }

  /**
   * The stroke color of the folder.
   */
  protected get outlineColor(): string {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return COLOR_OUTLINE_ACTIVE;
      case ProjectStatus.Completed:
        return COLOR_OUTLINE_COMPLETED;
      default:
        return COLOR_OUTLINE_ARCHIVED;
    }
  }

  /**
   * The color of the status icon.
   */
  protected get iconColor(): string {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return COLOR_ICON_ACTIVE;
      case ProjectStatus.Completed:
        return COLOR_ICON_COMPLETED;
      default:
        return COLOR_OUTLINE_ARCHIVED;
    }
  }

  /***
   * Note: we use `data-test-color` to test color attributes since `fill`
   * and `stroke` are converted from CSS tokens to `rgb` by `getAttribute`.
   * By using `data-test-color` we can confirm the original token.
   */
  <template>
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-test-project-status-icon
      data-test-status={{@status}}
      ...attributes
    >
      {{! Background }}
      <path
        data-test-background
        data-test-color={{this.bgColor}}
        fill={{this.bgColor}}
        fill-rule="evenodd"
        d="M2.25 2A2.25 2.25 0 0 0 0 4.25v11.5A2.25 2.25 0 0 0 2.25 18h15.5A2.25 2.25 0 0 0 20 15.75v-9.5A2.25 2.25 0 0 0 17.75 4H9.871a.75.75 0 0 1-.53-.22L8.22 2.66A2.25 2.25 0 0 0 6.629 2H2.25Z"
        clip-rule="evenodd"
        {{! opacity=".2" }}
      />

      {{! Outline }}
      <path
        data-test-outline
        data-test-color={{this.outlineColor}}
        fill={{this.outlineColor}}
        fill-rule="evenodd"
        d="M2.25 2A2.25 2.25 0 0 0 0 4.25v11.5A2.25 2.25 0 0 0 2.25 18h15.5A2.25 2.25 0 0 0 20 15.75v-9.5A2.25 2.25 0 0 0 17.75 4H9.871a.75.75 0 0 1-.53-.22L8.22 2.66A2.25 2.25 0 0 0 6.629 2H2.25ZM1.5 4.25a.75.75 0 0 1 .75-.75h4.379a.75.75 0 0 1 .53.22L8.28 4.84a2.25 2.25 0 0 0 1.591.659h7.879a.75.75 0 0 1 .75.75v9.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V8h5.81a.75.75 0 1 0 0-1.5H1.5V4.25Z"
        clip-rule="evenodd"
        opacity=".6"
      />

      {{#if this.isActive}}
        {{! Lightning bolt }}
        <path
          data-test-active-affordance
          data-test-color={{this.iconColor}}
          stroke={{this.iconColor}}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="m14.518 7.501-2.75 3.776 4.544-.798-2.924 3.716"
          opacity=".75"
        />
      {{else if this.isCompleted}}
        {{! Check }}
        <path
          data-test-completed-affordance
          data-test-color={{this.iconColor}}
          stroke={{this.iconColor}}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="m10 11.04 1.982 2.835 3.875-6.215"
        />
      {{else}}
        {{! Shadow lines }}
        <path
          data-test-archived-affordance
          data-test-color={{this.outlineColor}}
          fill={{this.outlineColor}}
          d="M12.44 11.412a.75.75 0 0 0 0-1.5v1.5Zm0-1.5H1.494v1.5H12.44v-1.5ZM12.519 14.775a.75.75 0 1 0 0-1.5v1.5Zm0-1.5H1.494v1.5H12.52v-1.5Z"
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
