import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import Ember from "ember";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { restartableTask } from "ember-concurrency";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import simpleTimeout from "hermes/utils/simple-timeout";
import { action } from "@ember/object";
import { assert } from "@ember/debug";

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
  @tracked button: HTMLElement | null = null;

  @action didInsertButton(e: HTMLElement) {
    this.button = e;
  }

  protected copyURL = restartableTask(async () => {
    try {
      await navigator.clipboard.writeText(this.args.url);

      if (navigator.clipboard.readText) {
        const result = await navigator.clipboard.readText();
        if (result === this.args.url) {
          this.urlWasRecentlyCopied = true;
          assert('button must exist', this.button);

          let tooltipId = this.button.getAttribute("aria-describedby");

          assert('tooltipId must exist', tooltipId);

          document.getElementById(tooltipId)?.setAttribute('data-url-copied', 'true')

          await simpleTimeout(Ember.testing ? 100 : 2000);

          this.urlWasRecentlyCopied = false;

          document.getElementById(tooltipId)?.setAttribute('data-url-copied', 'false')
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
