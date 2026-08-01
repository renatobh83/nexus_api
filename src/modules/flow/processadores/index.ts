type ProcessadorHandler = (context: any) => Promise<any>;
import { baixarEEnviarLaudo } from "./baixarEEnviarLaudo.js";
import {  laudos } from "./laudos.js";
import { rotearAtendimento } from "./rotearAtendimento.js";
import { validarCadastro } from "./validarCadastro.js";

export const processadores: Record<string, ProcessadorHandler> = {
  validarCadastro,
  rotearAtendimento,
  laudos,
  baixarEEnviarLaudo,
};
