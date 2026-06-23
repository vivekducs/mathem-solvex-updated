const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2'); // Make sure this is installed and present
const Counter = require('./Counter'); // Ensure this path is correct

const OptionSchema = new mongoose.Schema({
    text: {
        type: String,
        trim: true
    },
    imageURL: {
        type: String,
        trim: true
    },
    isCorrect: {
        type: Boolean,
        default: false
    }
}, { _id: false }); // Do not create _id for subdocuments if not needed

const QuestionSchema = new mongoose.Schema({
    questionNumber: {
        type: Number,
        unique: true, // This is crucial for the error you're seeing
        index: true // Helps with performance and uniqueness check
    },
    exam: {
        type: String,
        required: [true, 'Exam name is required'],
        trim: true
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true
    },
    topic: {
        type: String,
        required: [true, 'Topic is required'],
        trim: true
    },
    questionType: {
        type: String,
        default: 'PYQ'
    },
    year: {
        type: Number,
        min: [1900, 'Year must be at least 1900'],
        max: [new Date().getFullYear(), 'Year cannot be in the future']
    },
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    questionImageURL: {
        type: String,
        trim: true
    },
    options: {
        type: [OptionSchema],
        required: [true, 'Options are required'],
        validate: {
            validator: function(v) {
                return v && v.length >= 2 && v.some(opt => opt.isCorrect);
            },
            message: 'A question must have at least two options, and at least one must be marked as correct.'
        }
    },
    explanationText: {
        type: String,
        trim: true
    },
    explanationImageURL: {
        type: String,
        trim: true
    },
    videoURL: {
        type: String,
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// IMPORTANT: This pre-save hook generates the questionNumber
QuestionSchema.pre('save', async function (next) {
    if (this.isNew && !this.questionNumber) { // Only run for new documents if questionNumber is not already set
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'questionNumber' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true } // upsert: true creates the document if it doesn't exist
            );
            this.questionNumber = counter.seq;
            next();
        } catch (error) {
            console.error('Error generating questionNumber:', error);
            next(error); // Pass the error to the next middleware
        }
    } else {
        next();
    }
});

// Add text index for searching
QuestionSchema.index({ questionText: 'text', subject: 'text', topic: 'text', 'options.text': 'text' });

// Add regular indexes for exact matches, filtering, and typical queries
QuestionSchema.index({ exam: 1, subject: 1, topic: 1 });
QuestionSchema.index({ subject: 1 });
QuestionSchema.index({ topic: 1 });
QuestionSchema.index({ year: -1 });
QuestionSchema.index({ questionType: 1 });

// Add pagination plugin
QuestionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Question', QuestionSchema);