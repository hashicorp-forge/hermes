// Modified from
// https://github.com/ember-animation/ember-animated/issues/38

import { Motion, rAF, Sprite, Tween } from 'ember-animated';
import { BaseOptions } from 'ember-animated/-private/motion';
import { TweenLike } from 'ember-animated/-private/tween';

interface AnimateScaleOptions extends BaseOptions {
  from?: number;
  to?: number;
  easing?: (time: number) => number;
}

export class AnimatedScale extends Motion<AnimateScaleOptions> {
  prior: Motion<AnimateScaleOptions> | null | undefined = null;
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
        transform: `scale(${this.tween.currentValue})`,
      });
      yield rAF();
    }
  }
}

export default function animateScale(
  sprite: Sprite,
  opts?: Partial<AnimateScaleOptions>
): Promise<unknown> {
  return new AnimatedScale(sprite, opts).run();
}
