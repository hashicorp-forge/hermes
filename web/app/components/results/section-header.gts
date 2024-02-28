import Component from "@glimmer/component";
import { LinkTo } from "@ember/routing";
import HdsBadgeCount from "@hashicorp/design-system-components/components/hds/badge-count";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";

interface ResultsSectionHeaderComponentSignature {
  Args: {
    text: string;
    count?: number;
    query?: Record<string, string | null>;
  };
}

interface TitleAndCountSignature {
  Args: {
    text: string;
    count?: number;
  };
}

class ResultsSectionTitleAndCount extends Component<TitleAndCountSignature> {
  <template>
    <h4 class="hermes-h4">{{@text}}</h4>
    <HdsBadgeCount data-test-count @text="{{@count}}" />
  </template>
}

export default class ResultsSectionHeaderComponent extends Component<ResultsSectionHeaderComponentSignature> {
  <template>
    {{#if @query}}
      <LinkTo
        data-test-section-header
        @route="authenticated.results"
        @query={{@query}}
        class="section-header"
      >
        <ResultsSectionTitleAndCount @text={{@text}} @count={{@count}} />
        <FlightIcon
          @name="chevron-right"
          class="-ml-0.5 text-color-foreground-disabled"
        />
      </LinkTo>
    {{else}}
      <div data-test-section-header class="section-header">
        <ResultsSectionTitleAndCount @text={{@text}} @count={{@count}} />
      </div>
    {{/if}}
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Results::SectionHeader": typeof ResultsSectionHeaderComponent;
  }
}
