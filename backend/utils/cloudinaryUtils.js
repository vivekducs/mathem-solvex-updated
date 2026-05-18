const cloudinary = require('../config/cloudinary');

const extractPublicId = (url) => {
    if (!url || typeof url !== 'string') return null;
    try {
        const urlParts = url.split('/upload/');
        if (urlParts.length !== 2) return null;
        let path = urlParts[1];
        // remove version e.g., v1234567/
        if (path.match(/^v\d+\//)) {
            path = path.replace(/^v\d+\//, '');
        }
        // remove extension
        const lastDotIndex = path.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            path = path.substring(0, lastDotIndex);
        }
        return path;
    } catch (e) {
        return null;
    }
};

const deleteCloudinaryImage = async (url) => {
    const publicId = extractPublicId(url);
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`Deleted Cloudinary image: ${publicId}`);
    } catch (error) {
        console.error(`Failed to delete Cloudinary image ${publicId}:`, error);
    }
};

const extractCloudinaryUrlsFromHtml = (html) => {
    if (!html || typeof html !== 'string') return [];
    const urls = [];
    // Basic regex to find src="..." matching cloudinary
    const regex = /src=["'](https:\/\/res\.cloudinary\.com\/[^"']+)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        urls.push(match[1]);
    }
    return urls;
};

module.exports = {
    extractPublicId,
    deleteCloudinaryImage,
    extractCloudinaryUrlsFromHtml
};
