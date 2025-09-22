import Post from "../models/Post.js";
import { queues } from "../config/redis.js";

// CREATE — fast, enqueue heavy work
export const createPost = async (req, res) => {
  try {
    const {
      post_title,
      small_description,
      post_description,
      category,
      tags = [],
      community,
      user_id,
      thumbnail,
      mediaInputs = [] // array of base64 strings or URLs
    } = req.body;

    const post = await Post.create({
      post_title,
      small_description,
      post_description,
      category,
      tags,
      community,
      user_id,
      thumbnail: thumbnail || null,
      media: { inputs: Array.isArray(mediaInputs) ? mediaInputs : [] },
      status: "pending"
    });

    // enqueue worker job
    await queues.postJobs.add(
      "processPost",
      { postId: post._id.toString() },
      { attempts: 3, removeOnComplete: true, removeOnFail: 50 }
    );

    return res.status(201).json({
      ok: true,
      message: "Post created. Processing in background.",
      post
    });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
};

// GET ALL — infinite scroll (skip+limit) + optional filters
export const getPosts = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip || "0", 10);
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 100);

    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.user_id) query.user_id = Number(req.query.user_id);
    if (req.query.community) query.community = req.query.community;
    if (req.query.status) query.status = req.query.status;

    // tags can be "ai,web"
    if (req.query.tags) {
      const tagList = req.query.tags.split(",").map(s => s.trim()).filter(Boolean);
      if (tagList.length) query.tags = { $in: tagList };
    }

    const posts = await Post.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    res.json({ ok: true, total, count: posts.length, posts });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// GET BY ID
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, post });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// UPDATE — enqueue if description/media changed
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    const update = { ...req.body };
    if (Array.isArray(req.body.mediaInputs)) {
      update["media.inputs"] = req.body.mediaInputs;
      update.status = "pending";
    }

    const before = await Post.findById(id).select("post_description");
    const post = await Post.findByIdAndUpdate(id, update, { new: true });

    if (!post) return res.status(404).json({ ok: false, error: "Not found" });

    const descChanged =
      before &&
      typeof req.body.post_description === "string" &&
      req.body.post_description !== before.post_description;

    const hasNewMedia = Array.isArray(req.body.mediaInputs) && req.body.mediaInputs.length > 0;

    if (descChanged || hasNewMedia) {
      await queues.postJobs.add(
        "processPost",
        { postId: post._id.toString() },
        { attempts: 3, removeOnComplete: true, removeOnFail: 50 }
      );
    }

    res.json({ ok: true, post });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// DELETE
export const deletePost = async (req, res) => {
  try {
    const deleted = await Post.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Not found" });
    // Optionally: enqueue a job to delete Cloudinary assets (not implemented here)
    res.json({ ok: true, message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// SEARCH — better ranking, tags/categories filter, pagination
export const searchPosts = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const tagsParam = String(req.query.tags || "").trim();
    const categoryParam = String(req.query.category || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50); // safe max 50
    const skip = (page - 1) * limit;

    let query = {};
    const conditions = [];

    // 🔍 Search text in title, description, category, tags
    if (q) {
      const terms = Array.from(
        new Set(
          q.split(/[\s,]+/)
            .map((t) => t.trim())
            .filter((t) => t.length >= 2)
        )
      );

      const textConditions = [];
      for (const term of terms) {
        const rx = new RegExp(term, "i");
        textConditions.push(
          { post_title: rx },
          { small_description: rx },
          { post_description: rx },
          { category: rx },
          { tags: rx }
        );
      }
      if (textConditions.length > 0) {
        conditions.push({ $or: textConditions });
      }
    }

    // 🏷️ Tag filter
    if (tagsParam) {
      const requestedTags = tagsParam
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (requestedTags.length > 0) {
        conditions.push({ tags: { $in: requestedTags } });
      }
    }

    // 📂 Category filter
    if (categoryParam) {
      conditions.push({ category: new RegExp(categoryParam, "i") });
    }

    if (conditions.length > 0) {
      query = conditions.length === 1 ? conditions[0] : { $and: conditions };
    }

    console.log("MongoDB query:", JSON.stringify(query, null, 2));

    // ⭐ Ranking: weighted score (upvotes & views), then newest first
    const posts = await Post.aggregate([
      { $match: query },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ["$upvotes", 2] },
              { $multiply: ["$views", 0.5] },
              { $divide: [{ $subtract: [new Date(), "$createdAt"] }, -1000 * 60 * 60 * 24] } // newer = higher
            ]
          }
        }
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const total = await Post.countDocuments(query);

    res.json({
      ok: true,
      count: posts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      posts
    });
  } catch (err) {
    console.error("Search posts error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// STATUS — to poll pending/ready
export const getPostStatus = async (req, res) => {
  try {
    const doc = await Post.findById(req.params.id).select("status");
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, status: doc.status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
