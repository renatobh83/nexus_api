export interface SessionInternal {
  id: number;
  getChatById: (chatId: string) => Promise<ChatInternal>;
  getContact: (contactId: string) => Promise<ContactInternal>;
  getPnLidEntry: (
    id: string,
  ) => Promise<{ phoneNumber: { _serialized: string } }>;
  downloadMedia: (messageId: string) => Promise<string>;
}
export interface ChatInternal {
  id: { _serialized: string; server: string; user: string };
  unreadCount: number;
  archive: boolean;
  archiveAtMentionViewedInDrawer: boolean;
  ephemeralDuration: number;
  hasChatBeenOpened: boolean;
  hasOpened: boolean;
  hasUnreadMention: boolean;
  isAnnounceGrpRestrict: boolean;
  isBroadcast: boolean;
  isGroup: boolean;
  isReadOnly: boolean;
  isUser: boolean;
  kind: string;
  msgs: null;
  muteExpiration: number;
  name: string;
  notSpam?: boolean;
  pendingMsgs: boolean;
  pin: number;
  restricted: boolean;
  t: number;
}

export interface ContactInternal {
  id: { _serialized: string };
  name: string;
  pushname?: string;
  formattedName?: string;
  shortName?: string;
}
