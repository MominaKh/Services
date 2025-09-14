import Profile from '../models/profileModel.js';
import cloudinary from '../helpers/cloudinary.js';
import streamifier from 'streamifier';
import { userModel } from '../models/userModel.js';
import { generateToken } from '../helpers/authHelper.js';
import { createRedisClients } from "../../shared-config/redisClient.js"

const { pub } = await createRedisClients()

export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId }).populate('user', 'name email');
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const setupProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, username } = req.body;
    console.log('enter in setup profile', name, username)

    if (!name || !username) {
      return res.json({ message: "Name and username are required" });
    }

    // Check if profile already exists (avoid duplicate setup)
    const existingProfile = await Profile.findOne({ user: userId });
    if (existingProfile) {
      return res.json({ message: "Profile already exists" });
    }

    // Check username uniqueness
    const existingUsername = await Profile.findOne({ username });
    if (existingUsername) {
      return res.json({ message: "Username already taken" });
    }

    const profile = new Profile({
      user: userId,
      name,
      username,
    });


    await profile.save();



    const user = await userModel.findByIdAndUpdate(userId,
      { onboardingStep: 4 },
      { new: true }
    );
    const token = generateToken(user);
    const payload = {
      _id: user._id,
      name: profile.name,
      username: profile.username,
      email: user.email,
      profileImage: profile.profileImage
    }

    await pub.publish("user:created", JSON.stringify({
       payload
    }))

    const notificationPayload = {
      receiverId: user._id,
      entityType: "security",
      message: "You have successfully created account in bytehive."
    }
    await pub.publish("notification:event", JSON.stringify({
       notificationPayload
    }))

    return res.status(201).json({ message: "Profile created successfully", profile, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;

    if (req.file?.buffer) {
      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'profile_images' },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await streamUpload();
      updates.profileImage = result.secure_url;
    }

    // Normalize socialLinks
    if (
      'socialLinks[Linkedin]' in updates ||
      'socialLinks[Github]' in updates ||
      'socialLinks[X]' in updates ||
      'socialLinks[Youtube]' in updates ||
      'socialLinks[Instagram]' in updates ||
      'socialLinks[Facebook]' in updates ||
      'socialLinks[Threads]' in updates ||
      'socialLinks[Websites]' in updates
    ) {
      updates.socialLinks = {
        Linkedin: updates['socialLinks[Linkedin]'] || '',
        Github: updates['socialLinks[Github]'] || '',
        X: updates['socialLinks[X]'] || '',
        Youtube: updates['socialLinks[Youtube]'] || '',
        Instagram: updates['socialLinks[Instagram]'] || '',
        Facebook: updates['socialLinks[Facebook]'] || '',
        Threads: updates['socialLinks[Threads]'] || '',
        Websites: updates['socialLinks[Websites]'] || ''
      };

      [
        'Linkedin', 'Github', 'X', 'Youtube',
        'Instagram', 'Facebook', 'Threads', 'Websites'
      ].forEach(key => delete updates[`socialLinks[${key}]`]);
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.params.userId },
      { $set: { ...updates, user: req.params.userId } },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
};
