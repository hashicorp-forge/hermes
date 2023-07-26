import Route from "@ember/routing/route";

export default class SupportRoute extends Route {
  model() {
    return {
      sections: [
        {
          title: "Known limitations",
          titleIcon: "alert-diamond",
          items: [
            {
              title: "Doc suggestions must be accepted off-site",
              content:
                "Unfortunately, Google disables this function for embedded documents like you see in Hermes. To accept suggestions, you'll need to open your document directly in Google. Look for the {{icon='external-link'}} button in the Hermes document sidebar.",
            },
            {
              title: "Suggestions in the header will lock your document.",
              content:
                "If this happens, remove the suggestions from your document header, wait a few minutes (for Hermes to notice the change), then refresh. If your document is still locked after 10 minutes, please get in touch.",
            },
            {
              title: 'You must manually enable "all notifications."',
              content:
                "By default, you'll get emailed about @-mentions and threads involving you. To receive all comments, you'll need to open your doc outside of Hermes ({{icon='external-link'}}), then [follow these instructions](https://support.google.com/docs/answer/91588).",
            },
          ],
        },
        {
          title: "Frequency asked questions",
          titleIcon: "discussion-square",
          items: [
            {
              title: "How do I stop getting 400 errors from Google?",
              content:
                "This is usually caused by content blockers or browser security settings. Safe-listing the Hermes domain will typically resolve the issue.",
            },
            {
              title: "Why did Hermes assign the wrong document number?",
              content:
                "Generally this happens when a document created outside of Hermes is moved into the Hermes folder. We don't have an automated fix for this yet.",
            },
            {
              title: "How do I add teams as contributors/approvers?",
              content:
                "We don't yet support team and group email addresses, so you'll need to invite them off-site. If you want to share a draft, be sure to make it \"Shareable\" first.",
            },
            {
              title: "How do I delete a document?",
              content:
                "Published docs can't be deleted, only archived. Drafts, on the other hand, can be deleted using the {{icon='trash'}} button the document sidebar.",
            },
            {
              title: "Can I transfer or share document ownership?",
              content: "Our current implementation doesn't yet support this.",
            },
            {
              title: "Why aren't drafts showing up in the shared Drive folder?",
              content:
                "Drafts are kept out of the shared folder until they're published. If you need to find the file on Drive, you'll have to search it by name.",
            },
          ],
        },
        {
          title: "Additional help",
          titleIcon: "support",
          items: [
            {
              title: "Still have a question, bug, or request?",
              content:
                "HashiCorp employees are encouraged to contact us on Slack. Open-source users should reach out on GitHub Issues.",
              links: [
                {
                  title: "proj-hermes-feedback",
                  icon: "slack",
                  url: "",
                },
                {
                  title: "labs@hashicorp.com",
                  icon: "mail",
                  url: "mailto:labs@hashicorp.com",
                },
                {
                  title: "GitHub Issues",
                  icon: "github",
                  url: "",
                },
              ],
            },
          ],
        },
      ],
    };
  }
}
