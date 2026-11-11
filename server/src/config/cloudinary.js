import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export const cloudinaryEnabled = env.cloudinaryEnabled;

/** Streams an in-memory buffer to Cloudinary. Resolves with Cloudinary's upload result. */
export function uploadImageBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.folder,
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}
