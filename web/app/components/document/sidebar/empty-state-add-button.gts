import Component from "@glimmer/component";
import Action from "hermes/components/action";
import EmptyStateText from "hermes/components/empty-state-text";
import FlightIcon from "hermes/components/flight-icon";

interface DocumentSidebarEmptyStateAddButtonSignature {
  Element: HTMLButtonElement;
}

export default class DocumentSidebarEmptyStateAddButton extends Component<DocumentSidebarEmptyStateAddButtonSignature> {
  <template>
    <Action ...attributes class="field-toggle group pl-[5px]">
      <EmptyStateText />
      <span class="edit-affordance light-gray">
        <FlightIcon @name="plus" class="text-color-foreground-faint" />
      </span>
    </Action>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::EmptyStateAddButton": typeof DocumentSidebarEmptyStateAddButton;
  }
}
