import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import PersonAvatar from "hermes/components/person/avatar";

interface MyHeaderComponentSignature {
  Args: {
    ownerFilterIsShown?: boolean;
  };

  Blocks: {
    controls: [];
  };
}

export default class MyHeaderComponent extends Component<MyHeaderComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  <template>
    <div class="mt-2 flex items-center justify-between">
      <div class="relative flex items-center gap-5">
        <PersonAvatar
          data-test-avatar
          @email={{this.authenticatedUser.info.email}}
          @size="xl"
          class="-ml-0.5"
        />
        <div>
          <h1 data-test-name class="text-display-300">
            {{this.authenticatedUser.info.name}}
          </h1>
          <p
            data-test-email
            class="mt-0.5 text-body-200 text-color-foreground-faint"
          >
            {{this.authenticatedUser.info.email}}
          </p>
        </div>
      </div>
      {{#if (has-block "controls")}}
        {{yield to="controls"}}
      {{/if}}
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Header": typeof MyHeaderComponent;
  }
}
