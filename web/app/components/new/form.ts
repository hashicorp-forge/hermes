import Component from "@glimmer/component";
import Ember from "ember";
import { TransitionContext } from "ember-animated/.";
import move from "ember-animated/motions/move";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import { Resize } from "ember-animated/motions/resize";
import { easeOutExpo, easeOutQuad } from "hermes/utils/ember-animated/easings";

const FORM_RESIZE_DURATION = Ember.testing ? 0 : 1250;

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
