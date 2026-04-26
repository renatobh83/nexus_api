import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function channelController( fastify: FastifyInstance) {
    fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
        
        reply.status(200).send("OLa")
    })
}