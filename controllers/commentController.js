import commentModel from "../models/commentModel.js";
import Profile from "../models/profileModel.js";

export const addComment = async (req, res) => {
  try {
    const { postId, parentId, userId, text } = req.body;

    if (parentId) {
      await commentModel.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }

    const comment = await commentModel.create({ postId, userId, parentId, text });

    req.io.to(postId).emit("comment:new", comment);
    res.send(comment);
  } catch (error) {
    res.send(error);
  }
};

export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await commentModel
      .find({ postId, parentId: null })
      .populate("userId", "name");

    const userIds = comments.map((c) => c.userId._id);
    const profiles = await Profile.find({ user: { $in: userIds } });

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p.profileImage;
    });

    const enrichedComments = comments.map((comment) => {
      const obj = comment.toObject();
      obj.userId.profileImage = profileMap[obj.userId._id.toString()] || null;
      return obj;
    });

    res.send(enrichedComments);
  } catch (error) {
    res.status(500).send({ error: "Something went wrong", details: error.message });
  }
};

export const getReplies = async (req, res) => {
  console.log("✅ getReplies controller hit");
  try {
    const { postId, parentId } = req.query;
    const replies = await commentModel.find({ postId, parentId }).populate('userId', "name");
    res.send(replies);
  } catch (error) {
    console.log("Error: ", error);
  }
};
