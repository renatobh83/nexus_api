export interface MessageId {
  fromMe: boolean;
  remote: string;
  id: string;
  participant?: string;
  _serialized: string;
}

export interface Reaction {
  id: MessageId;
  msgId: MessageId;
  reactionText: string;
  read: boolean;
  orphan: number;
  orphanReason: string | null;
  timestamp: number;
}
