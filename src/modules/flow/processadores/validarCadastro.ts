import { buscarCadastro } from "../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";

export async function validarCadastro(context: any) {
  const dados = context.dados_identificacao ?? {};
  const cpf = normalizarCpf(dados.cpf ?? "");
  
  const senha =  normalizarSenha(dados.senha ?? "")
  
  const resultado = await buscarCadastro({senha: senha, cpf:cpf})

  const paciente = Array.isArray(resultado) ? resultado[0] : resultado;
  
  if (!paciente?.cd_paciente) {
    return { ...context, clienteEncontrado: false, route: "output_2" };
  }
  const encontrado = true;

   await SessaoPacienteService.criar(context.ticket.id, {
      cd_paciente: paciente.cd_paciente,
      ds_paciente: paciente.ds_paciente,
      ds_email: paciente.ds_email,
      ds_token: paciente.ds_token,
      cd_funcionario: paciente.cd_funcionario,
    });
    
    console.log(paciente)
  return {
    ...context,
    clienteEncontrado: encontrado,
    nome_completo: paciente.ds_paciente,
    mensagem: encontrado ? "__INICIO_ATENDIMENTO__" : "",
    route: "output_1" 
  };
}

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function normalizarSenha(senha: string): string {
  return senha
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
