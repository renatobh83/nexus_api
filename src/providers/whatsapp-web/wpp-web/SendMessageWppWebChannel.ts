import { removeNinthDigit } from "../../../utils/removeNinthDigit.js";
import { getWbot } from "./Wpp-web.js";

type MediaFile = {
  filename: string;
  mimetype: string;
  buffer: Buffer;
};
export const SendMessageWppWebChannel = async (
  body: string,
  channelId: number,
  to: string,
  hasMedia: boolean | MediaFile,
) => {
  const wbot = getWbot(channelId);

  const number = to.includes("@")
    ? to
    : removeNinthDigit(to.replace("+55", ""));

  const checkNumber = await wbot.checkNumberStatus(number);

  if (!checkNumber.numberExists) {
    throw new Error(
      "Número inválido: O número digitado não é um número de WhatsApp válido.",
    );
  }
  if (typeof hasMedia !== "boolean") {
    let mimetype = hasMedia.mimetype;
    const fileData = `data:${mimetype};base64,${hasMedia.buffer.toString(
      "base64",
    )}`;
    if (
      [
        "image/gif",
        "image/png",
        "image/jpg",
        "image/jpeg",
        "image/webp",
      ].includes(mimetype)
    ) {
      await wbot.sendImageFromBase64(
        checkNumber.id._serialized,
        fileData,
        hasMedia.filename,
        body,
      );
    } else {
      // await wbot.sendFile(to, fileData, hasMedia.filename);
      await wbot.sendFile(to, fileData, {
        filename: hasMedia.filename,
        caption: body || hasMedia.filename,
      });
    }
  } else {
    await wbot.sendText(checkNumber.id._serialized, body);
  }
};
