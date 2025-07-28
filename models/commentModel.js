import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  postId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  parentId: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Comment' },
  // text: { type: String, required: true },
  // replyCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

commentSchema.index({ postId: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
