import { MessageService } from "../../../modules/messages/messages.service.js";
import { Reaction } from "../../../types/reaction.types.js";

export async function HandleMsgReaction(msg: Reaction) {
  const messageService = new MessageService();
  const message = await messageService.findMessageForUpdate(
    msg.msgId._serialized,
  );
  if (!message) {
    return;
  }
  const updateData = msg.id.fromMe
    ? { reactionFromMe: msg.reactionText || null }
    : { reaction: msg.reactionText || null };

  await messageService.updateMessage(message.messageId, updateData);
}
