import Component from "@glimmer/component";
import eq from "ember-truth-helpers/helpers/eq";

interface MatchCountHeadlineSignature {
  Element: HTMLHeadingElement;
  Args: {
    count: number;
  };
  Blocks: {
    default: [];
  };
}

export default class MatchCountHeadline extends Component<MatchCountHeadlineSignature> {
  <template>
    <h1 class="mb-7 text-display-300 font-semibold" ...attributes>
      {{@count}}
      {{if (eq @count 1) "match" "matches"}}
    </h1>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    MatchCountHeadline: typeof MatchCountHeadline;
  }
}
