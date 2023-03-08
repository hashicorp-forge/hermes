import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import FlashMessageService from "ember-cli-flash/services/flash-messages";

export default class Notification extends Component {
  @service declare flashMessages: FlashMessageService;

  @action protected dismiss() {
    // Left empty as flash messages disappear on click
  }
}
