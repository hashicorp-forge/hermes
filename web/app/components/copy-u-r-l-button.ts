import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { isTesting } from "@embroider/macros";
import { restartableTask, timeout } from "ember-concurrency";
import { service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import { action } from "@ember/object";
import { assert } from "@ember/debug";
import HermesFlashMessagesService from "hermes/services/flash-messages";

interface CopyURLButtonComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    url: string;
    tooltipPlacement?: Placement;
    tooltipIsForcedOpen?: boolean;
    tooltipText?: string;
    icon?: string;
    isIconOnly?: boolean;
  };
}

export default class CopyURLButtonComponent extends Component<CopyURLButtonComponentSignature> {
  @service declare flashMessages: HermesFlashMessagesService;

  /**
   * Whether the URL was recently copied to the clipboard.
   * Used to determine if the tooltip should say "Copy link" or "Copied."
   * Temporarily set true when the URL is successfully copied.
   */
  @tracked protected urlWasRecentlyCopied = false;

  /**
   * The button element, captured on render.
   * Used to get the tooltip's ID by way of the `aria-describedby` attribute.
   */
  @tracked private button: HTMLElement | null = null;

  /**
   * Whether the tooltip is forced open regardless of hover state.
   * True when the parent has provided text for the tooltip,
   * such as "Creating link..." and "Link created!"
   */
  protected get tooltipIsForcedOpen() {
    return this.args.tooltipIsForcedOpen ?? false;
  }

  /**
   * The icon to show in the button.
   * If the parent has provided an icon, e.g., "loading," use that.
   * Otherwise use use "link" or, if a URL was recently copied, "check."
   */
  protected get icon() {
    if (this.args.icon) {
      return this.args.icon;
    } else {
      return this.urlWasRecentlyCopied ? "check" : "link";
    }
  }

  /**
   * The text to show in the tooltip.
   * If the parent has provided text, e.g., "Loading," use that.
   * Otherwise use "Copy link" or, if a URL was recently copied, "Link copied!"
   */
  get tooltipText(): string {
    if (this.args.tooltipText) {
      return this.args.tooltipText;
    } else {
      return this.defaultText;
    }
  }

  protected get defaultText(): string {
    return this.urlWasRecentlyCopied ? "Link copied!" : "Copy link";
  }

  /**
   * The action called when the button is clicked.
   * Registers the button locally for its `aria-describedby` attribute.
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

          if (this.args.isIconOnly && tooltipId) {
            document
              .getElementById(tooltipId)
              ?.setAttribute("data-url-copied", "true");
          }

          await timeout(isTesting() ? 0 : 2000);

          this.urlWasRecentlyCopied = false;

          if (this.args.isIconOnly && tooltipId) {
            document
              .getElementById(tooltipId)
              ?.setAttribute("data-url-copied", "false");
          }
        }
      }
    } catch (e) {
      this.flashMessages.critical((e as any).message, {
        title: "Error copying link",
      });
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    CopyURLButton: typeof CopyURLButtonComponent;
  }
}
