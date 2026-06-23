const Taxonomy = require('../models/Taxonomy');

const initializeDefaultTaxonomies = async () => {
    const defaults = {
        exam: ['NIMCET', 'CUET PG', 'MAH-CET', 'JAMIA', 'JEE', 'IGDTUW', 'NDA', 'AMU'],
        subject: ['Mathematics', 'Computer', 'Logical Reasoning', 'English'],
        category: ['PYQ', 'Important', 'Practice']
    };

    for (const [type, options] of Object.entries(defaults)) {
        const existing = await Taxonomy.findOne({ type });
        if (!existing) {
            await Taxonomy.create({ type, options });
        }
    }
};

// Initialize defaults on controller load if missing
initializeDefaultTaxonomies().catch(console.error);

exports.getAllTaxonomies = async (req, res) => {
    try {
        const taxonomies = await Taxonomy.find();
        const formatted = {};
        taxonomies.forEach(t => {
            formatted[t.type] = t.options;
        });
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching taxonomies:', error);
        res.status(500).json({ message: 'Server error fetching taxonomies.' });
    }
};

exports.addOption = async (req, res) => {
    try {
        const { type } = req.params;
        const { option } = req.body;

        if (!option || !option.trim()) {
            return res.status(400).json({ message: 'Option text is required.' });
        }

        const taxonomy = await Taxonomy.findOneAndUpdate(
            { type },
            { $addToSet: { options: option.trim() } },
            { new: true, upsert: true }
        );

        res.json(taxonomy.options);
    } catch (error) {
        console.error('Error adding taxonomy option:', error);
        res.status(500).json({ message: 'Server error adding option.' });
    }
};

exports.removeOption = async (req, res) => {
    try {
        const { type, option } = req.params;

        const taxonomy = await Taxonomy.findOneAndUpdate(
            { type },
            { $pull: { options: option } },
            { new: true }
        );

        if (!taxonomy) {
            return res.status(404).json({ message: 'Taxonomy type not found.' });
        }

        res.json(taxonomy.options);
    } catch (error) {
        console.error('Error removing taxonomy option:', error);
        res.status(500).json({ message: 'Server error removing option.' });
    }
};
