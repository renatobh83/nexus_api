import { create, defaultOptions } from "wbotconnect";

/**
 * Inicia uma sessão do wbotconnect para uma determinada conexão de WhatsApp.
 * Esta função configura os callbacks da biblioteca e delega as atualizações de estado
 * para o WhatsappService, mantendo a lógica de negócio separada.
 *
 * @param whatsapp - O objeto da conexão de WhatsApp vindo do banco de dados.
 * @param whatsappService - A instância do serviço para persistir as mudanças.
 * @returns Uma Promise que resolve para a instância do cliente wbot.
 */
export const initWppWeb = async (
  whatsapp: any
): Promise<void> => {
  try {
    
    const options = {
      logQR: true,
      headless: true,
      phoneNumber: whatsapp.pairingCodeEnabled ? whatsapp.wppUser : null,
      puppeteerOptions: {
        userDataDir: "./userDataDir/" + whatsapp.name,
      },
    };
    const mergedOptions = { ...defaultOptions, ...options };
   
    const wbot = (await create(
        Object.assign({}, mergedOptions)
    ))
        
    } catch (error) {
        
    }
}