import Component from "@glimmer/component";

interface SettingsSubscriptionListItemComponentSignature {
  Args: {
    productArea: string;
  };
}

export default class SettingsSubscriptionListItemComponent extends Component<SettingsSubscriptionListItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Settings::SubscriptionListItem": typeof SettingsSubscriptionListItemComponent;
  }
}
