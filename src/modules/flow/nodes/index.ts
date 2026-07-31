import { ConvertNode } from "./ConvertNode.js";
import { FilterNode } from "./FilterNode.js";
import { HttpNode } from "./http.js";
import { IncrementarTentativaNode } from "./IncrementarTentativaNode.js";
import { NotifyNode } from "./NotifyNode.js";
import { ProcessAiNode } from "./ProcessAiNode.js";
import { ProcessarDados } from "./ProcessarDados.js";
import { SendMessage } from "./SendMessage.js";
import { SendMessageIA } from "./SendMessageIA.js";
import { TextNode } from "./TextNode.js";
import { TriggerNode } from "./TriggerNode.js";
import { WaitResponseNode } from "./WaitResponseNode.js";
import { WaitUntil } from "./WaitUntil.js";

export const nodeRegistry = {
  trigger: TriggerNode,
  filter: FilterNode,
  notify: NotifyNode,
  text: TextNode,
  sendMsg: SendMessage,
  sendMessage: SendMessageIA,
  processarIa: ProcessAiNode,
  waitResponse: WaitResponseNode,
  transform: ConvertNode,
  processarDados: ProcessarDados,
  incrementarTentativa: IncrementarTentativaNode,
  waitUntil: WaitUntil,
  http: HttpNode,
};
