const mongoose = require('mongoose');

const TaxonomySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        enum: ['exam', 'subject', 'category'],
    },
    options: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Taxonomy', TaxonomySchema);
