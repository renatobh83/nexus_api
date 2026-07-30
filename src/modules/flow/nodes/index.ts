import { ConvertNode } from "./ConvertNode.js";
import { FilterNode } from "./FilterNode.js";
import { IncrementarTentativaNode } from "./IncrementarTentativaNode.js";
import { NotifyNode } from "./NotifyNode.js";
import { ProcessAiNode } from "./ProcessAiNode.js";
import { ProcessarDados } from "./ProcessarDados.js";
import { SendMessage } from "./SendMessage.js";
import { TextNode } from "./TextNode.js";
import { TriggerNode } from "./TriggerNode.js";
import { WaitResponseNode } from "./WaitResponseNode.js";
import { WaitUntil } from "./WaitUntil.js";

export const nodeRegistry = {
  trigger: TriggerNode,
  filter: FilterNode,
  notify: NotifyNode,
  sendMsg: SendMessage,
  processarIa: ProcessAiNode,
  waitResponse: WaitResponseNode,
  text: TextNode,
  transform: ConvertNode,
  processarDados: ProcessarDados,
  incrementarTentativa: IncrementarTentativaNode,
  waitUntil: WaitUntil,
};
