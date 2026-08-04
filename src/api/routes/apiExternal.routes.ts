
import { FastifyInstance } from "fastify";
import { redis } from "../../config/redis.js";
import jwt from "jsonwebtoken";
import { cadastrarSenha } from "../../integrations/genesis/services/autoatendimento/index.js";


export async function apiExternalRoutes(app: FastifyInstance) {

  // Get
  app.get("/r/:code", async (request, reply)=>{
    const { code } = request.params as any;
    try {
      const originalUrl = await redis.get(`short:${code}`);

      if (!originalUrl) {
        return reply
          .code(400)
          .send("Link expirado ou inválido");
      }
      
      return reply.redirect(originalUrl);
    } catch (error) {
    //   return handleServerError(reply, error);
    }
  });
  app.post("/validate-registration-token", async(request, reply)=>{
    const { token } = request.body as any;
    
    try {
      jwt.verify(
        token,
        "78591a1f59eda6e939d7a7752412b364a5218eef12a839616af49080860273c7"
      );
      const tokenSignature = token.split(".")[2];
      
      return reply.code(200).send({ valid: true });
    } catch (error) {
    console.log(error)
    }
  })
  app.post("/register", async (request, reply) => {
    const { token, ...formData } = request.body as any;
    try {
      const decode = jwt.verify(
        token,
        "78591a1f59eda6e939d7a7752412b364a5218eef12a839616af49080860273c7"
      );
      
      const data = await cadastrarSenha(formData)
      
      
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.log(error)
      // return handleServerError(reply, error);
    }
  }); 
}
