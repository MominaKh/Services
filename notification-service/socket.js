import { Server } from "socket.io";

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  const onlineUsers = {};
  
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", (postId) => {
      socket.join(postId);
      console.log(`Socket ${socket.id} joined room: ${postId}`);
    });

    socket.on("leaveRoom", (postId) => {
      socket.leave(postId);
      console.log(`Socket ${socket.id} left room: ${postId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};
