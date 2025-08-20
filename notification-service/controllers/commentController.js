import commentModel from "../models/Notification.js";
// import Profile from "../models/profileModel.js";

export const addComment = async (req, res) => {
  try {
    const { postId, parentId, userId, text } = req.body;

    if (parentId) {
      await commentModel.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }
    const comment = await commentModel.create(req.body);
    console.log("Comment: ", comment);
    req.io.to(postId).emit("comment:new", comment);
    res.send(comment);
  } catch (error) {
    res.send(error);
  }
};

export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { cursor, limit = 5 } = req.query;

const query = {
      postId,
      parentId: null,
    };

    if (cursor) {
      query._id = { $lt: cursor }; // fetch older comments (Mongo IDs are time sortable)
    }

    const comments = await commentModel
      .find(query)
      .sort({ _id: -1 }) // newest first
      .limit(parseInt(limit));

    res.send(comments);
  } catch (error) {
    res.status(500).send({ error: "Something went wrong", details: error.message });
  }
};

export const getReplies = async (req, res) => {
  console.log("✅ getReplies controller hit");
  try {
    const { postId, parentId } = req.query;
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
    const comment = await commentModel.findById( commentId )

    let newLikeList
    if (comment.likes.includes(userId)) {
      newLikeList = await commentModel.findByIdAndUpdate(commentId, {
        $pull: { likes: userId}},
      { new: true }
    )}

    else  {
      newLikeList = await commentModel.findByIdAndUpdate(commentId, {
        $push: { likes: userId}},
        { new: true }
    )}

    req.io.to(newLikeList.postId).emit("comment:like", newLikeList)
    res.send(newLikeList)

  } catch (error) {
    console.log('Error in likeComment', error )
  }
}

export const updateComment = async (req, res) => {
  try {
    const { commentId, text} = req.body
    console.log(`commetnId: ${commentId}, Text: ${text}`);
    const updatedComment = await commentModel.findByIdAndUpdate(commentId,
       {text: text},
       {new: true}
      )
    req.io.to(updatedComment.postId).emit("comment:update", updatedComment)
    res.send(updatedComment)

  } catch (error) {
    console.log('Error in update comment: ', error )
  }
}

export const deleteComment = async (req, res) => {
  try {
    const {commentId} = req.params
    let comment = await commentModel.findById(commentId)
    if (!comment.parentId && comment.replyCount > 0) {
      await commentModel.deleteMany({parentId: comment._id})
    }
    await commentModel.findByIdAndDelete(commentId)
    if(comment.parentId) {
      await commentModel.findByIdAndUpdate(comment.parentId, 
        { $inc: { replyCount: -1 } },
        {new: true}
      )
    }
    console.log("comment in delete", comment);
    req.io.to(comment.postId).emit("comment:delete", comment)
    res.send({success: true})
  } catch (error) {
    console.log("Error in deleting comment", error);
  }
}