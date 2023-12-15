import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { restartableTask, timeout } from "ember-concurrency";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import htmlElement from "hermes/utils/html-element";

interface ChatComponentSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

interface ChatMessage {
  value: string;
}

export default class ChatComponent extends Component<ChatComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked protected query = "";

  @tracked protected answerIsLoading = false;

  @tracked messages: any[] = [
    {
      value:
        "Hello, I'm Hermes! I know everything about HashiCorp, including its most private customer data.",
      authorIsMe: false,
    },
    {
      value: "What would you like to know?",
      authorIsMe: false,
    },
  ];

  @action onInput(e: Event) {
    console.log("onInput");
    const input = e.target as HTMLInputElement;
    this.query = input.value;
  }

  @action onKeydown(e: KeyboardEvent) {
    console.log("onKeydown");
    if (e.key === "Enter") {
      e.preventDefault();
      void this.submit.perform();
    }
  }

  protected submit = restartableTask(async () => {
    try {
      this.messages.push({
        value: this.query,
        authorIsMe: true,
      });

      this.messages = this.messages;

      const query = this.query;
      this.query = "";

      const answer = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/chat?query=${query}`,
          {
            method: "POST",
          },
        )
        .then((response) => response?.json());

      // await timeout(600);

      this.answerIsLoading = true;

      // await timeout(4000);

      this.answerIsLoading = false;

      // this.messages.push({
      //   value: "chicken stock",
      // });

      this.messages.push(answer);
      this.messages = this.messages;
    } finally {
      // scroll to the bottom
      const lastMessage = htmlElement("li:last-child");

      if (lastMessage) {
        console.log("scrolling to last message");
        lastMessage.scrollIntoView();
      }
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Chat: typeof ChatComponent;
  }
}
