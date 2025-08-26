import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MulterConfig: MulterOptions = {
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
};
