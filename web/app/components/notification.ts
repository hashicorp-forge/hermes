import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import type HermesFlashMessagesService from "hermes/services/flash-messages";

export default class Notification extends Component {
  @service declare flashMessages: HermesFlashMessagesService;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Notification: typeof Notification;
  }
}
