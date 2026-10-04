'use strict';
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { auth } = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Upload image to Cloudinary
router.post('/image', auth, upload.single('image'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image provided' });
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: 'property_images' },
    (error, result) => {
      if (error) {
        return res.status(500).json({ success: false, message: 'Cloudinary upload failed', error });
      }
      res.status(200).json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id
        }
      });
    }
  );

  uploadStream.end(req.file.buffer);
});

// Delete image from Cloudinary
router.delete('/image/:publicId(*)', auth, async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'ok' || result.result === 'not found') {
      res.status(200).json({ success: true, message: 'Image deleted' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to delete image', result });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
