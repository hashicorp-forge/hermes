import type {
  FlashFunction} from "ember-cli-flash/services/flash-messages";
import FlashMessageService, {
  MessageOptions,
} from "ember-cli-flash/services/flash-messages";

export default class HermesFlashMessagesService extends FlashMessageService {
  critical: FlashFunction;
  success: FlashFunction;
}
