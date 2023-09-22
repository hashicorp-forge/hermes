import Component from "@glimmer/component";
import or from "ember-truth-helpers/helpers/or";

interface EmptyStateTextComponentSignature {
  Element: HTMLParagraphElement;
  Args: {
    text?: string;
  };
  Blocks: {};
}

export default class EmptyStateTextComponent extends Component<EmptyStateTextComponentSignature> {
  <template>
    <p class="empty-state-text text-color-foreground-disabled" ...attributes>
      {{or @text "None"}}
    </p>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    EmptyStateText: typeof EmptyStateTextComponent;
  }
}
