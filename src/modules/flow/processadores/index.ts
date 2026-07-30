type ProcessadorHandler = (context: any) => Promise<any>;
import { validarCadastro } from "./validarCadastro.js";

export const processadores: Record<string, ProcessadorHandler> = {
  validarCadastro,
};
