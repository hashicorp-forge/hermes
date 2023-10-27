import Component from "@glimmer/component";
import Action from "hermes/components/action";
import EmptyStateText from "hermes/components/empty-state-text";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import { on } from "@ember/modifier";

interface DocumentSidebarEmptyStateAddButtonSignature {
  Element: HTMLButtonElement | HTMLDivElement;
  Args: {
    isReadOnly?: boolean;
    action: () => void;
  };
}

export default class DocumentSidebarEmptyStateAddButton extends Component<DocumentSidebarEmptyStateAddButtonSignature> {
  <template>
    <div class="editable-field-container">
      <div class="editable-field button-affordance">
        {{#if @isReadOnly}}
          <div class="field-toggle read-only" ...attributes>
            <EmptyStateText />
          </div>
        {{else}}
          <Action {{on "click" @action}} class="field-toggle" ...attributes>
            <EmptyStateText />
            <span class="edit-affordance light-gray">
              <FlightIcon @name="plus" class="text-color-foreground-faint" />
            </span>
          </Action>
        {{/if}}
      </div>
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::EmptyStateAddButton": typeof DocumentSidebarEmptyStateAddButton;
  }
}
