// subscriber.js
import { io } from "socket.io-client";
import { createRedisClients } from "../shared-config/redisClient.js";
import commentCacheModel from "./models/commentCacheModel.js";
// import localCacheModel from "./models/localCacheModel.js";

// 1. Await redis clients
const { sub } = await createRedisClients();

// 2. Connect socket.io client (only if gateway server is running on :4000)
const socket = io("http://localhost:4000");


// 3. User created cache handler
await sub.subscribe("user:created", async (message) => {
  try {
    const { payload } = JSON.parse(message);
    await commentCacheModel.findByIdAndUpdate(
      payload._id,
      {
        name: payload.name,
        username: payload.username,
        email: payload.email,
        profileImage: payload.profileImage,
      },
      { upsert: true, new: true }
    );
    console.log("✅ User cached with _id as userId in comments ");
  } catch (err) {
    console.error("❌ Error caching user:", err.message);
  }
});
