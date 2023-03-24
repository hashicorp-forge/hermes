import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import Ember from "ember";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { restartableTask } from "ember-concurrency";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import simpleTimeout from "hermes/utils/simple-timeout";

interface CopyURLButtonComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    url: string;
    tooltipPlacement?: Placement;
  };
}

export default class CopyURLButtonComponent extends Component<CopyURLButtonComponentSignature> {
  @service declare flashMessages: FlashMessageService;

  @tracked urlWasRecentlyCopied = false;

  protected copyURL = restartableTask(async () => {
    try {
      await navigator.clipboard.writeText(this.args.url);

      if (navigator.clipboard.readText) {
        const result = await navigator.clipboard.readText();
        if (result === this.args.url) {
          this.urlWasRecentlyCopied = true;
          await simpleTimeout(Ember.testing ? 10 : 2000);
          this.urlWasRecentlyCopied = false;
        }
      }
    } catch (e) {
      this.flashMessages.add({
        title: "Error copying link",
        message: e as string,
        type: "critical",
        timeout: 5000,
        extendedTimeout: 1000,
      });
    }
  });
}
