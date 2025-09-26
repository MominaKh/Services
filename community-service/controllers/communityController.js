import Community from '../models/Community.js';
import { cloudinary, uploadToCloudinary } from '../config/cloudinary.js';

// == Create Community 
export const createCommunity = async (req, res) => {
  try {
    const { community_name, description, visible, moderation, user_id } = req.body;
    let community_tags = req.body['community_tags[]'] || req.body.community_tags || [];
    
    // Ensure community_tags is always an array
    if (!Array.isArray(community_tags)) {
      community_tags = community_tags ? [community_tags] : [];
    }
    
    // Check if community name already exists
    const existingCommunity = await Community.findOne({ community_name });
    if (existingCommunity) {
      return res.status(400).json({ message: 'Community name already exists' });
    }

    const communityData = {
      community_name,
      description,
      user_id, // Using dummy user_id
      community_tags: community_tags,
      visible: visible || 'public',
      moderation: moderation || 'only admin',
    };

    console.log('Creating community with data:', communityData);

    // Handle image upload or set default
    if (req.file && req.file.buffer) {
      try {
        console.log('File received:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.buffer.length
        });
        
        // Validate file
        if (!req.file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: 'Only image files are allowed' });
        }
        
        if (req.file.buffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ message: 'File size too large. Maximum 5MB allowed.' });
        }

        console.log('Uploading image to Cloudinary...');
        const result = await uploadToCloudinary(req.file.buffer, 'community-images');
        console.log('Cloudinary upload result:', result.secure_url);
        communityData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ 
          message: 'Image upload failed', 
          error: uploadError.message || 'Unknown upload error'
        });
      }
    } else {
      // Set default avatar if no image provided
      communityData.image = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80";
    }

    const community = new Community(communityData);
    await community.save();

    // Remove populate since we're using dummy user_id
    
    res.status(201).json({
      message: 'Community created successfully',
      community,
    });
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Update Community
export const updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { community_name, description, visible, moderation } = req.body;
    let community_tags = req.body['community_tags[]'] || req.body.community_tags || [];
    
    // Ensure community_tags is always an array
    if (!Array.isArray(community_tags)) {
      community_tags = community_tags ? [community_tags] : [];
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Remove auth check - anyone can update now

    // Check if new name already exists (only if name is being changed)
    if (community_name && community_name !== community.community_name) {
      const existingCommunity = await Community.findOne({ community_name });
      if (existingCommunity) {
        return res.status(400).json({ message: 'Community name already exists' });
      }
    }

    const updateData = {};
    if (community_name) updateData.community_name = community_name;
    if (description) updateData.description = description;
    if (community_tags.length > 0) updateData.community_tags = community_tags;
    if (visible) updateData.visible = visible;
    if (moderation) updateData.moderation = moderation;

    // Handle image update
    if (req.file && req.file.buffer) {
      try {
        console.log('File received for update:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.buffer.length
        });
        
        // Validate file
        if (!req.file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: 'Only image files are allowed' });
        }
        
        if (req.file.buffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ message: 'File size too large. Maximum 5MB allowed.' });
        }

        // Delete old image from Cloudinary if it's not the default
        if (community.image && !community.image.includes('unsplash.com')) {
          try {
            const urlParts = community.image.split('/');
            const publicIdWithExtension = urlParts[urlParts.length - 1];
            const publicId = publicIdWithExtension.split('.')[0];
            const fullPublicId = `community-images/${publicId}`;
            console.log('Deleting old image:', fullPublicId);
            await cloudinary.uploader.destroy(fullPublicId);
          } catch (deleteError) {
            console.log('Error deleting old image:', deleteError.message);
            // Continue with upload even if delete fails
          }
        }

        const result = await uploadToCloudinary(req.file.buffer, 'community-images');
        updateData.image = result.secure_url;
        console.log('New image uploaded:', result.secure_url);
      } catch (uploadError) {
        console.error('Image upload error during update:', uploadError);
        return res.status(400).json({
          message: 'Image upload failed',
          error: uploadError.message || 'Unknown upload error',
        });
      }
    }

    const updatedCommunity = await Community.findByIdAndUpdate(communityId, updateData, {
      new: true,
    });

    res.json({
      message: 'Community updated successfully',
      community: updatedCommunity,
    });
  } catch (error) {
    console.error('Update community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Delete Community 
export const deleteCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Remove auth check - anyone can delete now

    // Delete image from Cloudinary if exists and not default
    if (community.image && !community.image.includes('unsplash.com')) {
      try {
        const urlParts = community.image.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        const fullPublicId = `community-images/${publicId}`;
        console.log('Deleting community image:', fullPublicId);
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (deleteError) {
        console.log('Error deleting image from cloudinary:', deleteError.message);
        // Continue with community deletion even if image delete fails
      }
    }

    await Community.findByIdAndDelete(communityId);

    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Discover Communities 
export const discoverCommunities = async (req, res) => {
  try {
    const { search, tags, page = 1, limit = 10, visible = 'public' } = req.query;
    let query = { visible };

    if (search) {
      query.$or = [
        { community_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim());
      query.community_tags = { $in: tagArray };
    }

    const communities = await Community.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Community.countDocuments(query);

    res.json({
      communities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Get Community Details
export const getCommunityDetails = async (req, res) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Increment view count
    await Community.findByIdAndUpdate(communityId, { $inc: { no_of_views: 1 } });

    res.json({ community });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Follow Community 
export const followCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body; // Get userId from request body instead of auth

    // Handle dummy community IDs that start with 'discover-'
    if (communityId.startsWith('discover-') || communityId.startsWith('owned-')) {
      // For dummy communities, just return success
      return res.json({ 
        message: 'Successfully followed community',
        success: true,
        communityId: communityId
      });
    }

    // For real communities in database
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Use userId from request body or default
    const userIdToUse = userId || 'dummy-user-id-123';

    // Check if already following
    if (community.members.includes(userIdToUse)) {
      return res.status(400).json({ message: 'Already following this community' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $push: { members: userIdToUse },
      $inc: { no_of_followers: 1 },
    });

    res.json({ 
      message: 'Successfully followed community',
      success: true,
      communityId: communityId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Unfollow Community 
export const unfollowCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body; // Get userId from request body instead of auth

    // Handle dummy community IDs
    if (communityId.startsWith('discover-') || communityId.startsWith('owned-')) {
      // For dummy communities, just return success
      return res.json({ 
        message: 'Successfully unfollowed community',
        success: true,
        communityId: communityId
      });
    }

    // For real communities in database
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Use userId from request body or default
    const userIdToUse = userId || 'dummy-user-id-123';

    // Check if not following
    if (!community.members.includes(userIdToUse)) {
      return res.status(400).json({ message: 'Not following this community' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $pull: { members: userIdToUse },
      $inc: { no_of_followers: -1 },
    });

    res.json({ 
      message: 'Successfully unfollowed community',
      success: true,
      communityId: communityId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Update Community Settings
export const updateCommunitySettings = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { visible, moderation } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Remove auth check - anyone can update settings now

    const updateData = {};
    if (visible) updateData.visible = visible;
    if (moderation) updateData.moderation = moderation;

    const updatedCommunity = await Community.findByIdAndUpdate(communityId, updateData, {
      new: true,
    });

    res.json({
      message: 'Community settings updated successfully',
      community: updatedCommunity,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Add Moderator 
export const addModerator = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body; // Get userId from request body instead of username lookup

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Remove auth check - anyone can add moderators now

    const userIdToAdd = userId || 'dummy-moderator-id-123';

    // Check if already a moderator
    if (community.moderators.includes(userIdToAdd)) {
      return res.status(400).json({ message: 'User is already a moderator' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $push: { moderators: userIdToAdd },
    });

    res.json({ message: 'Moderator added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Remove Moderator
export const removeModerator = async (req, res) => {
  try {
    const { communityId, userId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Remove auth check - anyone can remove moderators now

    await Community.findByIdAndUpdate(communityId, {
      $pull: { moderators: userId },
    });

    res.json({ message: 'Moderator removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Get All Communities (simplified version without user-specific data)
export const getAllCommunities = async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = {};
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];
    }
    
    const communities = await Community.find(query)
      .sort({ createdAt: -1 });

    res.json({
      communities: communities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Get User's Communities
export const getUserCommunities = async (req, res) => {
  try {
    const { userId } = req.params || req.body; // Get userId from params or body
    const { search } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    let query = { user_id: userId };
    let memberQuery = { members: userId };
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];
      memberQuery.$or = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];
      // Keep the member condition
      memberQuery.$and = [
        { members: userId },
        { $or: memberQuery.$or }
      ];
      delete memberQuery.$or;
    }
    
    const ownedCommunities = await Community.find(query)
      .sort({ createdAt: -1 });

    const followedCommunities = await Community.find(memberQuery)
      .sort({ createdAt: -1 });

    res.json({
      owned: ownedCommunities,
      followed: followedCommunities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};