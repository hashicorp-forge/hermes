import getProjectStatusIcon from "hermes/helpers/get-project-status-icon";
import Component from "@glimmer/component";
import { ProjectStatus } from "hermes/types/project-status";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";

interface ProjectStatusIconComponentSignature {
  Element: HTMLDivElement;
  Args: {
    status: `${ProjectStatus}`;
  };
  Blocks: {
    default: [];
  };
}

export default class ProjectStatusIconComponent extends Component<ProjectStatusIconComponentSignature> {
  protected get fillColorClass() {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return "text-color-palette-amber-100";
      case ProjectStatus.Archived:
        return "text-color-palette-neutral-100";
      case ProjectStatus.Completed:
        return "text-color-palette-green-100 opacity-50 mix-blend-multiply";
    }
  }

  protected get strokeColorClass() {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return "text-color-palette-amber-200";
      case ProjectStatus.Archived:
        return "text-color-palette-neutral-500";
      case ProjectStatus.Completed:
        return "text-color-palette-green-400";
    }
  }

  protected get path() {
    switch (this.args.status) {
      case ProjectStatus.Active:
        return "M9.3747 0.078024C9.67891 0.228777 9.8439 0.565087 9.77695 0.897934L8.88834 5.31559L14.3726 6.22441C14.6414 6.26896 14.865 6.45581 14.9565 6.71247C15.048 6.96914 14.9931 7.25524 14.813 7.4598L7.52137 15.7455C7.29708 16.0004 6.92954 16.0728 6.62533 15.922C6.32112 15.7713 6.15612 15.435 6.22307 15.1021L7.11168 10.6845L1.6274 9.77566C1.35858 9.73111 1.13506 9.54426 1.04356 9.2876C0.952061 9.03093 1.00697 8.74483 1.18699 8.54027L8.47865 0.254555C8.70295 -0.000319332 9.07049 -0.0727287 9.3747 0.078024Z";
      case ProjectStatus.Archived:
        return "M0 2.75C0 1.7835 0.783502 1 1.75 1H14.25C15.2165 1 16 1.7835 16 2.75V4.25C16 4.9481 15.5912 5.55073 15 5.83159V12.75C15 13.9926 13.9926 15 12.75 15H3.25C2.00736 15 1 13.9926 1 12.75V5.83159C0.408763 5.55073 0 4.9481 0 4.25V2.75Z";
      case ProjectStatus.Completed:
        return "M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0Z";
    }
  }

  <template>
    <div class="relative flex {{this.strokeColorClass}}" ...attributes>
      <div class="absolute h-4 w-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class={{this.fillColorClass}}
        >
          <path d={{this.path}} fill="currentColor" />
        </svg>
      </div>
      <FlightIcon
        @name={{getProjectStatusIcon this.args.status}}
        class="relative opacity-70 mix-blend-multiply"
      />
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::StatusIcon": typeof ProjectStatusIconComponent;
  }
}
