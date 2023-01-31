import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from "@ember/object";

export default class Notification extends Component {
    @service flashMessages;

    @action
    dismiss() {
        // Left empty as flash messages disappear on click
    }
}
