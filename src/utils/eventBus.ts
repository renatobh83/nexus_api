
import { EventEmitter } from "events";

const eventBus = new EventEmitter();

// aumenta limite para evitar warnings caso tenha muitas instâncias
eventBus.setMaxListeners(500);

export { eventBus };
