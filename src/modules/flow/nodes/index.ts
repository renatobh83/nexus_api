import { FilterNode } from "./FilterNode.js";
import { NotifyNode } from "./NotifyNode.js";
import { ProcessAiNode } from "./ProcessAiNode.js";
import { SendMessage } from "./SendMessage.js";
import { TriggerNode } from "./TriggerNode.js";

export const nodeRegistry = {
  trigger: TriggerNode,
  filter: FilterNode,
  notify: NotifyNode,
  sendMsg: SendMessage,
  processarIa: ProcessAiNode
};
