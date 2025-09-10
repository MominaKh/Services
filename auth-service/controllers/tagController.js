import Tag from "../models/tagModel.js";

// Create a new tag
export const createTag = async (req, res) => {
  try {
    const { name } = req.body;
    const tag = new Tag({ name });
    await tag.save();
    res.status(201).json(tag);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all tags
export const getTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a tag
export const deleteTag = async (req, res) => {
  try {
    await Tag.findByIdAndDelete(req.params.id);
    res.json({ message: "Tag deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
