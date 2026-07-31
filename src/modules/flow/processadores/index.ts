type ProcessadorHandler = (context: any) => Promise<any>;
import { rotearAtendimento } from "./rotearAtendimento.js";
import { validarCadastro } from "./validarCadastro.js";

export const processadores: Record<string, ProcessadorHandler> = {
  validarCadastro,
  rotearAtendimento,
};
