import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FlowsService } from "./flow.services.js";
const flowsService = new FlowsService();
export async function flowController(fastify: FastifyInstance) {
  // GET — listar todos os flows ativos
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const flows = await flowsService.listAll();
    reply.status(200).send(flows);
  });
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const id = request.params as any;
    const flow = await flowsService.findById(id);
    reply.status(200).send(flow);
  });
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome, flow, descricao = "" } = request.body as any;
    const saved = await flowsService.createOrUpdate({
      descricao: descricao,
      flow_json: flow,
      nome: nome,
    });
    reply.status(200).send(saved);
  });
  fastify.delete(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const id = request.params as any;
      await flowsService.deleteFlows(id);
      reply.status(200).send({ ok: true });
    },
  );
}
