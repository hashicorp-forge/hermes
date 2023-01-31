import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

export default class FooterComponent extends Component {
  @service declare router: RouterService;

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get currentYear(): number {
    return new Date().getFullYear();
  }
}
