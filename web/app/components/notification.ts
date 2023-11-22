import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import HermesFlashMessagesService from "hermes/services/flash-messages";

export default class Notification extends Component {
  @service declare flashMessages: HermesFlashMessagesService;
}
