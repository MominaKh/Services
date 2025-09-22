import express from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  searchEvents
} from "../controllers/eventController.js";

const router = express.Router();

// Create event
router.post("/", createEvent);

// Get all events (with pagination)
router.get("/", getEvents);

// Search + filter events
router.get("/search/query", searchEvents);

// Get single event by ID
router.get("/:id", getEventById);

// Update event
router.put("/:id", updateEvent);

// Delete event
router.delete("/:id", deleteEvent);

export default router;
