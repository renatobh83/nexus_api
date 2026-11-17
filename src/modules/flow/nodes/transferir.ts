import { sendOutOfHoursMessage } from "../../messages/handlers/HandleSendOutOfHoursMessage.js";
import { ServiceHoursService } from "../../serviceHours/serviceHours.service.js";
import { updateTicket } from "../../tickets/Helpers/CreateTicket.js";

export const TransferirNode = {
  async execute(node: any, context: Record<string, any>) {
    // context.ticket contém o ticket atual
    // context.executionId contém o id da execução

    // Aqui você chama o seu serviço para desativar o bot e jogar na fila
    console.log(`[FLOW] Transferindo ticket ${context.ticket.id} para humano`);
    const svc = new ServiceHoursService();
    const status = await svc.isWithinServiceHours("1");
    if (!status.withinHours) {
      if (status.reason === "outside_schedule") {
        await sendOutOfHoursMessage(
          "🤖 Agradeço sua mensagem.\n" +
            "Para suporte acesse nosso chat em www.exp.com.br/contato.\n" +
            "Nosso horário é 08h às 18h (seg. a sex).\n" +
            "Obrigado pela compreensão!",
          context.ticket,
        );
        await updateTicket(context.ticket.id, {
          status: "closed",
        });
        console.log("fora do horário — avisa o contato e não atribui agente");
        return;
      }
      if (status.reason === "holiday") {
        await sendOutOfHoursMessage(
          "🤖 Olá! Hoje é feriado e nossa equipe está descansando. 🎉\n" +
            "Estaremos de volta no próximo dia útil, a partir das 08h.\n" +
            "Obrigado pela compreensão!",
          context.ticket,
        );
        await updateTicket(context.ticket.id, {
          status: "closed",
        });
        console.log("fora do horário — avisa o contato e não atribui agente");
        return;
      }
    }
    // Exemplo de chamada (ajuste para a sua função real do sistema)
    await updateTicket(context.ticket.id, {
      isFlow: false,
      isBot: false,
      // queueId: "id_da_fila_de_atendimento" // se precisar jogar em fila específica
    });

    // Importante: Retornar null para o executor parar o fluxo imediatamente
    return null;
  },
};
