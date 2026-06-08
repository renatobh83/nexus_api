// src/modules/serviceHours/serviceHours.controller.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { ServiceHoursService } from "./serviceHours.service.js";

const svc = new ServiceHoursService();

// ── Types ─────────────────────────────────────────────────────────

interface QueueIdQuery {
  queueId?: string;
}

interface SaveHoursBody {
  queueId?: string | null;
  timezone: string;
  days: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }[];
}

interface SaveHolidaysBody {
  queueId?: string | null;
  holidays: { date: string; name: string }[];
}

interface AddHolidayBody {
  queueId?: string | null;
  date: string;
  name: string;
}

interface HolidayParams {
  id: string;
}

// ── Handlers ──────────────────────────────────────────────────────

export async function getHoursHandler(
  req: FastifyRequest<{ Querystring: QueueIdQuery }>,
  reply: FastifyReply,
) {
  const queueId = req.query.queueId ?? null;
  const data = await svc.getHours(queueId);
  return reply.send(data);
}

export async function saveHoursHandler(
  req: FastifyRequest<{ Body: SaveHoursBody }>,
  reply: FastifyReply,
) {
  const { queueId = null, timezone, days } = req.body;
  const result = await svc.saveHours(queueId, timezone, days);
  return reply.send(result);
}

export async function resetToGlobalHandler(
  req: FastifyRequest<{ Params: { queueId: string } }>,
  reply: FastifyReply,
) {
  await svc.resetQueueToGlobal(req.params.queueId);
  return reply.send({ message: "Fila resetada para horário global." });
}

export async function getHolidaysHandler(
  req: FastifyRequest<{ Querystring: QueueIdQuery }>,
  reply: FastifyReply,
) {
  const queueId = req.query.queueId ?? null;
  const data = await svc.getHolidays(queueId);
  return reply.send(data);
}

export async function saveHolidaysHandler(
  req: FastifyRequest<{ Body: SaveHolidaysBody }>,
  reply: FastifyReply,
) {
  const { queueId = null, holidays } = req.body;
  await svc.saveHolidays(queueId, holidays);
  return reply.send({ message: "Feriados salvos." });
}

export async function addHolidayHandler(
  req: FastifyRequest<{ Body: AddHolidayBody }>,
  reply: FastifyReply,
) {
  const { queueId = null, date, name } = req.body;
  const result = await svc.addHoliday(queueId, date, name);
  return reply.status(201).send(result);
}

export async function deleteHolidayHandler(
  req: FastifyRequest<{ Params: HolidayParams }>,
  reply: FastifyReply,
) {
  await svc.removeHoliday(req.params.id);
  return reply.status(204).send();
}

export async function queuesList(
  req: FastifyRequest<{ Params: HolidayParams }>,
  reply: FastifyReply,
) {
  const filas = await svc.getFilas();
  return reply.status(200).send(filas);
}
