import UserTag from "../models/userTagModel.js";

// Add a tag for a user
// controller
export const addUserTag = async (req, res) => {
  try {
    const { userId, tagIds } = req.body;  // <-- array

    const userTags = [];

    for (const tagId of tagIds) {
      const existing = await UserTag.findOne({ userId, tagId });
      if (!existing) {
        const ut = new UserTag({ userId, tagId });
        await ut.save();
        userTags.push(ut);
      }
    }

    res.status(201).json(userTags);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// Get all tags for a user
export const getUserTags = async (req, res) => {
  try {
    const { userId } = req.params;
    const userTags = await UserTag.find({ userId }).populate("tagId", "name");
    res.json(userTags.map((ut) => ut.tagId));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove a tag from a user
export const removeUserTag = async (req, res) => {
  try {
    const { userId, tagId } = req.body;
    await UserTag.findOneAndDelete({ userId, tagId });
    res.json({ message: "Tag removed from user" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
