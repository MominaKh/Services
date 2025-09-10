import express from "express";
import { createTag, getTags } from "../controllers/tagController.js";

const router = express.Router();

// Create a new tag (Admin only, ideally)
router.post("/", createTag);

// Get all tags
router.get("/", getTags);

export default router;
