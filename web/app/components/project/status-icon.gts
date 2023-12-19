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

export default class ProjectStatusIconComponent extends Component<ProjectStatusIconComponentSignature> {
  protected get isActive(): boolean {
    return this.args.status === ProjectStatus.Active;
  }

  protected get isCompleted(): boolean {
    return this.args.status === ProjectStatus.Completed;
  }

  protected get isArchived(): boolean {
    return this.args.status === ProjectStatus.Archived;
  }

  <template>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="mix-blend-multiply"
      data-test-project-status-icon
      data-test-status={{this.args.status}}
      ...attributes
    >
      {{#if this.isActive}}
        <path
          d="M9.3747 0.078024C9.67891 0.228777 9.8439 0.565087 9.77695 0.897934L8.88834 5.31559L14.3726 6.22441C14.6414 6.26896 14.865 6.45581 14.9565 6.71247C15.048 6.96914 14.9931 7.25524 14.813 7.4598L7.52137 15.7455C7.29708 16.0004 6.92954 16.0728 6.62533 15.922C6.32112 15.7713 6.15612 15.435 6.22307 15.1021L7.11168 10.6845L1.6274 9.77566C1.35858 9.73111 1.13506 9.54426 1.04356 9.2876C0.952061 9.03093 1.00697 8.74483 1.18699 8.54027L8.47865 0.254555C8.70295 -0.000319332 9.07049 -0.0727287 9.3747 0.078024Z"
          fill="var(--token-color-palette-amber-100)"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9.3747 0.078024C9.67891 0.228777 9.8439 0.565087 9.77695 0.897934L8.88834 5.31559L14.3726 6.22441C14.6414 6.26896 14.865 6.45581 14.9565 6.71247C15.048 6.96914 14.9931 7.25524 14.813 7.4598L7.52137 15.7455C7.29708 16.0004 6.92954 16.0728 6.62533 15.922C6.32112 15.7713 6.15612 15.435 6.22307 15.1021L7.11168 10.6845L1.6274 9.77566C1.35858 9.73111 1.13506 9.54426 1.04356 9.2876C0.952061 9.03093 1.00697 8.74483 1.18699 8.54027L8.47865 0.254555C8.70295 -0.000319332 9.07049 -0.0727287 9.3747 0.078024ZM3.2058 8.51676L8.12263 9.33155C8.32326 9.3648 8.50179 9.4781 8.6173 9.64549C8.73281 9.81287 8.77539 10.02 8.73529 10.2194L8.24606 12.6515L12.7942 7.4833L7.8774 6.66852C7.67676 6.63527 7.49823 6.52197 7.38273 6.35458C7.26722 6.1872 7.22464 5.98008 7.26474 5.78071L7.75396 3.34856L3.2058 8.51676Z"
          {{! approx amber-200/70 }}
          fill="#C1834D"
        />
      {{else if this.isCompleted}}
        <path
          d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0Z"
          fill="var(--token-color-palette-green-50)"
        />
        <path
          d="M11.7803 5.21967C12.0732 5.51256 12.0732 5.98744 11.7803 6.28033L7.28033 10.7803C6.98744 11.0732 6.51256 11.0732 6.21967 10.7803L4.21967 8.78033C3.92678 8.48744 3.92678 8.01256 4.21967 7.71967C4.51256 7.42678 4.98744 7.42678 5.28033 7.71967L6.75 9.18934L10.7197 5.21967C11.0126 4.92678 11.4874 4.92678 11.7803 5.21967Z"
          {{! approx green-400/70 }}
          fill="#608D5F"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8ZM8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5Z"
          {{! approx green-400/70 }}
          fill="#608D5F"
        />
      {{else if this.isArchived}}
        <path
          d="M0 2.75C0 1.7835 0.783502 1 1.75 1H14.25C15.2165 1 16 1.7835 16 2.75V4.25C16 4.9481 15.5912 5.55073 15 5.83159V12.75C15 13.9926 13.9926 15 12.75 15H3.25C2.00736 15 1 13.9926 1 12.75V5.83159C0.408763 5.55073 0 4.9481 0 4.25V2.75Z"
          fill="var(--token-color-palette-neutral-100)"
        />
        <path
          d="M6.75 8C6.33579 8 6 8.33579 6 8.75C6 9.16421 6.33579 9.5 6.75 9.5H9.25C9.66421 9.5 10 9.16421 10 8.75C10 8.33579 9.66421 8 9.25 8H6.75Z"
          {{! approx neutral-500/70 }}
          fill="#8B8F97"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M0 2.75C0 1.7835 0.783502 1 1.75 1H14.25C15.2165 1 16 1.7835 16 2.75V4.25C16 4.9481 15.5912 5.55073 15 5.83159V12.75C15 13.9926 13.9926 15 12.75 15H3.25C2.00736 15 1 13.9926 1 12.75V5.83159C0.408763 5.55073 0 4.9481 0 4.25V2.75ZM13.5 12.75V6H2.5V12.75C2.5 13.1642 2.83579 13.5 3.25 13.5H12.75C13.1642 13.5 13.5 13.1642 13.5 12.75ZM14.5 4.25C14.5 4.38807 14.3881 4.5 14.25 4.5H1.75C1.61193 4.5 1.5 4.38807 1.5 4.25V2.75C1.5 2.61193 1.61193 2.5 1.75 2.5H14.25C14.3881 2.5 14.5 2.61193 14.5 2.75V4.25Z"
          {{! approx neutral-500/70 }}
          fill="#8B8F97"
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
