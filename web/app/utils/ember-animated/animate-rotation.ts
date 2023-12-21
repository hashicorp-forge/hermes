// Modified from
// https://github.com/ember-animation/ember-animated/issues/38#issuecomment-392276685

import { Motion, rAF, Sprite, Tween } from "ember-animated";
import { BaseOptions } from "ember-animated/-private/motion";
import { TweenLike } from "ember-animated/-private/tween";

interface AnimateRotationOptions extends BaseOptions {
  from?: number;
  to?: number;
  easing?: (time: number) => number;
}

export class AnimatedRotation extends Motion<AnimateRotationOptions> {
  prior: Motion<AnimateRotationOptions> | null | undefined = null;
  tween: TweenLike | null = null;

  interrupted(motions: Motion[]): void {
    this.prior = motions.find((m: Motion) => m instanceof this.constructor);
  }

  *animate(): Generator<Promise<unknown>, void> {
    let { sprite, duration, opts } = this;
    let to =
      opts.to != null
        ? opts.to
        : sprite.finalComputedStyle != null
        ? parseFloat(sprite.finalComputedStyle.opacity)
        : 1;
    let from;

    from =
      opts.from != null
        ? opts.from
        : sprite.initialComputedStyle != null
        ? parseFloat(sprite.initialComputedStyle.opacity)
        : 0;

    this.tween = new Tween(from, to, duration);

    while (!this.tween.done) {
      sprite.applyStyles({
        transform: `rotate(${this.tween.currentValue}deg)`,
      });
      yield rAF();
    }
  }
}

export default function animateRotation(
  sprite: Sprite,
  opts?: Partial<AnimateRotationOptions>,
): Promise<unknown> {
  return new AnimatedRotation(sprite, opts).run();
}
