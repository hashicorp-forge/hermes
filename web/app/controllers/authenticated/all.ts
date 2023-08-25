import Controller from "@ember/controller";

<<<<<<<< HEAD:web/app/controllers/authenticated/all.ts
export default class AuthenticatedAllController extends Controller {
========
export default class AuthenticatedDocumentsController extends Controller {
>>>>>>>> jeffdaley/explore:web/app/controllers/authenticated/documents.ts
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];
}
