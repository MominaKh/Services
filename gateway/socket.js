import { Server } from "socket.io";
import { createRedisClients } from "../shared-config/redisClient.js";

export const setupSocket = async (server) => {
  const io = new Server(server, { cors: { origin: "*" } });

  // Redis setup
  const { sub } = await createRedisClients();

  // Subscribe once
  // sub.subscribe("forward:event", (message) => {
  //   const event = JSON.parse(message);
  //   console.log("📢 Broadcasting to clients:", event);

  //   if (event.data?.postId) {
  //     io.to(`post:${event.data.postId}`).emit(event.type, event.data);
  //   }
  // });

  
  // Socket.IO handlers
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", ({ type, id }) => {
      const roomKey = `${type}:${id}`;
      socket.join(roomKey);
      console.log(`📌 ${socket.id} joined room ${roomKey}`);
    });

    socket.on("leaveRoom", ({ type, id }) => {
      const roomKey = `${type}:${id}`;
      socket.leave(roomKey);
      console.log(`📌 ${socket.id} left room ${roomKey}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

    socket.on("forward:event", ({type, data}) => {
    console.log("📢 Broadcasting to clients:", type, data);

    if (data?.postId) {
      io.to(`post:${data.postId}`).emit(type, data);
    }
  })
  });

  return io;
};
