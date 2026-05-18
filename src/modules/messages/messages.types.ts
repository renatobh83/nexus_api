import { Wid } from "wbotconnect";

export type MessageType =
  | "notification"
  | "notification_template"
  | "group_notification"
  | "gp2"
  | "broadcast_notification"
  | "e2e_notification"
  | "call_log"
  | "protocol"
  | "chat"
  | "location"
  | "payment"
  | "vcard"
  | "ciphertext"
  | "multi_vcard"
  | "revoked"
  | "oversized"
  | "groups_v4_invite"
  | "hsm"
  | "template_button_reply"
  | "image"
  | "video"
  | "audio"
  | "ptt"
  | "sticker"
  | "document"
  | "product"
  | "order"
  | "list"
  | "list_response"
  | "buttons_response"
  | "poll_creation"
  | "unknown";

export interface MessageInternal {
  messageId: string;
  ack: number;
  body: string | null;
  content: string;
  fromMe: boolean;
  isGroupMsg: boolean;
  type: MessageType;
  hasReaction: boolean;
  isForwarded: boolean;
  isNotification: boolean;
  to: string;
  caption?: string | null;
  chatId: string;
  from: string | null | undefined;
  mediaUrl?: string | null | any;
  mediaType?: string | null | any;
  timestamp: bigint | number;
  contactName: string;
  ticketId: number | undefined;
  reaction?: string | null | undefined;
  mimetype: string | null | any;
  sender: string | null;
  reactionFromMe?: string | null | undefined;
  sendType?:
    | "campaign"
    | "external"
    | "chat"
    | "schedule"
    | "bot"
    | "sync"
    | undefined;
}
