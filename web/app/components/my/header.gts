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

  private get userImgURL() {
    return this.authenticatedUser.info.picture;
  }

  private get userName() {
    return this.authenticatedUser.info.name;
  }

  private get userEmail() {
    return this.authenticatedUser.info.email;
  }

  <template>
    <div class="mt-2 flex items-center justify-between">
      <div class="relative flex items-center gap-5">
        <PersonAvatar
          @imgURL={{this.userImgURL}}
          @email={{this.userName}}
          @size="xl"
          class="-ml-0.5"
        />
        <div>
          <h1 class="text-display-300">
            {{this.userName}}
          </h1>
          <p class="mt-0.5 text-body-200 text-color-foreground-faint">
            {{this.userEmail}}
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
