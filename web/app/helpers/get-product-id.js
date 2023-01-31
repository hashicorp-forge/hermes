import { helper } from "@ember/component/helper";
import getProductId from "hermes/utils/get-product-id";
export default helper(([productName]) => {
  return getProductId(productName);
});
