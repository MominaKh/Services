// import mongoose from "mongoose";
// import Tag from "./models/tagModel.js"; // adjust path if needed

// const MONGO_URI = "mongodb://127.0.0.1:27017/hub"; // change db name

// const tags = [
//   // 🎮 Gaming
//   { name: "PC Gaming", slug: "pc-gaming", description: "News and discussions about PC gaming" },
//   { name: "Console Gaming", slug: "console-gaming", description: "PlayStation, Xbox, Nintendo" },
//   { name: "Mobile Gaming", slug: "mobile-gaming", description: "Gaming on Android and iOS" },
//   { name: "Esports", slug: "esports", description: "Competitive gaming and tournaments" },
//   { name: "Game Development", slug: "game-dev", description: "Creating and developing video games" },
//   { name: "Retro Gaming", slug: "retro-gaming", description: "Classic and nostalgic games" },
//   { name: "Indie Games", slug: "indie-games", description: "Independent and creative titles" },

//   // 💻 Tech
//   { name: "Artificial Intelligence", slug: "ai", description: "AI, ML, and neural networks" },
//   { name: "Cybersecurity", slug: "cybersecurity", description: "Security news and practices" },
//   { name: "Cloud Computing", slug: "cloud", description: "AWS, Azure, Google Cloud" },
//   { name: "Web Development", slug: "web-dev", description: "Frontend, backend, fullstack" },
//   { name: "Mobile Development", slug: "mobile-dev", description: "iOS, Android development" },
//   { name: "Programming", slug: "programming", description: "Coding, languages, frameworks" },
//   { name: "Open Source", slug: "open-source", description: "Community projects and tools" },
//   { name: "Blockchain", slug: "blockchain", description: "Crypto, Web3, decentralized apps" },
//   { name: "Hardware", slug: "hardware", description: "PC parts, gadgets, and electronics" },
//   { name: "AR/VR", slug: "ar-vr", description: "Virtual and augmented reality" },
//   { name: "Tech News", slug: "tech-news", description: "Latest updates in technology" },
//   { name: "Startups", slug: "startups", description: "Innovation and entrepreneurship" },
//   { name: "Productivity Tools", slug: "productivity", description: "Software and apps for efficiency" }
// ];

// async function seedTags() {
//   try {
//     await mongoose.connect(MONGO_URI);
//     console.log("✅ Connected to MongoDB");

//     // Clear old tags (optional)
//     await Tag.deleteMany({});
//     console.log("🗑️ Old tags cleared");

//     // Insert new tags
//     await Tag.insertMany(tags.map(t => ({ ...t, isActive: true })));
//     console.log("🌱 Tags seeded successfully");

//     mongoose.disconnect();
//   } catch (err) {
//     console.error("❌ Error seeding tags:", err);
//   }
// }

// seedTags();
