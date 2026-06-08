import { prisma } from "../../lib/prisma.js";

export interface UpsertDayInput {
  queueId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
  timezone: string;
}

export interface UpsertHolidayInput {
  id?: string;
  date: string;
  name: string;
  queueId: string | null;
}

export class ServiceHoursRepository {
  // ── Service Hours ─────────────────────────────────────────────

  async findByQueue(queueId: string | null) {
    return prisma.serviceHours.findMany({
      where: { queueId },
      orderBy: { dayOfWeek: "asc" },
    });
  }

  async findEffective(queueId: string) {
    // Retorna horários da fila; se não tiver, cai no global (queueId null)
    const specific = await prisma.serviceHours.findMany({
      where: { queueId },
    });
    if (specific.length > 0) return specific;

    return prisma.serviceHours.findMany({
      where: { queueId: null },
      orderBy: { dayOfWeek: "asc" },
    });
  }
  async upsertDays(days: UpsertDayInput[]) {
    const withQueue = days.filter((d) => d.queueId);
    const globalDays = days.filter((d) => !d.queueId);

    // Fila específica: upsert um por um sem transaction
    for (const day of withQueue) {
      await prisma.serviceHours.upsert({
        where: {
          dayOfWeek_queueId: {
            queueId: day.queueId!,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          startTime: day.startTime,
          endTime: day.endTime,
          enabled: day.enabled,
          timezone: day.timezone,
        },
        create: {
          queueId: day.queueId,
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          enabled: day.enabled,
          timezone: day.timezone,
        },
      });
    }

    // Global: apaga e recria sequencialmente
    if (globalDays.length) {
      await prisma.serviceHours.deleteMany({ where: { queueId: null } });

      for (const day of globalDays) {
        await prisma.serviceHours.create({
          data: {
            queueId: null,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            enabled: day.enabled,
            timezone: day.timezone,
          },
        });
      }
    }
  }

  async deleteByQueue(queueId: string | null) {
    return prisma.serviceHours.deleteMany({ where: { queueId } });
  }

  // ── Holidays ──────────────────────────────────────────────────

  async findHolidays(queueId: string | null) {
    return prisma.holiday.findMany({
      where: { queueId },
      orderBy: { date: "asc" },
    });
  }

  async upsertHoliday(data: UpsertHolidayInput) {
    const existing = await prisma.holiday.findFirst({
      where: { date: data.date, queueId: data.queueId },
    });

    if (existing) {
      return prisma.holiday.update({
        where: { id: existing.id },
        data: { name: data.name },
      });
    }

    return prisma.holiday.create({
      data: {
        date: data.date,
        name: data.name,
        queueId: data.queueId,
      },
    });
  }

  async deleteHoliday(id: string) {
    return prisma.holiday.delete({ where: { id } });
  }

  async replaceHolidays(
    queueId: string | null,
    holidays: UpsertHolidayInput[],
  ) {
    await prisma.holiday.deleteMany({ where: { queueId } });

    if (holidays.length === 0) return [];

    return prisma.holiday.createMany({
      data: holidays.map((h) => ({
        date: h.date,
        name: h.name,
        queueId,
      })),
    });
  }
  // ── Queues list ──────────────────────────────────────────────────
  async queuesList() {
    return prisma.queue.findMany();
  }
}
