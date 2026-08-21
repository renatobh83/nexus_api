import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FlowsService } from "./flow.service.js";
import {
  parseAiPromptCreateData,
  parseAiPromptId,
  parseAiPromptUpdateData,
  parseFlowId,
  parseFlowWriteData,
} from "./flow.security.js";

const flowsService = new FlowsService();

type Params = Record<string, unknown>;

export async function flowController(fastify: FastifyInstance) {
  // GET — listar todos os flows ativos
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    const flows = await flowsService.listAll();
    reply.status(200).send(flows);
  });

  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as Params;
    const flow = await flowsService.findById(parseFlowId(id));
    reply.status(200).send(flow);
  });

  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const saved = await flowsService.createOrUpdate(
      parseFlowWriteData(request.body),
    );
    reply.status(200).send(saved);
  });

  fastify.delete(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Params;
      await flowsService.deleteFlows(parseFlowId(id));
      reply.status(200).send({ ok: true });
    },
  );

  fastify.get(
    "/aiPrompt",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const aiPrompt = await flowsService.listAiPrompt();
      reply.status(200).send(aiPrompt);
    },
  );

  fastify.put(
    "/aiPrompt/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Params;
      const aiPrompt = await flowsService.updateAiPrompt(
        parseAiPromptId(id),
        parseAiPromptUpdateData(request.body),
      );
      reply.status(200).send(aiPrompt);
    },
  );

  fastify.post(
    "/aiPrompt",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const aiPrompt = await flowsService.createAiPrompt(
        parseAiPromptCreateData(request.body),
      );
      reply.status(200).send(aiPrompt);
    },
  );

  fastify.delete(
    "/aiPrompt/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Params;
      await flowsService.deleteAiPrompt(parseAiPromptId(id));

      reply.status(200).send({ sucesso: true });
    },
  );
}

/**
 * O controller mantém a organização de rotas existente, mas transforma cada
 * entrada externa em um DTO mínimo antes de chamar o service. Isso impede que
 * IDs, flags, timestamps ou campos Prisma sejam controlados pelo cliente.
 */
