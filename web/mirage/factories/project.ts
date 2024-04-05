import { Factory, ModelInstance } from "miragejs";
import { HermesProject } from "hermes/types/project";
import { TEST_USER_EMAIL } from "../utils";

export default Factory.extend({
  id: (i: number) => i,
  title: (i: number) => `Test Project ${i}`,
  createdTime: 1,
  modifiedTime: 1,
  creator: TEST_USER_EMAIL,
  status: "active",
  products: ["Vault"],

  // @ts-ignore - Bug https://github.com/miragejs/miragejs/issues/1052
  afterCreate(project: ModelInstance<HermesProject>, server: any): void {
    server.create("related-hermes-document");

    const hermesDocuments = server.schema.relatedHermesDocument
      .all()
      .models.map((doc: { attrs: any }) => doc.attrs);

    project.update({
      hermesDocuments,
    });

    if (!project.jiraIssueID) {
      // if jiraIssue is not defined, create a jira issue
      // and assign it to the project
      const jiraIssue = server.create("jira-issue").attrs;

      project.update({
        jiraIssueID: jiraIssue?.key,
      });
    }
  },
});
