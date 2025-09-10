import express from "express";
import { addUserTag, getUserTags } from "../controllers/userTagController.js";

const router = express.Router();

// Assign tags to a user
router.post("/", addUserTag);

// Get all tags followed by a user
router.get("/:userId", getUserTags);

export default router;
