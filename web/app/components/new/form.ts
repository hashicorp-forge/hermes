import Component from "@glimmer/component";
import { isTesting } from "@embroider/macros";
// TEMPORARILY USING STUBS FOR EMBER 6.x UPGRADE
import { TransitionContext, move, fadeIn, fadeOut, Resize, easeOutExpo, easeOutQuad } from "hermes/utils/ember-animated-stubs";

const FORM_RESIZE_DURATION = isTesting() ? 0 : 1250;

class HermesFormResize extends Resize {
  *animate() {
    this.opts.easing = easeOutExpo;
    this.opts.duration = FORM_RESIZE_DURATION;
    yield* super.animate();
  }
}

interface NewFormComponentSignature {
  Element: HTMLFormElement;
  Args: {
    taskIsRunning?: boolean;
    icon?: string;
    headline?: string;
    taskIsRunningHeadline?: string;
    taskIsRunningDescription?: string;
    buttonText: string;
    buttonIsActive?: boolean;
    isModal?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class NewFormComponent extends Component<NewFormComponentSignature> {
  protected motion = HermesFormResize;

  /**
   * Whether the "creating..." message is shown.
   * True if `@taskIsRunning` and `@isModal` is false/undefined.
   */
  protected get taskIsRunningMessageIsShown() {
    return this.args.taskIsRunning && !this.args.isModal;
  }

  *transition({ insertedSprites, removedSprites }: TransitionContext) {
    for (const sprite of insertedSprites) {
      sprite.startTranslatedBy(0, -2);
      void fadeIn(sprite, { duration: 50 });
      void move(sprite, { easing: easeOutQuad, duration: 350 });
    }

    for (const sprite of removedSprites) {
      void fadeOut(sprite, { duration: 0 });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::Form": typeof NewFormComponent;
  }
}
