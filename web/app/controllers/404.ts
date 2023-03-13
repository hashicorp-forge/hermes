import Controller from "@ember/controller";
import parseDate from "hermes/utils/parse-date";

export default class Error404Controller extends Controller {
  get currentDate() {
    return parseDate(new Date(), "long");
  }
}
