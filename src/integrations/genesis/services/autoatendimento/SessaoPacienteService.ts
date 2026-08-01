import { redis } from "../../../../config/redis.js";


interface SessaoPacienteBase {
  cd_paciente: number;
  ds_paciente: string;
  ds_email: string;
  ds_token: string;
  cd_funcionario: number;
}

type SessaoPaciente = SessaoPacienteBase & Record<string, any>;

export class SessaoPacienteService {
  private static key(ticketId: string) {
    return `sessao:paciente:${ticketId}`;
  }

  /**
   * Cria a sessão do zero (usado na identificação/validação de cadastro).
   */
  static async criar(ticketId: string, dados: SessaoPaciente): Promise<void> {
    const ttl = this.calcularTtlDoToken(dados.ds_token);
    await redis.set(this.key(ticketId), JSON.stringify(dados), "EX", ttl);
  }

  /**
   * Faz merge de novos campos na sessão existente, sem perder o que já estava lá.
   * Usado por agendamento, laudos, etc., pra ir acumulando dados da etapa atual.
   */
  static async atualizar(
    ticketId: string,
    novosDados: Record<string, any>,
  ): Promise<SessaoPaciente | null> {
    const atual = await this.obter(ticketId);
    if (!atual) {
      console.warn(`[SessaoPacienteService] Tentou atualizar sessão inexistente: ${ticketId}`);
      return null;
    }

    const atualizada: SessaoPaciente = { ...atual, ...novosDados };

    // mantém o TTL restante (não reseta o tempo de expiração do token ao só adicionar dados)
    const ttlRestante = await redis.ttl(this.key(ticketId));
    const ttl = ttlRestante > 0 ? ttlRestante : this.calcularTtlDoToken(atualizada.ds_token);

    await redis.set(this.key(ticketId), JSON.stringify(atualizada), "EX", ttl);

    return atualizada;
  }

  static async obter(ticketId: string): Promise<SessaoPaciente | null> {
    const raw = await redis.get(this.key(ticketId));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  static async encerrar(ticketId: string): Promise<void> {
    await redis.del(this.key(ticketId));
  }

  private static calcularTtlDoToken(token: string): number {
    try {
      const payloadBase64 = token.split(".")[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
      const expSeconds = payload.exp;
      const agora = Math.floor(Date.now() / 1000);
      const restante = expSeconds - agora;
      return Math.max(restante - 30, 60);
    } catch {
      return 3600;
    }
  }
}