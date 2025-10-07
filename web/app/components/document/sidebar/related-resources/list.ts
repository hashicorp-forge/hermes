import Component from "@glimmer/component";
// TEMPORARILY USING STUBS FOR EMBER 6.x UPGRADE
import { TransitionContext, move, fadeIn, fadeOut, wait, easeOutQuad } from "hermes/utils/ember-animated-stubs";
import animateTransform from "hermes/utils/ember-animated/animate-transform";
import { action } from "@ember/object";
// import { Transition } from "ember-animated/-private/transition";
type Transition = any; // stub type
import { isTesting } from "@embroider/macros";
import { emptyTransition } from "hermes/utils/ember-animated/empty-transition";
import { assert } from "@ember/debug";

interface DocumentSidebarRelatedResourcesListComponentSignature {
  Element: HTMLUListElement;
  Args: {
    items: any[];
    itemLimit?: number;
    showModal?: () => void;
    editingIsDisabled?: boolean;
  };
  Blocks: {
    resource: [resource: any];
  };
}

export default class DocumentSidebarRelatedResourcesListComponent extends Component<DocumentSidebarRelatedResourcesListComponentSignature> {
  /**
   * Whether the list should animate.
   * Used to disable the animation on first render.
   */
  private shouldAnimate = false;

  /**
   * Whether the list is empty.
   * Determines if we show an empty state.
   */
  get listIsEmpty() {
    return this.args.items.length === 0;
  }

  /**
   * The action to enable animations.
   * Called when the list is rendered, just
   * after the transitionRules have been set
   */
  @action protected enableAnimation() {
    this.shouldAnimate = true;
  }

  /**
   * The action to show the "add resource" modal.
   * Triggered when clicking the empty-state button.
   */
  @action protected showModal() {
    assert("showModal is required", this.args.showModal);
    this.args.showModal();
  }

  /**
   * The transition rules for the list.
   * Returns an empty transition on first render, and
   * on subsequent checks, returns the default transition.
   */
  @action transitionRules({ firstTime }: { firstTime: boolean }): Transition {
    if (firstTime) {
      if (this.shouldAnimate === false) {
        return emptyTransition;
      }
    }
    return this.transition;
  }

  /**
   * The transition for the list items.
   * Called when the list changes.
   */
  *transition({
    insertedSprites,
    keptSprites,
    removedSprites,
  }: TransitionContext) {
    if (isTesting()) {
      return;
    }

    for (let sprite of keptSprites) {
      void move(sprite, { duration: 250, easing: easeOutQuad });
    }

    for (let sprite of removedSprites) {
      void fadeOut(sprite, { duration: 0 });
    }

    yield wait(100);

    for (let sprite of insertedSprites) {
      void animateTransform(sprite, {
        scale: {
          from: 0.95,
        },
        duration: 200,
        easing: easeOutQuad,
      });
      void fadeIn(sprite, { duration: 50 });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::List": typeof DocumentSidebarRelatedResourcesListComponent;
  }
}
