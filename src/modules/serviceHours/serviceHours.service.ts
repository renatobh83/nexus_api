import { prisma } from "../../lib/prisma.js";
import {
  ServiceHoursRepository,
  UpsertDayInput,
} from "./serviceHours.repository.js";
import { DateTime } from "luxon";

export class ServiceHoursService {
  constructor(private readonly repo = new ServiceHoursRepository()) {}

  // ── Hours ─────────────────────────────────────────────────────

  async getHours(queueId: string | null) {
    return this.repo.findByQueue(queueId);
  }

  async saveHours(
    queueId: string | null,
    timezone: string,
    days: Omit<UpsertDayInput, "queueId" | "timezone">[],
  ) {
    const payload: UpsertDayInput[] = days.map((d) => ({
      ...d,
      queueId,
      timezone,
    }));

    return this.repo.upsertDays(payload);
  }

  async resetQueueToGlobal(queueId: string) {
    // Remove os horários específicos da fila → vai cair no global
    await this.repo.deleteByQueue(queueId);
  }

  // ── Verifica se está dentro do horário (usado internamente) ───

  async isWithinServiceHours(queueId: string): Promise<{
    withinHours: boolean;
    reason:
      | "no_human"
      | "within_schedule"
      | "outside_schedule"
      | "no_schedule"
      | "holiday";
  }> {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      select: { hasHuman: true },
    });

    if (!queue?.hasHuman) return { withinHours: true, reason: "no_human" };

    const hours = await this.repo.findEffective(queueId);
    if (!hours.length) return { withinHours: false, reason: "no_schedule" };

    const timezone = hours[0].timezone ?? "America/Sao_Paulo";
    const now = DateTime.now().setZone(timezone);
    const todayStr = now.toISODate()!; // "2026-06-08"
    const dayOfWeek = now.weekday % 7; // Luxon: 1=Seg → 0=Dom

    // Verifica feriado (fila específica ou global)
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: todayStr,
        OR: [{ queueId }, { queueId: null }],
      },
    });
    if (holiday) return { withinHours: false, reason: "holiday" };

    const todaySchedule = hours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!todaySchedule?.enabled)
      return { withinHours: false, reason: "outside_schedule" };

    const current = now.toFormat("HH:mm");
    const within =
      current >= todaySchedule.startTime && current < todaySchedule.endTime;

    return {
      withinHours: within,
      reason: within ? "within_schedule" : "outside_schedule",
    };
  }

  // ── Holidays ──────────────────────────────────────────────────

  async getHolidays(queueId: string | null) {
    return this.repo.findHolidays(queueId);
  }

  async saveHolidays(
    queueId: string | null,
    holidays: { date: string; name: string }[],
  ) {
    return this.repo.replaceHolidays(
      queueId,
      holidays.map((h) => ({ ...h, queueId })),
    );
  }

  async addHoliday(queueId: string | null, date: string, name: string) {
    return this.repo.upsertHoliday({ date, name, queueId });
  }

  async removeHoliday(id: string) {
    return this.repo.deleteHoliday(id);
  }

  // ── Filas  ──────────────────────────────────────────────────
  async getFilas() {
    return this.repo.queuesList();
  }
}
