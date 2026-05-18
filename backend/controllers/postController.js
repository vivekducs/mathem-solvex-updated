const Post = require('../models/Post');
const cloudinary = require('../config/cloudinary');
const { deleteCloudinaryImage, extractCloudinaryUrlsFromHtml } = require('../utils/cloudinaryUtils');


// Helper: slugify title consistently
const generateSlug = (title = '') =>
  title
    .toString()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// GET /api/posts  (public list)
exports.getPosts = async (req, res) => {
  try {
    // Optional basic pagination
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    // Projection: small card data (fast)
    const projection = 'title slug category featuredImage createdAt updatedAt';
    const [posts, total] = await Promise.all([
      Post.find({}, projection, { lean: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments({})
    ]);

    res.set('Cache-Control', 'public, max-age=60'); // 60s cache OK for list
    res.status(200).json({ posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error('getPosts error:', e);
    res.status(500).json({ message: 'Server error fetching posts' });
  }
};

// GET /api/posts/id/:id  (admin edit view)
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id, {}, { lean: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.set('Cache-Control', 'no-store');
    res.status(200).json(post);
  } catch (e) {
    console.error('getPostById error:', e);
    res.status(500).json({ message: 'Server error fetching post' });
  }
};

// GET /api/posts/:slug  (public detail)
exports.getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }, {}, { lean: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache OK for public page
    res.status(200).json(post);
  } catch (e) {
    console.error('getPostBySlug error:', e);
    res.status(500).json({ message: 'Server error fetching post' });
  }
};

// POST /api/posts  (admin create)
exports.createPost = async (req, res) => {
  try {
    const { title, content, category, metaDescription, keywords, videoURL } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Title, content, and category are required.' });
    }

    const slug = generateSlug(title);

    // slug uniqueness
    const slugExists = await Post.exists({ slug });
    if (slugExists) {
      return res.status(400).json({ message: 'A post with this title already exists. Please choose a unique title.' });
    }

    const postData = {
      title,
      content,
      slug,
      category,
      metaDescription,
      keywords: Array.isArray(keywords)
        ? keywords
        : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : []),
      author: req.user?.username || 'Maarula Classes',
      videoURL
    };

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      postData.featuredImage = result.secure_url;
    }

    const newPost = await Post.create(postData);
    res.status(201).json(newPost);
  } catch (e) {
    console.error('createPost error:', e);
    res.status(500).json({ message: 'Server error creating post' });
  }
};

// PUT /api/posts/:id  (admin update)
exports.updatePost = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Normalize keywords
    if (updateData.keywords) {
      updateData.keywords = Array.isArray(updateData.keywords)
        ? updateData.keywords
        : updateData.keywords.split(',').map(k => k.trim()).filter(Boolean);
    }

    // If title changes, regenerate slug and check uniqueness (excluding current doc)
    if (updateData.title) {
      const newSlug = generateSlug(updateData.title);
      const exists = await Post.exists({ slug: newSlug, _id: { $ne: req.params.id } });
      if (exists) {
        return res.status(400).json({ message: 'Another post already uses that title/slug.' });
      }
      updateData.slug = newSlug;
    }

    // If content changes, find orphaned images
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (updateData.content) {
      const oldUrls = extractCloudinaryUrlsFromHtml(post.content);
      const newUrls = extractCloudinaryUrlsFromHtml(updateData.content);
      const orphanedUrls = oldUrls.filter(url => !newUrls.includes(url));
      for (const url of orphanedUrls) {
        await deleteCloudinaryImage(url);
      }
    }

    // New featured image
    if (req.file) {
      if (post.featuredImage) {
        await deleteCloudinaryImage(post.featuredImage);
      }
      const result = await cloudinary.uploader.upload(req.file.path);
      updateData.featuredImage = result.secure_url;
    }

    const updated = await Post.findByIdAndUpdate(req.params.id, updateData, { new: true, lean: true });
    res.status(200).json(updated);

  } catch (e) {
    console.error('updatePost error:', e);
    res.status(500).json({ message: 'Server error updating post' });
  }
};

// DELETE /api/posts/:id  (admin delete)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.featuredImage) {
      await deleteCloudinaryImage(post.featuredImage);
    }
    const contentUrls = extractCloudinaryUrlsFromHtml(post.content);
    for (const url of contentUrls) {
      await deleteCloudinaryImage(url);
    }

    await post.deleteOne();
    res.status(200).json({ message: 'Post deleted successfully' });

  } catch (e) {
    console.error('deletePost error:', e);
    res.status(500).json({ message: 'Server error deleting post' });
  }
};

// POST /api/posts/upload-image  (admin editor images)
exports.uploadEditorImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided.' });
    const result = await cloudinary.uploader.upload(req.file.path);
    res.status(200).json({ location: result.secure_url });
  } catch (e) {
    console.error('Editor image upload error:', e);
    res.status(500).json({ message: 'Server error during image upload.' });
  }
};
