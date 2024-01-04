/**
 * A transition to control all transform properties at once.
 * This is a work in progress and limited in functionality.
 * Modified from the `move` and `opacity` motions
 */

import { assert } from "@ember/debug";
import { Motion, rAF, Sprite, Tween } from "ember-animated";
import { BaseOptions } from "ember-animated/-private/motion";
import { TweenLike } from "ember-animated/-private/tween";

interface AnimateTransformOptions extends BaseOptions {
  scale?: {
    from?: number;
    to?: number;
    duration?: number;
  };
  rotate?: {
    from?: number;
    to?: number;
    duration?: number;
  };
  x?: {
    from?: number;
    to?: number;
    duration?: number;
  };
  y?: {
    from?: number;
    to?: number;
    duration?: number;
  };
  easing?: (time: number) => number;
}

export class AnimatedTransform extends Motion<AnimateTransformOptions> {
  prior: Motion<AnimateTransformOptions> | null | undefined = null;
  tween: TweenLike | null = null;

  interrupted(motions: Motion[]): void {
    this.prior = motions.find((m: Motion) => m instanceof this.constructor);
  }

  *animate(): Generator<Promise<unknown>, void> {
    let { sprite, duration, opts } = this;

    let xTo = opts.x?.to;
    let xFrom = opts.x?.from;

    let yTo = opts.y?.to;
    let yFrom = opts.y?.from;

    let rotateTo = opts.rotate?.to;
    let rotateFrom = opts.rotate?.from;

    let scaleTo = opts.scale?.to;
    let scaleFrom = opts.scale?.from;

    let xTween: TweenLike | null = null;
    let yTween: TweenLike | null = null;
    let rotateTween: TweenLike | null = null;
    let scaleTween: TweenLike | null = null;

    if (opts.x) {
      xTween = new Tween(
        xFrom ?? 0,
        xTo ?? 0,
        opts.x.duration ?? duration,
        opts.easing,
      );
    }

    if (opts.y) {
      yTween = new Tween(
        yFrom ?? 0,
        yTo ?? 0,
        opts.y.duration ?? duration,
        opts.easing,
      );
    }

    if (opts.rotate) {
      rotateTween = new Tween(
        rotateFrom ??
          (sprite.initialComputedStyle != null
            ? parseFloat(sprite.initialComputedStyle.opacity)
            : 0),
        rotateTo ??
          (sprite.finalComputedStyle != null
            ? parseFloat(sprite.finalComputedStyle.opacity)
            : 1),
        opts.rotate.duration ?? duration,
        opts.easing,
      );
    }

    if (opts.scale) {
      scaleTween = new Tween(
        scaleFrom ?? 1,
        scaleTo ?? 1,
        opts.scale?.duration ?? duration,
        opts.easing,
      );
    }

    let tweenIsDone = () => {
      return (
        (xTween == null || xTween.done) &&
        (yTween == null || yTween.done) &&
        (rotateTween == null || rotateTween.done) &&
        (scaleTween == null || scaleTween.done)
      );
    };

    while (!tweenIsDone()) {
      const shouldApplyX = xTween != null && !xTween.done;
      const shouldApplyY = yTween != null && !yTween.done;
      const shouldApplyRotate = rotateTween != null && !rotateTween.done;
      const shouldApplyScale = scaleTween != null && !scaleTween.done;

      let transformString = "";

      if (shouldApplyX) {
        assert("xTween must exist", xTween);
        transformString += `translateX(${xTween.currentValue}px) `;
      }

      if (shouldApplyY) {
        assert("yTween must exist", yTween);
        transformString += `translateY(${yTween.currentValue}px) `;
      }

      if (shouldApplyRotate) {
        assert("rotateTween must exist", rotateTween);
        transformString += `rotate(${rotateTween.currentValue}deg) `;
      }

      if (shouldApplyScale) {
        assert("scaleTween must exist", scaleTween);
        transformString += `scale(${scaleTween.currentValue}) `;
      }

      sprite.applyStyles({
        transform: transformString,
      });

      yield rAF();
    }
  }
}

export default function animateTransform(
  sprite: Sprite,
  opts?: Partial<AnimateTransformOptions>,
): Promise<unknown> {
  return new AnimatedTransform(sprite, opts).run();
}
