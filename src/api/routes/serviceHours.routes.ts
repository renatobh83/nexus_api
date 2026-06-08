// src/modules/serviceHours/serviceHours.routes.ts
import { FastifyInstance } from "fastify";
import {
  getHoursHandler,
  saveHoursHandler,
  resetToGlobalHandler,
  getHolidaysHandler,
  saveHolidaysHandler,
  addHolidayHandler,
  deleteHolidayHandler,
  queuesList,
} from "../../modules/serviceHours/serviceHours.controller.js";

export async function serviceHoursRoutes(app: FastifyInstance) {
  // Horários
  app.get("/", getHoursHandler);
  app.post("/", saveHoursHandler);
  app.delete("/queues/:queueId/reset", resetToGlobalHandler);
  app.get("/queues", queuesList);

  // Feriados
  app.get("/holidays", getHolidaysHandler);
  app.post("/holidays", saveHolidaysHandler); // replace all
  app.post("/holidays/add", addHolidayHandler); // add one
  app.delete("/holidays/:id", deleteHolidayHandler);
}
