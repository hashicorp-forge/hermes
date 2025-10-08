import Component from '@glimmer/component';

/**
 * TEMPORARY STUB for animated-if component (ember-animated migration)
 * 
 * This is a passthrough component that conditionally renders content without animation.
 * Used during the Ember 6.x upgrade while transitioning away from ember-animated.
 * 
 * Original ember-animated behavior: Animates content in/out based on condition
 * Stub behavior: Simple conditional rendering (acts like {{#if}})
 * 
 * Usage in templates:
 *   {{#animated-if condition use=transition}}
 *     Content when true
 *   {{else}}
 *     Content when false
 *   {{/animated-if}}
 */

interface AnimatedIfSignature {
  Element: null;
  Args: {
    // Named params that match ember-animated API
    predicate?: boolean;  // Can be passed as @predicate
    use?: (...args: any[]) => any;
    rules?: any;
    duration?: number;
  };
  Blocks: {
    default: [];
    else: [];
  };
}

export default class AnimatedIfCurly extends Component<AnimatedIfSignature> {
  // Map positional params to named params for curly-style invocation
  static positionalParams = ['predicate'];
  
  /**
   * Render the default block if predicate is truthy,
   * otherwise render the else block
   */
  get shouldRenderDefault(): boolean {
    return Boolean(this.args.predicate);
  }
}

// Export the class so it can be used in glint registry
export { AnimatedIfCurly };
