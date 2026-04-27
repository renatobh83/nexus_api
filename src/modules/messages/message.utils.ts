import { eventBus } from "../../utils/eventBus";
import { pupa } from "../../utils/pupa";

export const buildMessageBody = (template: string, ticket: any): string => {
  return pupa(template || "", {
    name: ticket?.contact?.name ?? "",
    email: ticket?.contact?.email ?? "",
    phoneNumber: ticket?.contact?.number ?? "",
    user: ticket?.user?.name ?? "",
    userEmail: ticket?.user?.email ?? "",
  });
};

// export function waitForMessageSaved(messageId: string, timeoutMs = 8000) {
//   return new Promise((resolve, reject) => {
//     const timer = setTimeout(() => {
//       eventBus.removeAllListeners(`messageSaved:${messageId}`);
//       reject(new Error(`Timeout: Mensagem ${messageId} não foi salva no DB`));
//     }, timeoutMs);

//     eventBus.once(`messageSaved:${messageId}`, (savedMessage) => {
//       clearTimeout(timer);
//       resolve(savedMessage);
//     });
//   });
// }
