import { FilterNode } from "./FilterNode.js";
import { NotifyNode } from "./NotifyNode.js";
import { ProcessAiNode } from "./ProcessAiNode.js";
import { SendMessage } from "./SendMessage.js";
import { TextNode } from "./TextNode.js";
import { TriggerNode } from "./TriggerNode.js";
import { WaitResponseNode } from "./WaitResponseNode.js";

export const nodeRegistry = {
  trigger: TriggerNode,
  filter: FilterNode,
  notify: NotifyNode,
  sendMsg: SendMessage,
  processarIa: ProcessAiNode,
  waitResponse: WaitResponseNode,
  text: TextNode
};
