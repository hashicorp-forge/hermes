import Component from "@glimmer/component";
import { RecentlyViewedDoc } from "hermes/services/recently-viewed";

interface DashboardRecentlyViewedItemComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    item: RecentlyViewedDoc;
  };
}

export default class DashboardRecentlyViewedItemComponent extends Component<DashboardRecentlyViewedItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::RecentlyViewed::Item": typeof DashboardRecentlyViewedItemComponent;
  }
}
