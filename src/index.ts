import "dotenv/config";
import { start } from "./core/api";


(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

if (require.main === module) {
  start().catch((err) => {
  console.error("❌ Erro fatal ao iniciar o servidor:", err);
  process.exit(1);
});

}

// import fastify from 'fastify'
// import fastifySocketIO from "fastify-socket.io";
// import { Server as SocketIOServer } from 'socket.io'



// const server = fastify({
//   logger: true // habilita logs bonitos
// })



// // Rota de teste
// server.get('/', async (request, reply) => {
//   return { message: 'Hello World com Fastify + TypeScript!' }
// })

// // Rota com parâmetro
// server.get<{ Params: { id: string } }>('/user/:id', async (request, reply) => {
//   const { id } = request.params
//   return { userId: id, nome: `Usuário ${id}` }
// })

// // Inicialização
// const start = async () => {
//   try {
//     // ✅ Registro do plugin do Socket.IO (agora dentro de uma função async)
//     await server.register(fastifySocketIO, {
//       cors: { origin: '*' } // Ajuste conforme necessário
//     })
//       // Após o plugin ser registrado, configuramos os eventos do Socket.IO
//     // O server.ready() garante que todos os plugins foram carregados
//     server.ready((err) => {
//         if (err) throw err;

//         server.io.use(async(socket, next)=>{
//             console.log(socket)
//         })
//     //   server.io.on('connection', (socket) => {
//     //     console.log('✅ Cliente conectado', socket.id)

//     //     socket.on('mensagem', (data) => {
//     //       console.log('📨 Mensagem recebida:', data)
//     //       socket.emit('resposta', 'Recebido com sucesso!')
//     //     })

//     //     socket.on('disconnect', () => {
//     //       console.log('❌ Cliente desconectado', socket.id)
//     //     })
//     //   })
//     })
//     await server.listen({ port: 3333, host: '0.0.0.0' })
    
//     console.log('Servidor rodando em http://localhost:3333')
//   } catch (err) {
//     server.log.error(err)
//     process.exit(1)
//   }
// }

// start()