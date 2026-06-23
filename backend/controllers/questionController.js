const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const Question = require('../models/Question.js'); // Ensure this path is correct
const cloudinary = require('../config/cloudinary.js'); // Your specified path
const { deleteCloudinaryImage } = require('../utils/cloudinaryUtils.js');


// ─── Application-level in-memory cache ───────────────────────────────────────
// Significantly reduces MongoDB load for high-traffic public endpoints.
const cache = new NodeCache({
  stdTTL: 300,           // default: 5 minutes
  checkperiod: 120,      // check for expired keys every 2 min
  useClones: false,      // return references for speed (we never mutate cache values)
});

// Cache key builders
const publicQuestionsKey = (q) => `pubQ:${JSON.stringify(q)}`;
const publicByIdKey      = (id) => `pubById:${id}`;
const relatedKey         = (id) => `related:${id}`;
const FILTER_KEY         = 'filterOptions';

// Invalidate all public caches on any write
const bustCache = () => cache.flushAll();

// Helper for cache headers
const setCache = (res, seconds = 60, sMax = 300) => {
    res.set('Cache-Control', `public, max-age=${seconds}, s-maxage=${sMax}, stale-while-revalidate=600`);
};

// Helper for deleting old images from Cloudinary now imported from utils


/**
 * GET /api/questions (Admin/Protected)
 * Paginated list with advanced filters, search, and sorting.
 * Assumes `Question.paginate` is available from mongoose-paginate-v2.
 */
exports.getQuestions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10, // Default limit
            search = '',
            exam,
            subject,
            topic, // Added topic filter
            year,
            sortField = 'updatedAt', // Default sort field
            sortOrder = -1 // -1 for descending (latest first), 1 for ascending
        } = req.query;

        const query = {};

        // Build search query (optimized for text index if available, otherwise regex)
        if (search) {
            const isNumericSearch = !isNaN(search) && search.trim() !== '';
            if (isNumericSearch) {
                query.questionNumber = parseInt(search);
            } else {
                query.$or = [
                    { questionText: { $regex: search, $options: 'i' } },
                    { subject: { $regex: search, $options: 'i' } },
                    { topic: { $regex: search, $options: 'i' } },
                    { 'options.text': { $regex: search, $options: 'i' } }, // Search within option texts
                ];
            }
        }

        // Add filters
        if (exam) query.exam = exam;
        if (subject) query.subject = { $regex: subject, $options: 'i' };
        if (topic) query.topic = { $regex: topic, $options: 'i' };
        if (year) query.year = parseInt(year);

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortField]: parseInt(sortOrder) },
            lean: true, // Return plain JavaScript objects
        };

        const result = await Question.paginate(query, options);

        res.status(200).json({
            questions: result.docs,
            totalDocs: result.totalDocs,
            limit: result.limit,
            page: result.page,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
            nextPage: result.nextPage,
            prevPage: result.prevPage,
        });

    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ message: 'Server error while fetching questions.' });
    }
};

