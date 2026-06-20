import { Controller, Post, UseInterceptors, UploadedFile, UploadedFiles, UseGuards } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as fs from 'fs';

const storageOptions = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: storageOptions }))
  uploadFile(@UploadedFile() file: any) {
    if (!file) {
      return { url: null };
    }
    return {
      url: `/uploads/${file.filename}`,
      filename: file.originalname
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: storageOptions }))
  uploadMultipleFiles(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      return { files: [] };
    }
    return {
      files: files.map(file => ({
        url: `/uploads/${file.filename}`,
        filename: file.originalname
      }))
    };
  }
}
