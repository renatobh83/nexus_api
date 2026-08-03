import { buscarCadastro } from "../../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";
import { generateRegistrationLink } from "../../../../integrations/genesis/Helpers/generateRegistrationLink.js";



function getError(response: any): string | null {
  if (!response) return null;

  // Caso seja array
  if (Array.isArray(response) && response.length > 0 && response[0].Erro) {
    return response[0].Erro;
  }

  // Caso seja objeto
  if (response.Erro) return response.Erro;
  if (response.error) return response.error;

  return null; // sem erro
}

export async function validarCadastro(context: any) {
  const dados = context.dados_identificacao ?? {};

  
  const cpf = normalizarCpf(dados.cpf ?? "");
  
  const senha =  normalizarSenha(dados.senha ?? "")
  try {
    
    const resultado = await buscarCadastro({senha: senha, cpf:cpf})
  
  
  const paciente = Array.isArray(resultado) ? resultado[0] : resultado;
  

  const encontrado = true;

   await SessaoPacienteService.criar(context.ticket.id, {
      cd_paciente: paciente.cd_paciente,
      ds_paciente: paciente.ds_paciente,
      ds_email: paciente.ds_email,
      ds_token: paciente.ds_token,
      cd_funcionario: paciente.cd_funcionario,
    });
    
    
  return {
    ...context,
    clienteEncontrado: encontrado,
    nome_completo: paciente.ds_paciente,
    mensagem: encontrado ? "__INICIO_ATENDIMENTO__" : "",
    route: "output_1" 
  };
  } catch (error: any) {
    if (error.message.includes('Senha inválida') || error.message.includes('Credenciais inválidas')) {

    return { ...context, clienteEncontrado: false,output: {
        type: "mensagem",
        data: "❌ Senha inválida.\n\nVocê pode digitar a senha novamente ou, se não lembra, digite *recuperar* para receber uma nova senha."
      }, route: "output_2" 
    };  
  } else {
    const link = await generateRegistrationLink(cpf)
    
   return { ...context, clienteEncontrado: false,output: {
        type: "mensagem",
        data: `Não localizamos seu cadastro em nossa base. 📋\n\nEnviamos abaixo o link para você se cadastrar e continuar o atendimento.\n${link}`
      }, route: "output_2"
     };
  }
  }
  
  
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
