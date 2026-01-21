import Component from '@glimmer/component';

/**
 * TEMPORARY STUB for animated-each component (ember-animated migration)
 * 
 * This is a passthrough component that iterates over items without animation.
 * Used during the Ember 6.x upgrade while transitioning away from ember-animated.
 * 
 * Original ember-animated behavior: Animates items in/out/reordering with transitions
 * Stub behavior: Simple {{#each}} iteration without animation
 * 
 * Usage in templates:
 *   {{#animated-each items rules=this.rules as |item index|}}
 *     Content for each item
 *   {{/animated-each}}
 */

interface AnimatedEachSignature {
  Element: null;
  Args: {
    // Positional param (the items array)
    items?: any[];
    // Named params
    key?: string;
    rules?: any;
    use?: (...args: any[]) => any;
    initialInsertion?: boolean;
    finalRemoval?: boolean;
    duration?: number;
  };
  Blocks: {
    default: [item: any, index: number];
  };
}

export default class AnimatedEachCurly extends Component<AnimatedEachSignature> {
  // Map positional params to named params for curly-style invocation
  static positionalParams = ['items'];
  
  /**
   * Get the items array to iterate over
   */
  get itemsArray(): any[] {
    return this.args.items || [];
  }
  
  /**
   * Get the key to use for tracking items
   * Defaults to '@identity' if not provided
   */
  get keyName(): string {
    return this.args.key || '@identity';
  }
}

// Export the class so it can be used in glint registry
export { AnimatedEachCurly };
