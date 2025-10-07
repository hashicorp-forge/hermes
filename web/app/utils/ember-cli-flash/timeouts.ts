import { isTesting } from "@embroider/macros";

export const FLASH_MESSAGES_LONG_TIMEOUT = isTesting() ? 0 : 10000;
