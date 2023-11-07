import { Factory, ModelInstance, Server } from "miragejs";
import { HermesProject } from "hermes/types/project";

export default Factory.extend({
  id: (i: number) => i,
  title: (i: number) => `Test Project ${i}`,
  createdDate: 1,
  modifiedDate: 1,
  creator: "testuser@example.com",
  status: "active",

  // @ts-ignore - Bug https://github.com/miragejs/miragejs/issues/1052
  // afterCreate(project: ModelInstance<HermesProject>, server: any): void {
  //   server.createList("related-hermes-document", 1);
  //   server.create("jira-object");

  //   const relatedHermesDocuments = server.schema.relatedHermesDocument
  //     .all()
  //     .models.map((doc: ModelInstance) => doc.attrs);

  //   const jiraObject = server.schema.jiraObjects.first()?.attrs;

  //   project.update({
  //     hermesDocuments: relatedHermesDocuments,
  //     jiraObject,
  //   });
  // },
});
