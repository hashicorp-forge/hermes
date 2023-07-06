import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import Ember from "ember";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { restartableTask, timeout } from "ember-concurrency";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import { action } from "@ember/object";
import { assert } from "@ember/debug";

interface CopyURLButtonComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    url: string;
    tooltipPlacement?: Placement;
    tooltipIsForcedOpen?: boolean;
    tooltipText?: string;
    tooltipIcon?: string;
  };
}

export default class CopyURLButtonComponent extends Component<CopyURLButtonComponentSignature> {
  @service declare flashMessages: FlashMessageService;

  /**
   * Whether the URL was recently copied to the clipboard.
   * Used to determine if the tooltip should say "Copy link" or "Copied."
   * Temporarily set true when the URL is successfully copied.
   */
  @tracked protected urlWasRecentlyCopied = false;

  protected get isForcedOpen() {
    return this.args.tooltipIsForcedOpen ?? false;
  }
  /**
   * The button element.
   * Used to get the tooltip's ID by way of the `aria-describedby` attribute.
   */
  @tracked private button: HTMLElement | null = null;

  get tooltipPlacement(): Placement {
    return this.args.tooltipPlacement ?? "top";
  }

  get tooltipText(): string {
    if (this.args.tooltipText) {
      return this.args.tooltipText;
    }

    return this.urlWasRecentlyCopied ? "Link copied!" : "Copy link";
  }

  get delay(): number | undefined {
    if (this.isForcedOpen) {
      return 0;
    }
  }

  /**
   * The action called when the button is clicked.
   * Registers the button element locally.
   */
  @action protected didInsertButton(e: HTMLElement) {
    this.button = e;
  }

  /**
   * The action called when the button is clicked.
   * Copies the URL to the clipboard and temporarily
   * triggers the "Copied" start of the tooltip.
   */
  protected copyURL = restartableTask(async () => {
    try {
      await navigator.clipboard.writeText(this.args.url);

      if (navigator.clipboard.readText) {
        const result = await navigator.clipboard.readText();
        if (result === this.args.url) {
          this.urlWasRecentlyCopied = true;
          assert("button must exist", this.button);

          let tooltipId = this.button.getAttribute("aria-describedby");

          assert("tooltipId must exist", tooltipId);

          document
            .getElementById(tooltipId)
            ?.setAttribute("data-url-copied", "true");

          await timeout(Ember.testing ? 0 : 2000);

          this.urlWasRecentlyCopied = false;

          document
            .getElementById(tooltipId)
            ?.setAttribute("data-url-copied", "false");
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

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    CopyURLButton: typeof CopyURLButtonComponent;
  }
}
