import { Factory, ModelInstance, Server } from "miragejs";
import { HermesProject } from "hermes/types/project";
import { TEST_USER_EMAIL } from "hermes/utils/mirage-utils";

export default Factory.extend({
  id: (i: number) => i,
  title: (i: number) => `Test Project ${i}`,
  createdTime: 1,
  modifiedTime: 1,
  creator: TEST_USER_EMAIL,
  status: "active",

  // @ts-ignore - Bug https://github.com/miragejs/miragejs/issues/1052
  afterCreate(project: ModelInstance<HermesProject>, server: any): void {
    server.create("related-hermes-document");
    server.create("document");
    server.create("jira-issue");

    const relatedHermesDocuments = server.schema.relatedHermesDocument
      .all()
      .models.map((doc: ModelInstance) => doc.attrs);

    const jiraIssue = server.schema.jiraIssues.first()?.attrs;

    project.update({
      hermesDocuments: relatedHermesDocuments,
      jiraIssue,
    });
  },
});
