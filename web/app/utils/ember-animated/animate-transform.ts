/**
 * A transition to control all transform properties at once.
 * Modified from Ember Animated's `move` motion.
 */

import { Motion, rAF, Sprite, Tween } from "ember-animated";
import { BaseOptions } from "ember-animated/-private/motion";
import { TweenLike } from "ember-animated/-private/tween";

interface AnimateTransformOptions extends BaseOptions {
  scale?: {
    from?: number;
    to?: number;
    duration?: number;
    origin?: string;
  };
  rotate?: {
    from?: number;
    to?: number;
    duration?: number;
  };
  translate?: {
    x?: {
      from?: number;
      to?: number;
    };
    y?: {
      from?: number;
      to?: number;
    };
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
    let { translate, rotate, scale, easing } = opts;

    let translateXTo = translate?.x?.to;
    let translateXFrom = translate?.x?.from;

    let translateYTo = translate?.y?.to;
    let translateYFrom = translate?.y?.from;

    let rotateTo = rotate?.to;
    let rotateFrom = rotate?.from;

    let scaleTo = scale?.to;
    let scaleFrom = scale?.from;

    let translateXTween: TweenLike | null = null;
    let translateYTween: TweenLike | null = null;
    let rotateTween: TweenLike | null = null;
    let scaleTween: TweenLike | null = null;

    if (translate) {
      if (!rotate && !scale) {
        console.warn(
          `You should use Ember Animated's \`move\` motion for simple translations`,
        );
      }
      translateXTween = new Tween(
        translateXFrom ?? 0,
        translateXTo ?? 0,
        translate.duration ?? duration,
        opts.easing,
      );
      translateYTween = new Tween(
        translateYFrom ?? 0,
        translateYTo ?? 0,
        translate.duration ?? duration,
        opts.easing,
      );
    }

    if (rotate) {
      rotateTween = new Tween(
        rotateFrom ?? 0,
        rotateTo ?? 0,
        rotate.duration ?? duration,
        easing,
      );
    }

    if (scale) {
      scaleTween = new Tween(
        scaleFrom ?? 1,
        scaleTo ?? 1,
        scale?.duration ?? duration,
        easing,
      );
    }

    const shouldApplyTranslate =
      (translateXTween != null && !translateXTween.done) ||
      (translateYTween != null && !translateYTween.done);

    const shouldApplyRotate = rotateTween != null && !rotateTween.done;
    const shouldApplyScale = scaleTween != null && !scaleTween.done;

    let tweenIsDone = () => {
      return (
        (!shouldApplyTranslate ||
          (translateXTween?.done && translateYTween?.done)) &&
        (!shouldApplyRotate || rotateTween?.done) &&
        (!shouldApplyScale || scaleTween?.done)
      );
    };

    while (!tweenIsDone()) {
      let transformString = "";

      if (shouldApplyTranslate) {
        transformString += `translate(${
          translateXTween?.currentValue ?? 0
        }px, ${translateYTween?.currentValue ?? 0}px) `;
      }

      if (shouldApplyRotate) {
        transformString += `rotate(${rotateTween?.currentValue ?? 0}deg) `;
      }

      if (shouldApplyScale) {
        transformString += `scale(${scaleTween?.currentValue ?? 1}) `;
      }

      sprite.applyStyles({
        transform: transformString,
        "transform-origin": scale?.origin ?? "center",
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
