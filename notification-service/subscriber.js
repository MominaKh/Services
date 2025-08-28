import { io } from "socket.io-client";
import { createRedisClients } from "../shared-config/redisClient.js";
import notificationModel from "./models/notificationModel.js";


// 1. Await redis clients
const { sub } = await createRedisClients();

// 2. Connect socket.io client (only if gateway server is running on :4000)
const socket = io("http://localhost:4000");

// 3. Subscribe correctly
await sub.subscribe("notification:event", async (message) => {
  try {
    const parsed = JSON.parse(message);
    console.log("yeah notification happened");
    if (parsed.notificationPayload.receiverId === parsed.notificationPayload.senderId) return
    const notification = await notificationModel.create(parsed.notificationPayload)
    socket.emit("forward:event", {type: "notification:new" , data:  notification})

    // Send to socket server
    // socket.emit("forward:event", parsed);
  } catch (err) {
    console.error("Failed to parse message", err);
  }
});
