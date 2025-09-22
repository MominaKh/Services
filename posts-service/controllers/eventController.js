import Event from "../models/Event.js";
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

const eventQueue = new Queue("eventJobs", { connection: redisConnection });

// Create Event
export const createEvent = async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();

    if (event.media?.inputs?.length) {
      await eventQueue.add("processEvent", { eventId: event._id });
    }

    res.status(201).json({ ok: true, event });
  } catch (err) {
    console.error("Create event error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// 📌 Get all events with pagination
export const getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const events = await Event.find()
      .sort({ event_date: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Event.countDocuments();

    res.json({
      ok: true,
      events,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// Search + filter + paginate
export const searchEvents = async (req, res) => {
  try {
    const { q, category, tags, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search by event name
    if (q) {
      query.event_name = { $regex: q, $options: "i" };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by tags (comma-separated)
    if (tags) {
      const tagsArray = tags.split(",").map((t) => t.trim());
      query.tags = { $in: tagsArray };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      Event.find(query).sort({ event_date: 1 }).skip(skip).limit(parseInt(limit)),
      Event.countDocuments(query)
    ]);

    res.json({
      ok: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      events
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// Get single event
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });
    res.json({ ok: true, event });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    if (event.media?.inputs?.length) {
      await eventQueue.add("processEvent", { eventId: event._id });
    }

    res.json({ ok: true, event });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
