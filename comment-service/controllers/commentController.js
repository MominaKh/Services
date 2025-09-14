import commentModel from "../models/commentModel.js";
import { io } from "socket.io-client";
import { createRedisClients } from "../../shared-config/redisClient.js";
import commentCacheModel from "../models/commentCacheModel.js";
// import localCacheModel from "../../notification-service/models/notificationModel.js";

const { pub } = await createRedisClients();
const socket = io("http://localhost:4000");

// helper to attach user details from cache
const attachUserDetails = async (comments) => {
  // console.log('entering in attach user')
  if (!Array.isArray(comments)) comments = [comments];
// console.log('entering in attach user 2')
  const userIds = [...new Set(comments.map(c => c.userId?.toString()).filter(Boolean))];
  // console.log('entering in attach user 3', userIds)
  const users = await commentCacheModel.find({ _id: { $in: userIds } } );
  // console.log('users in attach user', users)
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
// console.log('entering in attach user 4')
  return comments.map(c => {
    const commentObj = typeof c.toObject === "function" ? c.toObject() : c; // ✅ safe
    return {
      ...commentObj,
      user: userMap.has(c.userId?.toString())
        ? {
          _id: userMap.get(c.userId.toString())._id,
          username: userMap.get(c.userId.toString()).username,
          profileImage: userMap.get(c.userId.toString()).profileImage,
        }
        : null,
    };
  });
};


export const addComment = async (req, res) => {
  try {
    const { postId, parentId, userId, text, receiverName, receiverId, entityId } = req.body;

    if (parentId) {
      await commentModel.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }

    const comment = await commentModel.create(req.body);
    let user = await commentCacheModel.findById(userId);
    console.log('user in add comment', user)

    const responseComment = {
      ...comment.toObject(),
      user: user
        ? {
          _id: user._id,
          username: user.username,
          profileImage: user.profileImage,
        }
        : null,
    };

    const notificationPayload = {
      receiverId,
      receiverName,
      senderId: responseComment.user?._id,
      senderName: responseComment.user?.username,
      triggerType: parentId ? "reply" : "comment",
      triggerId: comment._id,
      message: `${responseComment.user?.username} ${parentId ? "replied" : "commented"} on your ${parentId ? "comment" : "post"
        }`,
      entityId,
      entityType: parentId ? "comment" : "post",
      postId,
    };

    socket.emit("forward:event", { type: "comment:new", data: responseComment });
    await pub.publish("notification:event", JSON.stringify({ notificationPayload }));

    res.send(responseComment);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const getCommentsById = async (req, res) => {
  try {
    const comment = await commentModel.findById(req.params.commentId);
    if (!comment) return res.status(404).send({ error: "Comment not found" });

    let response = await attachUserDetails(comment);

    if (!comment.parentId) {
      const replies = await commentModel.find({ parentId: comment._id });
      const repliesWithUser = await attachUserDetails(replies);
      res.send({ comment: response[0], replies: repliesWithUser });
    } else {
      res.send({ comment: response[0] });
    }
  } catch (error) {
    res.status(500).send(error);
  }
};

export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { cursor, limit = 5, sort = "latest" } = req.query;

    const query = { postId, parentId: null };

    if (cursor) {
      if (sort === "latest") {
        query._id = { $lt: cursor };
      } else {
        query._id = { $gt: cursor };
      }
    }

    const sortOrder = sort === "latest" ? -1 : 1;
    const comments = await commentModel
      .find(query)
      .sort({ _id: sortOrder })
      .limit(parseInt(limit));

    const commentsWithUser = await attachUserDetails(comments);
    console.log('commentsWithUser', commentsWithUser)

    res.send(commentsWithUser);
  } catch (error) {
    res.status(500).send({ error: "Something went wrong", details: error.message });
  }
};

export const getReplies = async (req, res) => {
  try {
    const { postId, parentId } = req.query;
    const replies = await commentModel.find({ postId, parentId });

    const repliesWithUser = await attachUserDetails(replies);
    res.send(repliesWithUser);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const likeComment = async (req, res) => {
  try {
    const { userId, commentId } = req.body;
    const comment = await commentModel.findById(commentId);

    let newLikeList;
    if (comment.likes.includes(userId)) {
      newLikeList = await commentModel.findByIdAndUpdate(
        commentId,
        { $pull: { likes: userId } },
        { new: true }
      );
    } else {
      newLikeList = await commentModel.findByIdAndUpdate(
        commentId,
        { $addToSet: { likes: userId }, $pull: { dislikes: userId } },
        { new: true }
      );
    }

    const updated = await attachUserDetails(newLikeList);
    socket.emit("forward:event", { type: "comment:LikeAndDislike", data: updated[0] });
    res.send(updated[0]);
  } catch (error) {
    console.log("Error in likeComment", error);
    res.status(500).send(error);
  }
};

export const dislikeComment = async (req, res) => {
  try {
    const { userId, commentId } = req.body;
    const comment = await commentModel.findById(commentId);

    let newLikeList;
    if (comment.dislikes.includes(userId)) {
      newLikeList = await commentModel.findByIdAndUpdate(
        commentId,
        { $pull: { dislikes: userId } },
        { new: true }
      );
    } else {
      newLikeList = await commentModel.findByIdAndUpdate(
        commentId,
        { $addToSet: { dislikes: userId }, $pull: { likes: userId } },
        { new: true }
      );
    }

    const updated = await attachUserDetails(newLikeList);
    socket.emit("forward:event", { type: "comment:LikeAndDislike", data: updated[0] });
    res.send(updated[0]);
  } catch (error) {
    console.log("Error in dislikeComment", error);
    res.status(500).send(error);
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId, text } = req.body;
    const updatedComment = await commentModel.findByIdAndUpdate(
      commentId,
      { text },
      { new: true }
    );

    const withUser = await attachUserDetails(updatedComment);
    socket.emit("forward:event", { type: "comment:update", data: withUser[0] });
    res.send(withUser[0]);
  } catch (error) {
    console.log("Error in update comment: ", error);
    res.status(500).send(error);
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    let comment = await commentModel.findById(commentId);
    if (!comment) return res.status(404).send({ error: "Comment not found" });

    if (!comment.parentId && comment.replyCount > 0) {
      await commentModel.deleteMany({ parentId: comment._id });
    }
    await commentModel.findByIdAndDelete(commentId);
    if (comment.parentId) {
      await commentModel.findByIdAndUpdate(
        comment.parentId,
        { $inc: { replyCount: -1 } },
        { new: true }
      );
    }

    const withUser = await attachUserDetails(comment);
    socket.emit("forward:event", { type: "comment:delete", data: withUser[0] });
    res.send({ success: true });
  } catch (error) {
    console.log("Error in deleting comment", error);
    res.status(500).send(error);
  }
};
