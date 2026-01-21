// TEMPORARY STUBS FOR EMBER-ANIMATED - REPLACE WITH MODERN ANIMATION SOLUTION
// These stubs allow the build to complete while we transition away from ember-animated

export interface TransitionContext {
  duration?: number;
  [key: string]: any;
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function timeout(ms: number): Promise<void> {
  return wait(ms);
}

// Motion stubs
export function move(sprite?: any, options?: any) {
  return Promise.resolve();
}

export function fadeIn(sprite?: any, options?: any) {
  return Promise.resolve();
}

export function fadeOut(sprite?: any, options?: any) {
  return Promise.resolve();
}

export class Resize {
  public opts: any = {};
  constructor(public context?: TransitionContext) {}
  
  *animate() {
    // Stub generator function
    yield Promise.resolve();
  }
}

export function emptyTransition(context?: TransitionContext) {
  return Promise.resolve();
}

export function animateTransform(context?: TransitionContext) {
  return Promise.resolve();
}

export function highlightElement(context?: TransitionContext) {
  return Promise.resolve();
}

// Transition Rules stub
export class TransitionRules {
  public oldItems: any;
  public newItems: any;
  
  constructor() {}
  
  default(context?: TransitionContext) {
    return emptyTransition(context);
  }
}

// Easings - simple linear fallbacks
export const easeOutExpo = (t: number) => t;
export const easeOutQuad = (t: number) => t;

// Mock classes for more complex types
export class Motion {
  constructor(public sprite?: any, public opts?: any) {}
}

export class Sprite {
  constructor(public element?: Element) {}
}

export class Tween {
  constructor(public startValue?: any, public endValue?: any, public duration?: number) {}
}

export interface BaseOptions {
  duration?: number;
  [key: string]: any;
}

export interface TweenLike {
  duration?: number;
  [key: string]: any;
}

export function rAF(callback: FrameRequestCallback): number {
  return requestAnimationFrame(callback);
}

export default {
  wait,
  timeout,
  move,
  fadeIn,
  fadeOut,
  Resize,
  emptyTransition,
  animateTransform,
  highlightElement,
  TransitionRules,
  easeOutExpo,
  easeOutQuad,
  Motion,
  Sprite,
  Tween,
  rAF,
};