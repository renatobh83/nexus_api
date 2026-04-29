import { FastifyRequest, FastifyReply } from 'fastify';

export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-key'] || request.headers['x_api_key'];
  const expectedKey = process.env.API_KEY;
 
    if (process.env.NODE_ENV === 'development') {
      return; // aceita qualquer requisição
    }
  if (!apiKey || apiKey !== expectedKey) {
    reply.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Invalid or missing X-Key header' 
    });
    throw new Error('Unauthorized'); // interrompe a execução
  }
}