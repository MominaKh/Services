import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: { type: String, unique: true , default: null},
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  googleId: { type: String, default: null },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }

}, { timestamps: true });

export const userModel = model('User', userSchema);
