type ProcessadorHandler = (context: any) => Promise<any>;
import { baixarEEnviarLaudo } from "./apiAutoatendimento/baixarEEnviarLaudo.js";
import { consultarAgendamentos } from "./apiAutoatendimento/consultarAgendamentos.js";
import { laudos } from "./apiAutoatendimento/laudos.js";
import { preparoExame } from "./apiAutoatendimento/preparoExame.js";
import { processarAcaoAgendamento } from "./apiAutoatendimento/processarAcaoAgendamento.js";
import { validarCadastro } from "./apiAutoatendimento/validarCadastro.js";
import { rotearAtendimento } from "./rotearAtendimento.js";


export const processadores: Record<string, ProcessadorHandler> = {
  validarCadastro,
  rotearAtendimento,
  laudos,
  baixarEEnviarLaudo,
  consultarAgendamentos,
  processarAcaoAgendamento,
  preparoExame
};
