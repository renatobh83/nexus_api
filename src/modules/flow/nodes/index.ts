import { ConvertNode } from "./ConvertNode.js";
import { FilterNode } from "./FilterNode.js";
import { HttpNode } from "./http.js";
import { NotifyNode } from "./NotifyNode.js";
import { ProcessAiNode } from "./ProcessAiNode.js";
import { ProcessarDados } from "./ProcessarDados.js";
import { RouterNode } from "./routerNode.js";
import { SendMessage } from "./SendMessage.js";
import { SendMessageIA } from "./SendMessageIA.js";
import { TextNode } from "./TextNode.js";
import { TransferirNode } from "./transferir.js";
import { TriggerNode } from "./TriggerNode.js";
import { VoltarAnteriorNode } from "./VoltarAnteriorNode.js";
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
  waitUntil: WaitUntil,
  http: HttpNode,
  router: RouterNode,
  voltar_anterior: VoltarAnteriorNode,
  transferir_humano: TransferirNode,
};
