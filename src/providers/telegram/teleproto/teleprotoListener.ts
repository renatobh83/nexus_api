import { EditedMessage } from "teleproto/events/EditedMessage.js";

import { NewMessage } from "teleproto/events/NewMessage.js";
import {
  toInternalMessageTbot,
  toInternalSession,
} from "./mappers/sessionAdapter.js";
import { EventBuilder } from "teleproto/events/common.js";
import { SessionTbot } from "./tbotProto.js";
import { ContactInternal } from "../../session.types.js";
import { Api } from "teleproto";
import { handleMessage } from "../../../modules/messages/handlers/handleMessage.js";

export const teleprotoListener = async (tbot: SessionTbot) => {
  // Mensagens e Mensagem de midia com caption
  tbot.addEventHandler(async (event) => {
    const messageIsGroup = event.message.isChannel || event.message.isGroup;
    // ||
    // @ts-ignore - _chat.bot existe em runtime
    // event.message._chat?.bot;
    if (messageIsGroup) return;

    await AuxiTbot(tbot, event.message);
  }, new NewMessage({}));

  // Media message
  tbot.addEventHandler(async (event) => {
    // console.log(event)
    // const messageIsGroup = event.message.isChannel || event.message.isGroup
    // console.log(messageIsGroup)
    // if (messageIsGroup) return
    // if (event.message && event.message.message) {
    //     if (event.message.media) {
    //         const message = await toInternalMessageTbot(event.message)
    //         const session = toInternalSession(tbot)
    //         const contato = await resolveContact(event.message, tbot)
    //         await handleMessage(message, session, contato);
    //     }
    // }
  }, new EventBuilder({}));
  tbot.addEventHandler(async (event) => {}, new EditedMessage({}));
};
// ───────────────────────────────────────────
// Helper: baixa a foto e retorna base64
// ───────────────────────────────────────────
async function downloadPhoto(
  session: SessionTbot,
  entity: any,
): Promise<string | null> {
  try {
    const buffer = await session.downloadProfilePhoto(entity, {
      isBig: false, // true para alta resolução
    });

    if (!buffer || buffer.length === 0) return null;

    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}
export const resolveContact = async (
  msg: Api.Message,
  session: SessionTbot,
): Promise<ContactInternal> => {
  if (msg.isChannel || msg.isGroup) {
    const sender = msg._chat!;
    return {
      id: { _serialized: sender.id.toString() },
      name: (sender as any).title || (sender as any).username,
      pushname: (sender as any).username,
      formattedName: (sender as any).username,
      shortName: (sender as any).title || (sender as any).username,
      photo: await downloadPhoto(session, sender),
    };
  } else if (msg.out) {
    const userId = "userId" in msg.peerId ? msg.peerId.userId?.toString() : "";
    const userEntity = await session.getEntity(userId);

    return {
      id: { _serialized: userEntity.id.toString() },
      name: (userEntity as any).firstName,
      pushname: (userEntity as any).lastName,
      formattedName: (userEntity as any).username,
      shortName: (userEntity as any).firstName,
      photo: await downloadPhoto(session, userEntity),
    };
  } else {
    const sender = await msg.getSender();

    return {
      id: { _serialized: (sender && sender.id.toString()) || "N/A" },
      name: (sender && (sender as any).firstName) || "N/A",
      pushname: (sender && (sender as any).lastName) || "N/A",
      formattedName: (sender && (sender as any).username) || "N/A",
      shortName: (sender && (sender as any).firstName) || "N/A",
      photo: sender ? await downloadPhoto(session, sender) : null,
    };
  }
};
export const AuxiTbot = async (tbot: SessionTbot, msg: Api.Message) => {
  const message = await toInternalMessageTbot(msg);
  const session = toInternalSession(tbot);
  const contato = await resolveContact(msg, tbot);
  await handleMessage(message, session, contato);
};
