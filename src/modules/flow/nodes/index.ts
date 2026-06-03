import { FilterNode } from "./FilterNode.js";
import { NotifyNode } from "./NotifyNode.js";
import { TriggerNode } from "./TriggerNode.js";

export const nodeRegistry = {
  trigger: TriggerNode,
  filter: FilterNode,
  notify: NotifyNode,
};
