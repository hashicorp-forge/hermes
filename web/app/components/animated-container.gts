import Component from '@glimmer/component';
import { type TemplateOnlyComponent } from '@ember/component/template-only';

/**
 * TEMPORARY STUB for AnimatedContainer (ember-animated migration)
 * 
 * This is a passthrough component that renders children without animation.
 * Used during the Ember 6.x upgrade while transitioning away from ember-animated.
 * 
 * Original ember-animated behavior: Animates size/position changes of container
 * Stub behavior: Simply renders children without animation
 */

interface AnimatedContainerSignature {
  Element: HTMLDivElement;
  Args: {
    motion?: any;
  };
  Blocks: {
    default: [];
  };
}

const AnimatedContainer: TemplateOnlyComponent<AnimatedContainerSignature> = <template>
  <div ...attributes>
    {{yield}}
  </div>
</template>;

export default AnimatedContainer;

// Export for use in glint registry (already registered in types/glint/index.d.ts)
