import Component from "@glimmer/component";
import { RelatedResource } from "../related-resources";
import { action } from "@ember/object";
// TEMPORARILY USING STUBS FOR EMBER 6.x UPGRADE  
import { TransitionRules, TransitionContext, wait, move, fadeIn, fadeOut, easeOutExpo, easeOutQuad } from "hermes/utils/ember-animated-stubs";
import { emptyTransition } from "hermes/utils/ember-animated/empty-transition";
import highlightElement from "hermes/utils/ember-animated/highlight-element";
import Ember from "ember";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import scrollIntoViewIfNeeded from "hermes/utils/scroll-into-view-if-needed";

interface ProjectResourceListComponentSignature {
  Element: HTMLDivElement;
  Args: {
    items: RelatedResource[];
    shouldAnimate: boolean;
    motion: unknown;
    isReadOnly: boolean;
    onSave: (currentIndex: number, newIndex: number) => void;
  };
  Blocks: {
    header: [];
    item: [
      {
        item: RelatedResource;
        index: number;
        isReadOnly: boolean;
        canMoveUp: boolean;
        canMoveDown: boolean;
        moveToTop: () => void;
        moveUp: () => void;
        moveDown: () => void;
        moveToBottom: () => void;
      },
    ];
  };
}

export default class ProjectResourceListComponent extends Component<ProjectResourceListComponentSignature> {
  @service declare router: RouterService;

  /**
   * Whether the badge should be shown.
   * If there are items, the badge should be shown.
   * If there are no items, the badge should not be shown.
   */
  protected get badgeIsShown() {
    return this.args.items.length > 0;
  }

  /**
   * The number to display in the badge, if it's visible.
   * Uses the passed-in count if it's greater than 0, otherwise
   * displays 1 for a more natural fade-out transition.
   */
  protected get badgeCount(): string {
    if (!this.badgeIsShown) {
      // This is the case in animate-out transitions
      return "1";
    } else {
      return `${this.args.items.length}`;
    }
  }

  @action protected badgeTransitionRules() {
    if (this.args.shouldAnimate) {
      return this.badgeTransition;
    } else {
      return emptyTransition;
    }
  }

  @action protected emptyStateTransitionRules({
    oldItems,
    newItems,
  }: TransitionRules) {
    if (this.args.shouldAnimate) {
      // ignore animation when leaving the project
      if (!!oldItems[0] && newItems[0] === undefined) {
        return emptyTransition;
      }

      // handle the case of the first item being added
      if (newItems[0] === true && oldItems[0] === false) {
        return this.removeEmptyState;
      }

      // handle the case where the section is emptying
      if (newItems[0] === false && oldItems[0] === true) {
        return this.showEmptyState;
      }
    }

    return emptyTransition;
  }

  @action protected listTransitionRules() {
    if (this.args.shouldAnimate) {
      // ignore animation when leaving the project
      if (!this.router.currentRouteName.includes("projects.project")) {
        return emptyTransition;
      }
      return this.listTransition;
    } else {
      return emptyTransition;
    }
  }

  *badgeTransition({ insertedSprites, removedSprites }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    // Animate in
    for (let sprite of insertedSprites) {
      sprite.startTranslatedBy(-3, 0);
      yield wait(300);
      void move(sprite, { duration: 500, easing: easeOutExpo });
      void fadeIn(sprite, { duration: 80 });
    }

    // Animate out
    for (let sprite of removedSprites) {
      void fadeOut(sprite, { duration: 80 });
    }
  }

  *removeEmptyState({ insertedSprites, removedSprites }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    for (let sprite of removedSprites) {
      sprite.endTranslatedBy(0, 10);
      void move(sprite, { duration: 120, easing: easeOutQuad });
      void fadeOut(sprite, { duration: 120 });
    }

    // Insert the resource list right away;
    // the `each` transition will handle fadeIns
    for (let sprite of insertedSprites) {
      sprite.reveal();
    }
  }

  *showEmptyState({ insertedSprites }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    for (let sprite of insertedSprites) {
      yield wait(50);
      sprite.startTranslatedBy(0, 10);
      void move(sprite, { duration: 200, easing: easeOutQuad });
      void fadeIn(sprite, { duration: 100 });
    }

    // The `each` transition handles removedSprites
  }

  *listTransition({
    insertedSprites,
    keptSprites,
    removedSprites,
  }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    const insertedSprite = insertedSprites[0]?.element;
    const removedSprite = removedSprites[0]?.element;

    // Edit transition
    if (insertedSprite && removedSprite) {
      for (let sprite of removedSprites) {
        sprite.hide();
      }

      for (let sprite of insertedSprites) {
        sprite.reveal();
        void highlightElement(sprite.element);
      }

      return;
    }

    for (let sprite of removedSprites) {
      sprite.reveal();
      sprite.applyStyles({
        "border-top-color": "transparent",
      });
      void move(sprite, { duration: 200, easing: easeOutQuad });
      void fadeOut(sprite, { duration: 120 });
    }

    for (let sprite of keptSprites) {
      // Ensure keptSprites overlay removedSprites for a cleaner animation
      sprite.applyStyles({
        "z-index": "1",
        "background-color": "var(--token-color-page-primary)",
      });
      void move(sprite, { duration: 300, easing: easeOutQuad });
    }

    for (let sprite of insertedSprites) {
      scrollIntoViewIfNeeded(sprite.element, {
        behavior: "smooth",
      });
      yield wait(60);
      void fadeIn(sprite, { duration: 150 });
      void highlightElement(sprite.element);
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::ResourceList": typeof ProjectResourceListComponent;
  }
}
