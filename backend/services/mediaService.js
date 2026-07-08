/**
 * mediaService.js — core upload / retrieval / deletion logic.
 *
 * Designed for easy cloud-storage migration:
 *  - Replace the `uploadToCloudinary` function with an S3/Azure equivalent.
 *  - Everything else (validation, metadata, DB ops) stays untouched.
 */

const path      = require('path');
const crypto    = require('crypto');
const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const Media      = require('../models/Media');

// ── Allowed MIME types → semantic fileType ────────────────────────────────────
const MIME_MAP = {
  // Images
  'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image',
  'image/webp': 'image', 'image/svg+xml': 'image', 'image/bmp': 'image',
  'image/tiff': 'image',
  // Videos
  'video/mp4': 'video', 'video/webm': 'video', 'video/ogg': 'video',
  'video/quicktime': 'video', 'video/x-msvideo': 'video', 'video/mpeg': 'video',
  // Audio
  'audio/mpeg': 'audio', 'audio/ogg': 'audio', 'audio/wav': 'audio',
  'audio/webm': 'audio', 'audio/aac': 'audio', 'audio/flac': 'audio',
  'audio/mp4': 'audio',
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  // Archives
  'application/zip': 'archive', 'application/x-zip-compressed': 'archive',
  'application/x-rar-compressed': 'archive', 'application/x-7z-compressed': 'archive',
  'application/x-tar': 'archive', 'application/gzip': 'archive',
  // Text
  'text/plain': 'text', 'text/csv': 'text', 'text/markdown': 'text',
};

const MAX_FILE_SIZE  = 100 * 1024 * 1024;  // 100 MB
const MAX_IMAGE_SIZE = 20  * 1024 * 1024;  // 20 MB for images (Cloudinary free limit)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stable chatId from any two user IDs */
function buildChatId(uid1, uid2) {
  return [uid1.toString(), uid2.toString()].sort().join('_');
}

/** Crypto-random unique filename, preserving the original extension */
function generateFileName(originalName) {
  const ext  = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(12).toString('hex');
  return `${Date.now()}_${hash}${ext}`;
}

/** Resolve semantic file type; unknown MIMEs go to 'other' */
function resolveFileType(mimeType) {
  return MIME_MAP[mimeType] || 'other';
}

/** Map semantic type → Cloudinary resource_type */
function cloudinaryResourceType(fileType) {
  if (fileType === 'image') return 'image';
  if (fileType === 'video' || fileType === 'audio') return 'video';
  return 'raw';
}

/** Pipe a Buffer through Cloudinary upload_stream → returns Cloudinary result */
function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

/** Build an optimised thumbnail URL for an already-uploaded asset */
function buildThumbnailUrl(publicId, fileType) {
  if (fileType === 'image') {
    return cloudinary.url(publicId, {
      width: 400, height: 300, crop: 'fill',
      quality: 'auto', fetch_format: 'auto',
    });
  }
  if (fileType === 'video') {
    // Cloudinary auto-generates a JPG poster from the first video frame
    return cloudinary.url(publicId, {
      resource_type: 'video', format: 'jpg',
      width: 400, height: 300, crop: 'fill', quality: 'auto',
    });
  }
  return null;
}

// ── Core upload ───────────────────────────────────────────────────────────────

/**
 * uploadMedia — validates, uploads to Cloudinary, persists metadata.
 *
 * @param {Buffer}  buffer
 * @param {string}  originalname
 * @param {string}  mimetype
 * @param {number}  size  (bytes)
 * @param {string}  senderId
 * @param {string}  receiverId
 * @returns {Promise<Media>}
 */
async function uploadMedia({ buffer, originalname, mimetype, size, senderId, receiverId }) {
  // ── Validation ──────────────────────────────────────────────
  const fileType = resolveFileType(mimetype);

  const maxBytes = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    throw new Error(`File too large. Maximum size for ${fileType} is ${mb} MB.`);
  }

  // ── Cloudinary upload ───────────────────────────────────────
  const chatId   = buildChatId(senderId, receiverId);
  const fileName = generateFileName(originalname);
  const publicId = fileName.replace(/\.[^/.]+$/, '');          // strip ext for public_id
  const resourceType = cloudinaryResourceType(fileType);

  const uploadResult = await uploadBufferToCloudinary(buffer, {
    folder:        `syncsphere/chat/${chatId}`,
    public_id:     publicId,
    resource_type: resourceType,
    use_filename:  false,
    overwrite:     false,
    // Auto-tag for easy admin cleanup
    tags:          [`chat_${chatId}`, `type_${fileType}`],
  });

  // ── Thumbnail ───────────────────────────────────────────────
  const thumbnailUrl  = buildThumbnailUrl(uploadResult.public_id, fileType);
  const thumbnailPath = (fileType === 'image' || fileType === 'video')
    ? uploadResult.public_id : null;

  // ── Persist metadata ────────────────────────────────────────
  const media = await Media.create({
    senderId, receiverId, chatId,
    originalFileName: originalname,
    fileName,
    fileType,
    mimeType: mimetype,
    fileSize: size,
    storagePath:  uploadResult.public_id,
    storageUrl:   uploadResult.secure_url,
    thumbnailPath,
    thumbnailUrl,
    status: 'uploaded',
    uploadedAt: new Date(),
  });

  return media;
}

// ── Gallery retrieval ─────────────────────────────────────────────────────────

/**
 * getChatMedia — paginated, filtered, sorted gallery for a chat.
 *
 * @param {string} chatId
 * @param {string} [fileType='all']   'all' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'text' | 'other'
 * @param {number} [page=1]
 * @param {number} [limit=24]
 * @param {string} [sort='newest']    'newest' | 'oldest'
 * @param {string} [q='']             search query (matches originalFileName)
 */
async function getChatMedia({ chatId, fileType, page = 1, limit = 24, sort = 'newest', q = '' }) {
  const query = { chatId, status: 'uploaded' };
  if (fileType && fileType !== 'all') query.fileType = fileType;
  if (q) query.originalFileName = { $regex: q, $options: 'i' };

  const sortObj = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
  const skip    = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Media.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username name avatar'),
    Media.countDocuments(query),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit), limit };
}

// ── Deletion ──────────────────────────────────────────────────────────────────

async function deleteMedia(mediaId, userId) {
  const media = await Media.findById(mediaId);
  if (!media) throw new Error('Media not found');
  if (media.senderId.toString() !== userId.toString()) throw new Error('Unauthorized');

  const resourceType = cloudinaryResourceType(media.fileType);

  // Best-effort Cloudinary deletion — don't fail the whole request if it errors
  await cloudinary.uploader.destroy(media.storagePath, { resource_type: resourceType })
    .catch(err => console.warn('Cloudinary deletion warning:', err.message));

  await media.deleteOne();
  return true;
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  uploadMedia,
  getChatMedia,
  deleteMedia,
  buildChatId,
  resolveFileType,
  MIME_MAP,
  MAX_FILE_SIZE,
};