exports.getPublicQuestions = async (req, res) => {
    // ── cache check ──────────────────────────────────────────────────────────
    const cacheKey = publicQuestionsKey(req.query);
    const hit = cache.get(cacheKey);
    if (hit) {
        setCache(res, 120, 600);
        return res.status(200).json(hit);
    }
    try {
        const page = parseInt(req.query.page || 1);
        const limit = parseInt(req.query.limit || 10); // This will now correctly be overridden by frontend

        const query = {};
        // Add your filter logic back in here, based on req.query
        // Example:
        if (req.query.exam) query.exam = req.query.exam;
        if (req.query.subject) query.subject = { $regex: req.query.subject, $options: 'i' };
        if (req.query.topic) query.topic = { $regex: req.query.topic, $options: 'i' };
        if (req.query.year) query.year = parseInt(req.query.year);
        if (req.query.search) {
            query.$or = [
                { questionText: { $regex: req.query.search, $options: 'i' } },
                { 'options.text': { $regex: req.query.search, $options: 'i' } },
                // Add questionNumber search if applicable
                ...(!isNaN(parseInt(req.query.search)) && parseInt(req.query.search).toString() === req.query.search
                    ? [{ questionNumber: parseInt(req.query.search) }]
                    : [])
            ];
        }


        // Use a robust sort, defaulting to latest by _id or createdAt
        let sortOptions = { _id: -1 }; // Default for public API
        // If you want client-side sort control (e.g., /questions/public?sort=questionNumber)
        if (req.query.sort) {
            if (req.query.sort === 'questionNumber') sortOptions = { questionNumber: 1, _id: 1 };
            else if (req.query.sort === '-questionNumber') sortOptions = { questionNumber: -1, _id: -1 };
            else if (req.query.sort === 'createdAt') sortOptions = { createdAt: 1, _id: 1 };
            else if (req.query.sort === '-createdAt') sortOptions = { createdAt: -1, _id: -1 };
        }


        let selectString = '-__v -updatedAt -explanationText -explanationImageURL -videoURL -correctOption';
        if (req.query.noOptions === 'true') {
            selectString += ' -options';
        }

        const options = {
            page: page,
            limit: limit,
            sort: sortOptions,
            select: selectString,
            lean: true,
        };

        const result = await Question.paginate(query, options);

        const payload = {
            questions: result.docs,
            totalDocs: result.totalDocs,
            limit: result.limit,
            page: result.page,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
            nextPage: result.nextPage,
            prevPage: result.prevPage,
        };
        cache.set(cacheKey, payload, 300); // 5-min cache
        setCache(res, 120, 600);
        res.status(200).json(payload);

    } catch (error) {
        console.error('Error fetching public questions:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * GET /api/questions/public/:id (Public)
 * Fetches a single question by ID for public view (without sensitive data).
 * (Added this for completeness, often needed for student view of a single question)
 */

exports.getPublicQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    // ── cache check ────────────────────────────────────────────────────────
    const cacheKey = publicByIdKey(id);
    const hit = cache.get(cacheKey);
    if (hit) {
      setCache(res, 120, 600);
      return res.status(200).json(hit);
    }

    // Public projection: keep what the student page needs; hide only internal meta
    const projection = '-__v'; // keep createdAt/updatedAt for SEO; expose options + isCorrect, explanation & video

    const question = await Question.findById(id).select(projection).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (!Array.isArray(question.options)) question.options = [];

    cache.set(cacheKey, question, 600); // 10-min cache
    setCache(res, 120, 600);
    return res.status(200).json(question);
  } catch (error) {
    console.error('Error fetching public question by ID:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * POST /api/questions (Admin/Protected)
 * Creates a new question with image uploads.
 */
exports.createQuestion = async (req, res) => {
    try {
        const { exam, subject, topic, year, questionText, options, explanationText, videoURL, difficulty } = req.body;
        let questionImageURL = '';
        let explanationImageURL = '';
        const parsedOptions = JSON.parse(options || '[]'); // Ensure options is parsed safely

        // Basic server-side validation (Mongoose schema will provide more detail)
        if (!exam || !subject || !topic || !questionText || parsedOptions.length === 0) {
            return res.status(400).json({ message: 'Missing required fields for question creation.' });
        }
        if (!parsedOptions.some(opt => opt.isCorrect)) {
            return res.status(400).json({ message: 'At least one option must be marked as correct.' });
        }
        if (parsedOptions.length < 2) {
             return res.status(400).json({ message: 'A question must have at least two options.' });
        }

        // Upload question image if provided
        // req.files structure from uploadMiddleware: { questionImage: [{ path: '...' }], explanationImage: [{ path: '...' }], ... }
        if (req.files && req.files.questionImage && req.files.questionImage.length > 0) {
            const result = await cloudinary.uploader.upload(req.files.questionImage[0].path, {
                folder: 'maarula-questions'
            });
            questionImageURL = result.secure_url;
        }

        // Upload explanation image if provided
        if (req.files && req.files.explanationImage && req.files.explanationImage.length > 0) {
            const result = await cloudinary.uploader.upload(req.files.explanationImage[0].path, {
                folder: 'maarula-explanations'
            });
            explanationImageURL = result.secure_url;
        }

        // Upload images for options if provided
        for (let i = 0; i < parsedOptions.length; i++) {
            const optionImageKey = `option_${i}_image`;
            if (req.files && req.files[optionImageKey] && req.files[optionImageKey].length > 0) {
                const result = await cloudinary.uploader.upload(req.files[optionImageKey][0].path, {
                    folder: `maarula-options`
                });
                parsedOptions[i].imageURL = result.secure_url;
            }
        }

        const newQuestion = new Question({
            // questionNumber will be set by the pre('save') hook in the Question model
            exam,
            subject,
            topic,
            year: year ? Number(year) : undefined,
            questionText,
            questionImageURL,
            options: parsedOptions,
            explanationText,
            explanationImageURL,
            videoURL,
            difficulty: difficulty || 'Medium', // Use provided difficulty or default
        });

        await newQuestion.save(); // This triggers the pre('save') hook for questionNumber generation
        bustCache(); // invalidate public caches
        res.status(201).json(newQuestion);

    } catch (error) {
        console.error('Error creating question:', error);

        if (error.code === 11000 && error.keyPattern && error.keyPattern.questionNumber) {
            return res.status(409).json({ message: 'A unique question number could not be assigned. Please try again.', details: error.keyValue });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation failed', errors: errors });
        }
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Admin/Protected: GET /api/questions/:id
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const question = await Question.findById(id).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    setCache(res, 120, 600);
    return res.status(200).json(question);
  } catch (error) {
    console.error('Error fetching question by ID:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * PUT /api/questions/:id (Admin/Protected)
 * Updates an existing question with image handling (upload new, delete old/clear).
 */
exports.updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid question ID' });
        }

        const {
            exam, subject, topic, year, questionText, options,
            explanationText, videoURL, difficulty,
            clearQuestionImage, clearExplanationImage,
            // clearOption_X_Image flags will be checked dynamically
        } = req.body;
        const parsedOptions = JSON.parse(options || '[]');

        // Fetch existing question
        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found.' });
        }

        // --- Update scalar fields ---
        question.exam = exam;
        question.subject = subject;
        question.topic = topic;
        if (year) {
            question.year = Number(year);
        } else {
            question.year = undefined;
        }
        question.questionText = questionText;
        question.explanationText = explanationText;
        question.videoURL = videoURL;
        question.difficulty = difficulty || 'Medium';

        // --- Handle main question image ---
        if (req.files && req.files.questionImage && req.files.questionImage.length > 0) { // New image uploaded
            await deleteCloudinaryImage(question.questionImageURL);
            const result = await cloudinary.uploader.upload(req.files.questionImage[0].path, {
                folder: 'maarula-questions'
            });
            question.questionImageURL = result.secure_url;
        } else if (clearQuestionImage === 'true' && question.questionImageURL) {
            // Frontend explicitly says to clear the image
            await deleteCloudinaryImage(question.questionImageURL);
            question.questionImageURL = '';
        }

        // --- Handle explanation image ---
        if (req.files && req.files.explanationImage && req.files.explanationImage.length > 0) { // New image uploaded
            await deleteCloudinaryImage(question.explanationImageURL);
            const result = await cloudinary.uploader.upload(req.files.explanationImage[0].path, {
                folder: 'maarula-explanations'
            });
            question.explanationImageURL = result.secure_url;
        } else if (clearExplanationImage === 'true' && question.explanationImageURL) {
            // Frontend explicitly says to clear the image
            await deleteCloudinaryImage(question.explanationImageURL);
            question.explanationImageURL = '';
        }

        // --- Handle options (including their images) ---
        const finalOptions = [];
        const oldOptionImageMap = new Map(question.options.map((opt, idx) => [`option_${idx}`, opt.imageURL])); // Map old images by original index

        for (let i = 0; i < parsedOptions.length; i++) {
            const newOptionData = { ...parsedOptions[i] }; // Clone to avoid modifying original parsed data
            const optionImageKey = `option_${i}_image`;
            const oldImageUrlForThisIndex = oldOptionImageMap.get(`option_${i}`);

            // 1. Handle new option image upload
            if (req.files && req.files[optionImageKey] && req.files[optionImageKey].length > 0) {
                if (oldImageUrlForThisIndex) { // Delete old image if it existed for this option
                    await deleteCloudinaryImage(oldImageUrlForThisIndex); 
                }
                const result = await cloudinary.uploader.upload(req.files[optionImageKey][0].path, {
                    folder: `maarula-options`
                });
                newOptionData.imageURL = result.secure_url;
            } 
            // 2. Handle explicit clear request from frontend
            else if (req.body[`clearOption_${i}_Image`] === 'true' && (newOptionData.imageURL || oldImageUrlForThisIndex)) {
                 await deleteCloudinaryImage(newOptionData.imageURL || oldImageUrlForThisIndex);
                 newOptionData.imageURL = ''; // Clear the URL in the data
            }
            // 3. If no new upload and no clear, retain existing image URL from parsedOptions
            // This is already handled by `newOptionData = { ...parsedOptions[i] }` if the frontend sends it back.
            // If the frontend *doesn't* send back the imageURL when it hasn't changed, 
            // you might need additional logic here to re-add the oldImageUrlForThisIndex if `newOptionData.imageURL` is empty.
            // For now, assuming frontend sends back existing image URLs if not changed/cleared.

            finalOptions.push(newOptionData);
        }

        // Logic to delete images for options that were completely removed (not just updated)
        const currentImageUrlsInDB = new Set(question.options.map(opt => opt.imageURL).filter(Boolean));
        const finalImageUrls = new Set(finalOptions.map(opt => opt.imageURL).filter(Boolean));
        
        for (const url of currentImageUrlsInDB) {
            if (!finalImageUrls.has(url)) { // If an old image URL is no longer in the final options
                await deleteCloudinaryImage(url);
            }
        }

        question.options = finalOptions; // Replace with the updated options array

        await question.save(); // This will not trigger pre('save') for questionNumber as `isNew` is false
        bustCache(); // invalidate public caches
        res.status(200).json(question);

    } catch (error) {
        console.error('Error updating question:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation failed', errors: errors });
        }
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * DELETE /api/questions/:id (Admin/Protected)
 * Deletes a question and its associated images from Cloudinary.
 */
exports.deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid question ID' });
        }
        const question = await Question.findById(id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found.' });
        }

        // Delete associated images from Cloudinary before deleting the question
        await deleteCloudinaryImage(question.questionImageURL);
        await deleteCloudinaryImage(question.explanationImageURL);
        for (const option of question.options) {
            await deleteCloudinaryImage(option.imageURL);
        }

        await Question.findByIdAndDelete(id);
        bustCache(); // invalidate public caches
        res.status(200).json({ message: 'Question deleted successfully.' });

    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * GET /api/questions/stats (Admin/Protected)
 * Gets dashboard statistics.
 */
exports.getQuestionStats = async (req, res) => {
    try {
        const [totalQuestions, subjects, exams] = await Promise.all([
            Question.estimatedDocumentCount(),
            Question.distinct('subject', { subject: { $ne: null, $ne: '' } }),
            Question.distinct('exam', { exam: { $ne: null, $ne: '' } })
        ]);
        setCache(res, 300, 900);
        res.status(200).json({
            totalQuestions,
            totalSubjects: subjects.length,
            totalExams: exams.length
        });
    } catch (error) {
        console.error('Error fetching question stats:', error);
        res.status(500).json({ message: 'Server Error while fetching stats' });
    }
};

/**
 * GET /api/questions/filters (Public/Admin)
 * Gets unique values for filter dropdowns.
 */
exports.getFilterOptions = async (req, res) => {
    try {
        // ── cache check ──────────────────────────────────────────────────────
        const hit = cache.get(FILTER_KEY);
        if (hit) {
            setCache(res, 3600, 7200);
            return res.status(200).json(hit);
        }

        const [subjects, topics, exams, years] = await Promise.all([
            Question.distinct('subject', { subject: { $ne: null, $ne: '' } }),
            Question.distinct('topic', { topic: { $ne: null, $ne: '' } }),
            Question.distinct('exam', { exam: { $ne: null, $ne: '' } }),
            Question.distinct('year', { year: { $ne: null } })
        ]);

        const payload = {
            subjects: subjects.sort(),
            topics: topics.sort(),
            exams: exams.sort(),
            years: years.sort((a, b) => b - a)
        };
        cache.set(FILTER_KEY, payload, 3600); // 1-hour cache
        setCache(res, 3600, 7200);
        res.status(200).json(payload);
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * GET /api/questions/:id/related (Public/Admin)
 * Gets related questions based on topic and exam.
 */
exports.getRelatedQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid question ID' });
        }

        // ── cache check ──────────────────────────────────────────────────────
        const cacheKey = relatedKey(id);
        const hit = cache.get(cacheKey);
        if (hit) {
            setCache(res, 300, 900);
            return res.status(200).json(hit);
        }

        const original = await Question.findById(id, { topic: 1, exam: 1 }).lean();
        if (!original) return res.status(404).json({ message: 'Original question not found' });

        const related = await Question.find(
            { topic: original.topic, exam: original.exam, _id: { $ne: id } },
            { questionText: 1, exam: 1, subject: 1, topic: 1 }
        )
            .limit(5)
            .lean();

        cache.set(cacheKey, related, 600); // 10-min cache
        setCache(res, 300, 900);
        res.status(200).json(related);
    } catch (error) {
        console.error('Error fetching related questions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};