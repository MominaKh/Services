import commentModel from "../models/commentModel.js";
import { io } from "socket.io-client";

// import Profile from "../models/profileModel.js";
import { createRedisClients } from "../../shared-config/redisClient.js"

const { pub } = await createRedisClients()

const socket = io("http://localhost:4000");

export const addComment = async (req, res) => {
  try {
    const { postId, parentId, userId, text, receiverName, receiverId, entityId } = req.body;

    if (parentId) {
      await commentModel.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }
    const comment = await commentModel.create(req.body);
    console.log("RecieverName: ", receiverName);
    console.log("Comment: ", comment);
    // req.io.to(postId).emit("comment:new", comment);

    const notificationPayload = {
      receiverId: receiverId,
      receiverName: receiverName,
      senderId: comment.user._id,
      senderName: comment.user.username,
      triggerType: comment.parentId ? "reply" : "comment",
      triggerId: comment._id,
      message: `${comment.user.username} ${comment.parentId ? "replied" : "commented"} on your ${comment.parentId ? "comment" : "post"}`,
      entityId: entityId,
      entityType: comment.parentId ? "comment" : "post", 
      postId: postId
    }

    console.log("notifaction payload", notificationPayload);

    socket.emit("forward:event", { type: "comment:new", data: comment })

    await pub.publish("notification:event", JSON.stringify({
      notificationPayload

    }));
    res.send(comment);
  } catch (error) {
    res.send(error);
  }
};

export const getCommentsById = async (req, res) => {
  try {
    const comment = await commentModel.findById(req.params.commentId)
    if(!comment.parentId) {
      const replies = await commentModel.find({parentId: comment._id})
      res.send({comment, replies})
    } else {
      res.send({comment})
    }
    
  } catch (error) {
    
  }
}

export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { cursor, limit = 5, sort = "latest" } = req.query;

    const query = {
      postId,
      parentId: null,
    };

    if (cursor) {
      // If sorting latest (desc), fetch older
      if (sort === "latest") {
        query._id = { $lt: cursor };
      } else {
        // If sorting oldest (asc), fetch newer
        query._id = { $gt: cursor };
      }
    }

    const sortOrder = sort === "latest" ? -1 : 1;

    const comments = await commentModel
      .find(query)
      .sort({ _id: sortOrder })
      .limit(parseInt(limit));

    res.send(comments);
  } catch (error) {
    res.status(500).send({ error: "Something went wrong", details: error.message });
  }
};


export const getReplies = async (req, res) => {
  try {
    const { postId, parentId } = req.query;
    console.log("✅ getReplies controller hit", parentId);
    const replies = await commentModel.find({ postId, parentId })

    res.send(replies);

    // res.send(replies);
  } catch (error) {
    console.log("Error: ", error);
  }
};

export const likeComment = async (req, res) => {
  try {
    const { userId, commentId } = req.body
    const comment = await commentModel.findById(commentId)

    let newLikeList
    if (comment.likes.includes(userId)) {
      newLikeList = await commentModel.findByIdAndUpdate(commentId, {
        $pull: { likes: userId }
      },
        { new: true }
      )
    }

    else {
      newLikeList = await commentModel.findByIdAndUpdate(commentId, {
        $addToSet: { likes: userId },
        $pull: { dislikes: userId }
      },
        { new: true }
      )
    }

    socket.emit("forward:event", { type: "comment:LikeAndDislike", data: newLikeList })
    res.send(newLikeList)

  } catch (error) {
    console.log('Error in likeComment', error)
  }
}

export const dislikeComment = async (req, res) => {
  try {
    const { userId, commentId } = req.body
    const comment = await commentModel.findById(commentId)

    let newLikeList
    if (comment.dislikes.includes(userId)) {
      newLikeList = await commentModel.findByIdAndUpdate(commentId, {
        $pull: { dislikes: userId }
      },
        { new: true }
      )
    }

    else {
      newLikeList = await commentModel.findByIdAndUpdate(commentId, {
        $addToSet: { dislikes: userId },
        $pull: { likes: userId }
      },
        { new: true }
      )
    }

    // newLikeList = await commentModel.findByIdAndUpdate(commentId,)
    socket.emit("forward:event", { type: "comment:LikeAndDislike", data: newLikeList })
    res.send(newLikeList)

  } catch (error) {
    console.log('Error in likeComment', error)
  }
}

export const updateComment = async (req, res) => {
  try {
    const { commentId, text } = req.body
    console.log(`commetnId: ${commentId}, Text: ${text}`);
    const updatedComment = await commentModel.findByIdAndUpdate(commentId,
      { text: text },
      { new: true }
    )
    // req.io.to(updatedComment.postId).emit("comment:update", updatedComment)
    // await pub.publish("forward:event", JSON.stringify({
    //   type: "comment:update",
    //   data: updatedComment
    // }));
    socket.emit("forward:event", { type: "comment:update", data: updatedComment })
    res.send(updatedComment)

  } catch (error) {
    console.log('Error in update comment: ', error)
  }
}

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params
    let comment = await commentModel.findById(commentId)
    if (!comment.parentId && comment.replyCount > 0) {
      await commentModel.deleteMany({ parentId: comment._id })
    }
    await commentModel.findByIdAndDelete(commentId)
    if (comment.parentId) {
      await commentModel.findByIdAndUpdate(comment.parentId,
        { $inc: { replyCount: -1 } },
        { new: true }
      )
    }
    console.log("comment in delete", comment);
    socket.emit("forward:event", { type: "comment:delete", data: comment })
    res.send({ success: true })
  } catch (error) {
    console.log("Error in deleting comment", error);
  }
}