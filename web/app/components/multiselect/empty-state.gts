import Component from "@glimmer/component";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import EmptyStateText from "hermes/components/empty-state-text";

interface MultiselectEmptyStateComonentSignature {
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class MultiselectEmptyStateComonent extends Component<MultiselectEmptyStateComonentSignature> {
  /*
  <template>
    <div class="flex items-center gap-2">
      <FlightIcon @name="users" />
      <EmptyStateText @value="Search for your peers..." />
    </div>
  </template>


  */
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "multiselect/empty-state": typeof MultiselectEmptyStateComonent;
  }
}
