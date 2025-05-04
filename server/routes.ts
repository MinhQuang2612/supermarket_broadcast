import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import * as mm from "music-metadata";
import { 
  insertSupermarketSchema, 
  insertAudioFileSchema, 
  insertBroadcastProgramSchema,
  insertPlaylistSchema,
  insertBroadcastAssignmentSchema,
  audioFiles
} from "@shared/schema";
import { eq } from "drizzle-orm";

// Configure multer for file uploads
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Sanitize filename
      const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9\-_.]/g, '_')}`;
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only accept audio files
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận các file âm thanh MP3, WAV, hoặc OGG'));
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  }
});

// Configure multer for CSV uploads
const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file CSV'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Middleware to check if the user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Chưa đăng nhập" });
}

// Middleware to check if the user has admin role
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Không có quyền truy cập" });
}

// Middleware to check if the user has manager role or higher
function isManagerOrAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.role === "manager" || req.user.role === "admin")) {
    return next();
  }
  res.status(403).json({ message: "Không có quyền truy cập" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  setupAuth(app);

  // User management routes with pagination
  app.get("/api/users", isManagerOrAdmin, async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get role and status filters if provided
      const roleFilter = req.query.role as string;
      const statusFilter = req.query.status as string;
      
      // Get all users first
      const allUsers = await storage.getAllUsers();
      
      // Apply filters if provided
      let filteredUsers = allUsers;
      if (roleFilter && roleFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
      }
      
      const totalCount = filteredUsers.length;
      
      // Apply pagination
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);
      
      // Map users to return only the necessary fields
      const mappedUsers = paginatedUsers.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }));
      
      // Return with pagination metadata
      res.json({
        users: mappedUsers,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow admins/managers to view other users, regular users can only view themselves
      if (userId !== req.user.id && req.user.role !== "admin" && req.user.role !== "manager") {
        return res.status(403).json({ message: "Không có quyền xem thông tin người dùng khác" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      });
    } catch (error) {
      next(error);
    }
  });

  // Delete user (permanent) - Admin only
  app.delete("/api/users/:id", isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow admins to delete themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Không thể xóa tài khoản của chính mình" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      
      await storage.deleteUser(userId);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "delete_user",
        details: `Xóa vĩnh viễn tài khoản ${user.username} (${user.fullName})`,
      });
      
      res.status(200).json({ message: "Đã xóa người dùng thành công" });
    } catch (error) {
      next(error);
    }
  });

  // Activity logs - with server-side pagination
  app.get("/api/activity-logs", isAdmin, async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = (page - 1) * limit;
      
      // Get the last 30 days of logs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get total count of logs
      const allLogs = await storage.getActivityLogs(thirtyDaysAgo);
      const totalCount = allLogs.length;
      
      // Create paginated results
      const paginatedLogs = allLogs.slice(offset, offset + limit);
      
      // Return with pagination metadata
      res.json({
        logs: paginatedLogs,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Location routes - regions, provinces, communes
  app.get("/api/regions", isAuthenticated, async (req, res, next) => {
    try {
      const regions = await storage.getAllRegions();
      res.json(regions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/provinces", isAuthenticated, async (req, res, next) => {
    try {
      const { regionId } = req.query;
      let provinces;
      
      if (regionId && !isNaN(Number(regionId))) {
        provinces = await storage.getProvincesByRegion(Number(regionId));
      } else {
        provinces = await storage.getAllProvinces();
      }
      
      res.json(provinces);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/communes", isAuthenticated, async (req, res, next) => {
    try {
      const { provinceId } = req.query;
      let communes;
      
      if (provinceId && !isNaN(Number(provinceId))) {
        communes = await storage.getCommunesByProvince(Number(provinceId));
      } else {
        communes = await storage.getAllCommunes();
      }
      
      res.json(communes);
    } catch (error) {
      next(error);
    }
  });

  // Supermarket routes with pagination
  app.get("/api/supermarkets", isAuthenticated, async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get all supermarkets for total count
      const allSupermarkets = await storage.getAllSupermarkets();
      const totalCount = allSupermarkets.length;
      
      // Apply pagination
      const paginatedSupermarkets = allSupermarkets.slice(offset, offset + limit);
      
      // Return with pagination metadata
      res.json({
        supermarkets: paginatedSupermarkets,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Route to download sample supermarket template
  app.get("/api/supermarket-template", isAuthenticated, async (req, res, next) => {
    try {
      const filePath = path.join(process.cwd(), "mau_sieu_thi.csv");
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="mau_sieu_thi.csv"');
      
      // Send the file content
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Error downloading template:", error);
      next(error);
    }
  });
  
  // Import supermarkets from CSV file
  app.post("/api/supermarkets/import", isManagerOrAdmin, csvUpload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Không tìm thấy file" });
      }
      
      // Read file as string
      const fileContent = req.file.buffer.toString('utf8');
      const lines = fileContent.split('\n');
      
      // Must have a header and at least one data row
      if (lines.length < 2) {
        return res.status(400).json({ message: "File không có dữ liệu" });
      }
      
      // Parse header
      const header = lines[0].split(',').map(item => item.trim());
      const requiredFields = ['name', 'address', 'regionId', 'provinceId', 'communeId', 'status'];
      
      // Check if all required fields are in the header
      const missingFields = requiredFields.filter(field => !header.includes(field));
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `File thiếu các trường bắt buộc: ${missingFields.join(', ')}` 
        });
      }
      
      // Get all geographic data for lookups
      const regions = await storage.getAllRegions();
      const provinces = await storage.getAllProvinces();
      const communes = await storage.getAllCommunes();
      
      const supermarkets = [];
      const errors = [];
      
      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',').map(item => item.trim());
        if (values.length !== header.length) {
          errors.push(`Dòng ${i + 1}: Số lượng cột không khớp với header`);
          continue;
        }
        
        // Create a map of field names to values
        const rowData: Record<string, string> = {};
        header.forEach((field, index) => {
          rowData[field] = values[index];
        });
        
        // Validate regionId, provinceId, communeId
        const regionId = parseInt(rowData.regionId);
        const provinceId = parseInt(rowData.provinceId);
        const communeId = parseInt(rowData.communeId);
        
        // Validate that region exists
        const region = regions.find(r => r.id === regionId);
        if (!region) {
          errors.push(`Dòng ${i + 1}: Không tìm thấy khu vực với id "${regionId}"`);
          continue;
        }
        
        // Validate that province exists and belongs to the specified region
        const province = provinces.find(p => p.id === provinceId && p.regionId === regionId);
        if (!province) {
          errors.push(`Dòng ${i + 1}: Không tìm thấy tỉnh/thành phố với id "${provinceId}" trong khu vực id "${regionId}"`);
          continue;
        }
        
        // Validate that commune exists and belongs to the specified province
        const commune = communes.find(c => c.id === communeId && c.provinceId === provinceId);
        if (!commune) {
          errors.push(`Dòng ${i + 1}: Không tìm thấy quận/huyện/xã với id "${communeId}" trong tỉnh/thành phố id "${provinceId}"`);
          continue;
        }
        
        // Create supermarket object with the new geographic structure
        const supermarketData = {
          name: rowData.name,
          address: rowData.address,
          regionId: regionId,
          provinceId: provinceId,
          communeId: communeId,
          status: rowData.status || 'active' // Use provided status or default to active
        };
        
        // Validate the data
        const validation = insertSupermarketSchema.safeParse(supermarketData);
        if (!validation.success) {
          errors.push(`Dòng ${i + 1}: Dữ liệu không hợp lệ - ${validation.error.message}`);
          continue;
        }
        
        supermarkets.push(validation.data);
      }
      
      // If there are errors, return them
      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "Có lỗi khi nhập dữ liệu từ file",
          errors
        });
      }
      
      // Create all supermarkets
      const createdSupermarkets = [];
      for (const data of supermarkets) {
        const supermarket = await storage.createSupermarket(data);
        createdSupermarkets.push(supermarket);
        
        // Log the activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "create_supermarket",
          details: `Tạo mới siêu thị ${supermarket.name} (nhập từ file)`,
        });
      }
      
      res.status(201).json({ 
        message: `Đã nhập ${createdSupermarkets.length} siêu thị từ file`,
        supermarkets: createdSupermarkets
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/supermarkets/:id", isAuthenticated, async (req, res, next) => {
    try {
      const supermarketId = parseInt(req.params.id);
      const supermarket = await storage.getSupermarket(supermarketId);
      
      if (!supermarket) {
        return res.status(404).json({ message: "Không tìm thấy siêu thị" });
      }
      
      res.json(supermarket);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/supermarkets", isManagerOrAdmin, async (req, res, next) => {
    try {
      const validation = insertSupermarketSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      const supermarket = await storage.createSupermarket(validation.data);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create_supermarket",
        details: `Tạo mới siêu thị ${supermarket.name}`,
      });
      
      res.status(201).json(supermarket);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/supermarkets/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const supermarketId = parseInt(req.params.id);
      const validation = insertSupermarketSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      const existingSupermarket = await storage.getSupermarket(supermarketId);
      if (!existingSupermarket) {
        return res.status(404).json({ message: "Không tìm thấy siêu thị" });
      }
      
      const updatedSupermarket = await storage.updateSupermarket(supermarketId, validation.data);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "update_supermarket",
        details: `Cập nhật thông tin siêu thị ${updatedSupermarket.name}`,
      });
      
      res.json(updatedSupermarket);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/supermarkets/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const supermarketId = parseInt(req.params.id);
      
      const existingSupermarket = await storage.getSupermarket(supermarketId);
      if (!existingSupermarket) {
        return res.status(404).json({ message: "Không tìm thấy siêu thị" });
      }
      
      // Check if the supermarket has broadcast assignments
      const assignments = await storage.getSupermarketBroadcastAssignments(supermarketId);
      if (assignments.length > 0) {
        return res.status(400).json({ 
          message: "Không thể xóa siêu thị đang có chương trình phát. Hãy xóa các chương trình phát trước." 
        });
      }
      
      await storage.deleteSupermarket(supermarketId);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "delete_supermarket",
        details: `Xóa siêu thị ${existingSupermarket.name}`,
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Update supermarket status
  app.patch("/api/supermarkets/:id/status", isManagerOrAdmin, async (req, res, next) => {
    try {
      const supermarketId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (status !== "active" && status !== "paused") {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
      }
      
      const existingSupermarket = await storage.getSupermarket(supermarketId);
      if (!existingSupermarket) {
        return res.status(404).json({ message: "Không tìm thấy siêu thị" });
      }
      
      await storage.updateSupermarketStatus(supermarketId, status);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "update_supermarket_status",
        details: `${status === "active" ? "Kích hoạt" : "Tạm dừng"} siêu thị ${existingSupermarket.name}`,
      });
      
      res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      next(error);
    }
  });

  // Audio file routes with pagination
  app.get("/api/audio-files", isAuthenticated, async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get group filter if provided
      const group = req.query.group as string;
      
      // Get all audio files
      const allAudioFiles = await storage.getAllAudioFiles();
      
      // Apply group filter if provided
      const filteredAudioFiles = group 
        ? allAudioFiles.filter(file => file.group === group)
        : allAudioFiles;
      
      const totalCount = filteredAudioFiles.length;
      
      // Apply pagination
      const paginatedAudioFiles = filteredAudioFiles.slice(offset, offset + limit);
      
      // Return with pagination metadata
      res.json({
        audioFiles: paginatedAudioFiles,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/audio-files/:id", isAuthenticated, async (req, res, next) => {
    try {
      const audioFileId = parseInt(req.params.id);
      const audioFile = await storage.getAudioFile(audioFileId);
      
      if (!audioFile) {
        return res.status(404).json({ message: "Không tìm thấy file âm thanh" });
      }
      
      res.json(audioFile);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/audio-files", isManagerOrAdmin, audioUpload.single("audioFile"), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Không có file âm thanh được tải lên" });
      }
      
      let sampleRate = null;
      try {
        // Parse audio metadata to get the sample rate
        const metadata = await mm.parseFile(req.file.path);
        console.log(`Audio file metadata for ${req.file.originalname}:`, {
          format: metadata.format,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        if (metadata.format && metadata.format.sampleRate) {
          sampleRate = metadata.format.sampleRate;
          console.log(`Extracted sample rate: ${sampleRate} Hz for file ${req.file.originalname}`);
        } else {
          console.log(`No sample rate found in metadata for ${req.file.originalname}`);
        }
      } catch (metadataError) {
        console.error(`Error reading audio metadata for ${req.file.originalname}:`, metadataError);
        // Continue without sample rate if there's an error
      }
      
      // Get file information
      const fileInfo = {
        filename: req.file.filename,
        displayName: req.body.displayName || path.parse(req.file.originalname).name,
        fileSize: req.file.size,
        duration: parseInt(req.body.duration) || 0, // In seconds
        sampleRate: sampleRate, // Add the sample rate
        fileType: req.file.mimetype,
        group: req.body.group,
        status: "unused",
        uploadedBy: req.user.id,
      };
      
      const validation = insertAudioFileSchema.safeParse(fileInfo);
      
      if (!validation.success) {
        // Delete the uploaded file if validation fails
        fs.unlinkSync(req.file.path);
        
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      const audioFile = await storage.createAudioFile(validation.data);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "upload_audio",
        details: `Tải lên file âm thanh ${audioFile.displayName}`,
      });
      
      res.status(201).json(audioFile);
    } catch (error) {
      // Delete the uploaded file if an error occurs
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  });

  app.delete("/api/audio-files/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const audioFileId = parseInt(req.params.id);
      
      const existingAudioFile = await storage.getAudioFile(audioFileId);
      if (!existingAudioFile) {
        return res.status(404).json({ message: "Không tìm thấy file âm thanh" });
      }
      
      // Check if the audio file is being used in any broadcast program
      const isUsed = await storage.isAudioFileUsed(audioFileId);
      if (isUsed) {
        return res.status(400).json({ 
          message: "File âm thanh đang được sử dụng trong chương trình phát. Không thể xóa." 
        });
      }
      
      // Delete the file from disk
      const filePath = path.join(process.cwd(), "uploads", existingAudioFile.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await storage.deleteAudioFile(audioFileId);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "delete_audio",
        details: `Xóa file âm thanh ${existingAudioFile.displayName}`,
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Update audio file group
  app.patch("/api/audio-files/:id/group", isManagerOrAdmin, async (req, res, next) => {
    try {
      const audioFileId = parseInt(req.params.id);
      const { group } = req.body;
      
      if (!group) {
        return res.status(400).json({ message: "Nhóm không được để trống" });
      }
      
      const audioFile = await storage.getAudioFile(audioFileId);
      
      if (!audioFile) {
        return res.status(404).json({ message: "Không tìm thấy file âm thanh" });
      }
      
      // Check if file is being used in playlists
      if (audioFile.status === "used") {
        return res.status(400).json({ 
          message: "Không thể thay đổi nhóm của file đang được sử dụng trong playlist" 
        });
      }
      
      // Update the file's group in database
      await db.update(audioFiles)
        .set({ group })
        .where(eq(audioFiles.id, audioFileId));
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "update_audio_group",
        details: `Thay đổi nhóm của file "${audioFile.displayName}" từ "${audioFile.group}" thành "${group}"`,
      });
      
      res.status(200).json({ message: "Cập nhật nhóm thành công" });
    } catch (error) {
      next(error);
    }
  });

  // Serve audio files (streaming)
  app.get("/api/audio-files/:id/stream", isAuthenticated, async (req, res, next) => {
    try {
      const audioFileId = parseInt(req.params.id);
      const audioFile = await storage.getAudioFile(audioFileId);
      
      if (!audioFile) {
        return res.status(404).json({ message: "Không tìm thấy file âm thanh" });
      }
      
      const filePath = path.join(process.cwd(), "uploads", audioFile.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File âm thanh không tồn tại trên server" });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });
  
  // Download audio files
  app.get("/api/audio-files/:id/download", isAuthenticated, async (req, res, next) => {
    try {
      const audioFileId = parseInt(req.params.id);
      const audioFile = await storage.getAudioFile(audioFileId);
      
      if (!audioFile) {
        return res.status(404).json({ message: "Không tìm thấy file âm thanh" });
      }
      
      const filePath = path.join(process.cwd(), "uploads", audioFile.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File âm thanh không tồn tại trên server" });
      }
      
      // Determine file extension from MIME type
      const fileType = audioFile.fileType;
      const extension = fileType.split('/')[1] || 'mp3';
      
      // Set the right headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${audioFile.displayName}.${extension}"`);
      res.setHeader('Content-Type', audioFile.fileType);
      
      // Send the file for download
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });

  // Broadcast program routes with pagination
  app.get("/api/broadcast-programs", isAuthenticated, async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get all broadcast programs
      const allPrograms = await storage.getAllBroadcastPrograms();
      const totalCount = allPrograms.length;
      
      // Apply pagination
      const paginatedPrograms = allPrograms.slice(offset, offset + limit);
      
      // Return with pagination metadata
      res.json({
        programs: paginatedPrograms,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/broadcast-programs/:id", isAuthenticated, async (req, res, next) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getBroadcastProgram(programId);
      
      if (!program) {
        return res.status(404).json({ message: "Không tìm thấy chương trình phát" });
      }
      
      res.json(program);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/broadcast-programs", isManagerOrAdmin, async (req, res, next) => {
    try {
      console.log("Original request:", JSON.stringify(req.body, null, 2));
      
      // Đảm bảo trường ngày tồn tại
      if (!req.body.date) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: { date: ["Ngày không được để trống"] } 
        });
      }
      
      // Thử sửa lỗi định dạng ngày (mm/dd/yyyy -> yyyy-mm-dd)
      let dateStr = req.body.date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          // Đổi định dạng từ MM/DD/YYYY thành YYYY-MM-DD
          dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          console.log("Date format fixed:", dateStr);
        }
      }
      
      const date = new Date(dateStr);
      console.log("Date conversion result:", date, date instanceof Date, !isNaN(date.getTime()));
      
      // Kiểm tra xem ngày có hợp lệ không
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: { date: ["Ngày không hợp lệ"] } 
        });
      }
      
      // Nếu mọi thứ ổn, tiếp tục với dữ liệu
      const requestData = {
        name: req.body.name,
        date: date,
        settings: req.body.settings,
        createdBy: req.user.id
      };
      
      console.log("Modified request data:", JSON.stringify(requestData, null, 2));
      
      // Thử lưu thông qua drizzle
      try {
        const program = await storage.createBroadcastProgram(requestData);
        
        // Log the activity
        await storage.createActivityLog({
          userId: req.user?.id || 1,
          action: "create_broadcast_program",
          details: `Tạo mới chương trình phát ${program.name}`,
        });
        
        res.status(201).json(program);
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        // Thử cách mới: Bypass schema
        try {
          console.log("Trying direct SQL query bypass...");
          const result = await db.execute(
            `INSERT INTO broadcast_programs (name, date, settings, created_by) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [
              req.body.name,
              date.toISOString(),
              JSON.stringify(req.body.settings),
              req.user?.id || 1
            ]
          );
          
          console.log("Direct SQL result:", result);
          
          // Activity log
          await storage.createActivityLog({
            userId: req.user.id,
            action: "create_broadcast_program",
            details: `Tạo mới chương trình phát ${req.body.name}`,
          });
          
          res.status(201).json(result.rows[0]);
        } catch (sqlError) {
          console.error("SQL bypass error:", sqlError);
          return res.status(400).json({ 
            message: "Dữ liệu không hợp lệ", 
            errors: { 
              date: ["Expected date, received string"],
              original: dbError.message,
              sql: sqlError?.message 
            }
          });
        }
      }
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/broadcast-programs/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const programId = parseInt(req.params.id);
      
      console.log("Original update request:", JSON.stringify(req.body, null, 2));
      
      // Đảm bảo trường ngày tồn tại
      if (!req.body.date) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: { date: ["Ngày không được để trống"] } 
        });
      }
      
      // Thử sửa lỗi định dạng ngày (mm/dd/yyyy -> yyyy-mm-dd)
      let dateStr = req.body.date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          // Đổi định dạng từ MM/DD/YYYY thành YYYY-MM-DD
          dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          console.log("Date format fixed:", dateStr);
        }
      }
      
      const date = new Date(dateStr);
      console.log("Date conversion result:", date, date instanceof Date, !isNaN(date.getTime()));
      
      // Kiểm tra xem ngày có hợp lệ không
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: { date: ["Ngày không hợp lệ"] } 
        });
      }
      
      const requestData = {
        name: req.body.name,
        date: date,
        settings: req.body.settings
      };
      
      const existingProgram = await storage.getBroadcastProgram(programId);
      if (!existingProgram) {
        return res.status(404).json({ message: "Không tìm thấy chương trình phát" });
      }
      
      const updatedProgram = await storage.updateBroadcastProgram(programId, requestData);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "update_broadcast_program",
        details: `Cập nhật chương trình phát ${updatedProgram.name}`,
      });
      
      res.json(updatedProgram);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/broadcast-programs/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const programId = parseInt(req.params.id);
      
      const existingProgram = await storage.getBroadcastProgram(programId);
      if (!existingProgram) {
        return res.status(404).json({ message: "Không tìm thấy chương trình phát" });
      }
      
      // Check if the program is assigned to any supermarket
      const assignments = await storage.getBroadcastProgramAssignments(programId);
      if (assignments.length > 0) {
        return res.status(400).json({ 
          message: "Chương trình phát đang được gán cho siêu thị. Hãy xóa các gán kết trước." 
        });
      }
      
      // Delete the associated playlist if it exists
      const playlist = await storage.getPlaylistByProgramId(programId);
      if (playlist) {
        await storage.deletePlaylist(playlist.id);
      }
      
      await storage.deleteBroadcastProgram(programId);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "delete_broadcast_program",
        details: `Xóa chương trình phát ${existingProgram.name}`,
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Playlist routes with pagination
  app.get("/api/playlists", isAuthenticated, async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get program ID filter if provided
      const programId = req.query.programId ? parseInt(req.query.programId as string) : null;
      
      // Get all playlists
      const allPlaylists = await storage.getAllPlaylists();
      
      // Apply program ID filter if provided
      const filteredPlaylists = programId 
        ? allPlaylists.filter(playlist => playlist.broadcastProgramId === programId)
        : allPlaylists;
      
      const totalCount = filteredPlaylists.length;
      
      // Apply pagination
      const paginatedPlaylists = filteredPlaylists.slice(offset, offset + limit);
      
      console.log("GET playlists with pagination:", JSON.stringify({
        total: totalCount,
        page,
        limit,
        filtered: filteredPlaylists.length,
        returned: paginatedPlaylists.length
      }));
      
      // Return with pagination metadata
      res.json({
        playlists: paginatedPlaylists,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Error getting playlists with pagination:", error);
      next(error);
    }
  });
  
  app.delete("/api/playlists/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      // Validate playlist ID
      if (isNaN(playlistId) || playlistId <= 0) {
        return res.status(400).json({ message: "ID danh sách phát không hợp lệ" });
      }
      
      const existingPlaylist = await storage.getPlaylist(playlistId);
      if (!existingPlaylist) {
        return res.status(404).json({ message: "Không tìm thấy danh sách phát" });
      }
      
      // Get program info for logging
      const program = await storage.getBroadcastProgram(existingPlaylist.broadcastProgramId);
      
      // Get the audio file IDs to potentially update their status
      const audioFileIds = JSON.parse(JSON.stringify(existingPlaylist.items)).map((item: any) => item.audioFileId);
      
      // Delete the playlist
      await storage.deletePlaylist(playlistId);
      
      // Update audio files status to "unused" if they're not used elsewhere
      for (const fileId of audioFileIds) {
        const isUsed = await storage.isAudioFileUsed(fileId);
        if (!isUsed) {
          await storage.updateAudioFileStatus(fileId, "unused");
        }
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "delete_playlist",
        details: `Xóa danh sách phát cho chương trình ${program?.name || ''}`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      next(error);
    }
  });

  app.get("/api/playlists/:id", isAuthenticated, async (req, res, next) => {
    try {
      const playlistId = parseInt(req.params.id);
      console.log("GET SPECIFIC PLAYLIST - Looking for playlist with ID:", playlistId);
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        console.log("GET SPECIFIC PLAYLIST - Playlist not found with ID:", playlistId);
        // Get all playlists for debugging
        const allPlaylists = await storage.getAllPlaylists();
        console.log("GET SPECIFIC PLAYLIST - All available playlists:", 
          JSON.stringify(allPlaylists.map(p => ({ id: p.id, programId: p.broadcastProgramId }))));
          
        return res.status(404).json({ message: "Không tìm thấy danh sách phát" });
      }
      
      console.log("GET SPECIFIC PLAYLIST - Found playlist:", JSON.stringify({
        id: playlist.id,
        broadcastProgramId: playlist.broadcastProgramId,
        itemCount: Array.isArray(playlist.items) ? playlist.items.length : 'not an array'
      }));
      
      res.json(playlist);
    } catch (error) {
      console.error("GET SPECIFIC PLAYLIST - Error:", error);
      next(error);
    }
  });

  // Lấy tất cả playlist cho một chương trình phát
  app.get("/api/broadcast-programs/:id/playlists", isAuthenticated, async (req, res, next) => {
    try {
      const programId = parseInt(req.params.id);
      console.log("Getting all playlists for program ID:", programId);
      
      // Validate program ID
      if (isNaN(programId) || programId <= 0) {
        return res.status(400).json({ message: "ID chương trình không hợp lệ" });
      }
      
      // Lấy tất cả playlist
      const allPlaylists = await storage.getAllPlaylists();
      
      // Lọc playlist cho broadcast program này và sắp xếp theo ID giảm dần (mới nhất lên đầu)
      const filteredPlaylists = allPlaylists
        .filter(p => p.broadcastProgramId === programId)
        .sort((a, b) => b.id - a.id);
      
      console.log("PLAYLIST DEBUG - All playlists from DB:", JSON.stringify(allPlaylists.map(p => ({ id: p.id, programId: p.broadcastProgramId }))));
      console.log("PLAYLIST DEBUG - Filtered playlists for program:", JSON.stringify(filteredPlaylists.map(p => ({ id: p.id }))));
      console.log("PLAYLIST DEBUG - Raw filtered data:", JSON.stringify(filteredPlaylists));
      
      console.log("FINAL DATA BEING SENT TO CLIENT:", JSON.stringify(filteredPlaylists.map(p => ({ id: p.id, broadcastProgramId: p.broadcastProgramId }))));
      
      // Trả về danh sách các playlist
      res.json(filteredPlaylists);
    } catch (error) {
      console.error("Error getting playlists for program:", error);
      next(error);
    }
  });
  
  // Lấy một playlist cụ thể cho chương trình (để tương thích với code cũ)
  app.get("/api/broadcast-programs/:id/playlist", isAuthenticated, async (req, res, next) => {
    try {
      const programId = parseInt(req.params.id);
      console.log("Getting playlist for program ID:", programId);
      
      // Validate program ID
      if (isNaN(programId) || programId <= 0) {
        return res.status(400).json({ message: "ID chương trình không hợp lệ" });
      }
      
      // Thêm log để debug
      console.log("Getting playlist for broadcast program:", programId);
      
      // Sử dụng hàm mới để lấy playlist mới nhất cho chương trình
      const allPlaylists = await storage.getAllPlaylists();
      console.log("All playlists:", JSON.stringify(allPlaylists));
      
      // Lọc playlist cho broadcast program này và sắp xếp theo ID giảm dần (mới nhất lên đầu)
      const filteredPlaylists = allPlaylists
        .filter(p => p.broadcastProgramId === programId)
        .sort((a, b) => b.id - a.id);
      
      console.log("Filtered playlists for program:", JSON.stringify(filteredPlaylists));
      
      // Lấy playlist mới nhất (phần tử đầu tiên sau khi đã sắp xếp)
      const latestPlaylist = filteredPlaylists.length > 0 ? filteredPlaylists[0] : null;
      console.log("Latest playlist for program:", JSON.stringify(latestPlaylist));
      
      // Return the playlist if found, or null if not found
      // No need to return a 404 status since "no playlist" is a valid state
      res.json(latestPlaylist);
    } catch (error) {
      console.error("Error getting playlist for program:", error);
      next(error);
    }
  });

  app.post("/api/playlists", isManagerOrAdmin, async (req, res, next) => {
    try {
      const validation = insertPlaylistSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      // Check if broadcast program exists
      const program = await storage.getBroadcastProgram(validation.data.broadcastProgramId);
      if (!program) {
        return res.status(400).json({ message: "Chương trình phát không tồn tại" });
      }
      
      // Tạo danh sách phát mới (không xóa danh sách phát cũ)
      const playlist = await storage.createPlaylist(validation.data);
      console.log("Created new playlist:", JSON.stringify(playlist));
      
      // Update audio files status to "used"
      const audioFileIds = JSON.parse(JSON.stringify(validation.data.items)).map((item: any) => item.audioFileId);
      await Promise.all(audioFileIds.map((id: number) => storage.updateAudioFileStatus(id, "used")));
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create_playlist",
        details: `Tạo danh sách phát cho chương trình ${program.name}`,
      });
      
      res.status(201).json(playlist);
    } catch (error) {
      console.error("Error creating playlist:", error);
      next(error);
    }
  });

  // Delete playlist
  app.delete("/api/playlists/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      // Kiểm tra xem playlistId có phải là số hợp lệ hay không
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: "ID danh sách phát không hợp lệ" });
      }
      
      const existingPlaylist = await storage.getPlaylist(playlistId);
      if (!existingPlaylist) {
        return res.status(404).json({ message: "Không tìm thấy danh sách phát" });
      }
      
      // Log the deletion
      console.log("Server deleting playlist:", playlistId);
      
      // Get the audio file IDs to potentially update their status
      const audioFileIds = JSON.parse(JSON.stringify(existingPlaylist.items)).map((item: any) => item.audioFileId);
      
      // Delete the playlist
      await storage.deletePlaylist(playlistId);
      
      // Update audio files status to "unused" for files if they're not used elsewhere
      for (const fileId of audioFileIds) {
        const isUsed = await storage.isAudioFileUsed(fileId);
        if (!isUsed) {
          await storage.updateAudioFileStatus(fileId, "unused");
        }
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "delete_playlist",
        details: `Xóa danh sách phát`,
      });
      
      res.status(200).json({ message: "Đã xóa danh sách phát thành công" });
    } catch (error) {
      console.error("Error deleting playlist:", error);
      next(error);
    }
  });
  
  // Kiểm tra và chuẩn hóa playlist (xóa tham chiếu đến audio files không tồn tại)
  app.post("/api/playlists/:id/clean", isManagerOrAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Lấy playlist hiện tại
      const playlist = await storage.getPlaylist(id);
      if (!playlist) {
        return res.status(404).json({ message: "Không tìm thấy danh sách phát" });
      }
      
      // Lấy danh sách audio files có sẵn
      const audioFiles = await storage.getAllAudioFiles();
      const audioFileIds = audioFiles.map(file => file.id);
      
      // Lọc ra các items có audio file tồn tại
      const items = (JSON.parse(JSON.stringify(playlist.items)) as any[]).filter(item => 
        audioFileIds.includes(item.audioFileId)
      );
      
      // So sánh với số lượng cũ để tính số lượng bị loại bỏ
      const originalCount = (JSON.parse(JSON.stringify(playlist.items)) as any[]).length;
      const removedCount = originalCount - items.length;
      
      if (removedCount === 0) {
        return res.status(200).json({ 
          message: "Danh sách phát không cần chuẩn hóa",
          playlist,
          removedItems: 0
        });
      }
      
      // Cập nhật playlist với items đã được lọc
      const updatedPlaylist = await storage.updatePlaylist(id, {
        ...playlist,
        items: items
      });
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "clean_playlist",
        details: `Chuẩn hóa danh sách phát, loại bỏ ${removedCount} file âm thanh không tồn tại`,
      });
      
      res.status(200).json({ 
        message: `Đã chuẩn hóa danh sách phát, loại bỏ ${removedCount} file âm thanh không tồn tại`, 
        playlist: updatedPlaylist,
        removedItems: removedCount
      });
    } catch (error) {
      console.error("Error cleaning playlist:", error);
      next(error);
    }
  });

  app.put("/api/playlists/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      // Kiểm tra xem playlistId có phải là số hợp lệ hay không
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: "ID danh sách phát không hợp lệ" });
      }
      
      const validation = insertPlaylistSchema
        .omit({ broadcastProgramId: true })
        .safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      const existingPlaylist = await storage.getPlaylist(playlistId);
      if (!existingPlaylist) {
        return res.status(404).json({ message: "Không tìm thấy danh sách phát" });
      }
      
      // Get the old audio file IDs to potentially update their status
      const oldAudioFileIds = JSON.parse(JSON.stringify(existingPlaylist.items)).map((item: any) => item.audioFileId);
      
      // Log the update data
      console.log("Server updating playlist:", playlistId, validation.data);
      
      // Update the playlist with only the items (that's all we need to update)
      const updatedPlaylist = await storage.updatePlaylist(playlistId, { 
        items: validation.data.items 
      });
      
      // Get the new audio file IDs
      const newAudioFileIds = JSON.parse(JSON.stringify(validation.data.items)).map((item: any) => item.audioFileId);
      
      // Update audio files status to "used" for new files
      const addedFileIds = newAudioFileIds.filter((id: number) => !oldAudioFileIds.includes(id));
      await Promise.all(addedFileIds.map((id: number) => storage.updateAudioFileStatus(id, "used")));
      
      // Update audio files status to "unused" for removed files if they're not used elsewhere
      const removedFileIds = oldAudioFileIds.filter((id: number) => !newAudioFileIds.includes(id));
      for (const fileId of removedFileIds) {
        const isUsed = await storage.isAudioFileUsed(fileId);
        if (!isUsed) {
          await storage.updateAudioFileStatus(fileId, "unused");
        }
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "update_playlist",
        details: `Cập nhật danh sách phát`,
      });
      
      res.json(updatedPlaylist);
    } catch (error) {
      next(error);
    }
  });

  // Broadcast assignment routes
  app.get("/api/broadcast-assignments", isAuthenticated, async (req, res, next) => {
    try {
      const assignments = await storage.getAllBroadcastAssignments();
      res.json(assignments);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/supermarkets/:id/broadcast-assignments", isAuthenticated, async (req, res, next) => {
    try {
      const supermarketId = parseInt(req.params.id);
      const assignments = await storage.getSupermarketBroadcastAssignments(supermarketId);
      res.json(assignments);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/broadcast-assignments", isManagerOrAdmin, async (req, res, next) => {
    try {
      const validation = insertBroadcastAssignmentSchema.safeParse({
        ...req.body,
        assignedBy: req.user.id,
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      // Check if supermarket exists
      const supermarket = await storage.getSupermarket(validation.data.supermarketId);
      if (!supermarket) {
        return res.status(400).json({ message: "Siêu thị không tồn tại" });
      }
      
      // Check if broadcast program exists
      const program = await storage.getBroadcastProgram(validation.data.broadcastProgramId);
      if (!program) {
        return res.status(400).json({ message: "Chương trình phát không tồn tại" });
      }
      
      // Check if a playlist exists for this program
      const playlist = await storage.getPlaylistByProgramId(validation.data.broadcastProgramId);
      if (!playlist) {
        return res.status(400).json({ message: "Chương trình phát chưa có danh sách phát" });
      }
      
      // Check if assignment already exists for this supermarket
      const existingAssignment = await storage.getSupermarketBroadcastAssignments(validation.data.supermarketId);
      if (existingAssignment.length > 0) {
        // Update the existing assignment instead
        const assignment = await storage.updateBroadcastAssignment(
          existingAssignment[0].id, 
          validation.data
        );
        
        // Update the supermarket's current program
        await storage.updateSupermarketCurrentProgram(
          validation.data.supermarketId,
          program.name
        );
        
        // Log the activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "update_broadcast_assignment",
          details: `Cập nhật gán chương trình phát ${program.name} cho siêu thị ${supermarket.name}`,
        });
        
        return res.json(assignment);
      }
      
      // Create a new assignment
      const assignment = await storage.createBroadcastAssignment(validation.data);
      
      // Update the supermarket's current program
      await storage.updateSupermarketCurrentProgram(
        validation.data.supermarketId,
        program.name
      );
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create_broadcast_assignment",
        details: `Gán chương trình phát ${program.name} cho siêu thị ${supermarket.name}`,
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/broadcast-assignments/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const assignmentId = parseInt(req.params.id);
      
      const existingAssignment = await storage.getBroadcastAssignment(assignmentId);
      if (!existingAssignment) {
        return res.status(404).json({ message: "Không tìm thấy gán kết" });
      }
      
      // Get supermarket and program info for logging
      const supermarket = await storage.getSupermarket(existingAssignment.supermarketId);
      const program = await storage.getBroadcastProgram(existingAssignment.broadcastProgramId);
      
      await storage.deleteBroadcastAssignment(assignmentId);
      
      // Update the supermarket's current program to null
      await storage.updateSupermarketCurrentProgram(existingAssignment.supermarketId, null);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "delete_broadcast_assignment",
        details: `Hủy gán chương trình phát ${program?.name || ''} cho siêu thị ${supermarket?.name || ''}`,
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Dashboard statistics
  app.get("/api/stats", isAuthenticated, async (req, res, next) => {
    try {
      const stats = {
        totalSupermarkets: await storage.getSupermarketCount(),
        totalAudioFiles: await storage.getAudioFileCount(),
        totalBroadcasts: await storage.getBroadcastProgramCount(),
        totalUsers: await storage.getUserCount(),
        recentActivities: await storage.getRecentActivities(5),
      };
      
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });
  
  // API để xóa toàn bộ playlists và reset ID sequence
  app.delete("/api/reset-playlists", isManagerOrAdmin, async (req, res, next) => {
    try {
      console.log("Received request to delete all playlists");
      
      // Lấy tất cả playlists
      const allPlaylists = await storage.getAllPlaylists();
      console.log(`Found ${allPlaylists.length} playlists to delete`);
      
      // Xóa từng playlist
      for (const playlist of allPlaylists) {
        await storage.deletePlaylist(playlist.id);
        console.log(`Deleted playlist ID: ${playlist.id}`);
      }
      
      // Reset sequence trong database bằng cách gọi trực tiếp SQL
      try {
        const resetSequenceResult = await db.execute(`
          ALTER SEQUENCE "playlists_id_seq" RESTART WITH 1;
        `);
        console.log("Reset playlist ID sequence:", resetSequenceResult);
      } catch (seqError) {
        console.error("Error resetting sequence:", seqError);
      }
      
      // Ghi nhật ký hoạt động
      await storage.createActivityLog({
        userId: req.user.id,
        action: "RESET_PLAYLISTS",
        details: `Xóa toàn bộ ${allPlaylists.length} danh sách phát và reset ID sequence`
      });
      
      res.status(200).json({ 
        message: `Đã xóa toàn bộ ${allPlaylists.length} danh sách phát và reset ID sequence` 
      });
    } catch (error) {
      console.error("Error resetting playlists:", error);
      next(error);
    }
  });
  
  // API để xóa toàn bộ broadcast programs và reset ID sequence
  app.delete("/api/reset-broadcast-programs", isManagerOrAdmin, async (req, res, next) => {
    try {
      console.log("Received request to delete all broadcast programs");
      
      // Lấy tất cả broadcast programs
      const allPrograms = await storage.getAllBroadcastPrograms();
      console.log(`Found ${allPrograms.length} broadcast programs to delete`);
      
      // Lấy tất cả playlists (để kiểm tra có bất kỳ playlist nào đang sử dụng program không)
      const allPlaylists = await storage.getAllPlaylists();
      
      // Xóa tất cả broadcast assignments trước (vì có foreign key constraint)
      const allAssignments = await storage.getAllBroadcastAssignments();
      console.log(`Found ${allAssignments.length} broadcast assignments to delete`);
      
      for (const assignment of allAssignments) {
        await storage.deleteBroadcastAssignment(assignment.id);
        console.log(`Deleted broadcast assignment ID: ${assignment.id}`);
        
        // Cập nhật supermarket
        await storage.updateSupermarketCurrentProgram(assignment.supermarketId, null);
        console.log(`Updated supermarket ID: ${assignment.supermarketId} - current program: null`);
      }
      
      // Xóa từng broadcast program
      for (const program of allPrograms) {
        // Kiểm tra xem program này có playlist nào đang sử dụng không
        const linkedPlaylists = allPlaylists.filter(p => p.broadcastProgramId === program.id);
        
        if (linkedPlaylists.length > 0) {
          // Xóa các playlist liên kết trước
          for (const playlist of linkedPlaylists) {
            await storage.deletePlaylist(playlist.id);
            console.log(`Deleted linked playlist ID: ${playlist.id}`);
          }
        }
        
        // Xóa broadcast program
        await storage.deleteBroadcastProgram(program.id);
        console.log(`Deleted broadcast program ID: ${program.id}`);
      }
      
      // Reset sequence trong database
      try {
        const resetSequenceResult = await db.execute(`
          ALTER SEQUENCE "broadcast_programs_id_seq" RESTART WITH 1;
        `);
        console.log("Reset broadcast program ID sequence:", resetSequenceResult);
      } catch (seqError) {
        console.error("Error resetting sequence:", seqError);
      }
      
      // Ghi nhật ký hoạt động
      await storage.createActivityLog({
        userId: req.user.id,
        action: "RESET_BROADCAST_PROGRAMS",
        details: `Xóa toàn bộ ${allPrograms.length} chương trình phát sóng và reset ID sequence`
      });
      
      res.status(200).json({
        message: `Đã xóa toàn bộ ${allPrograms.length} chương trình phát sóng và reset ID sequence`
      });
    } catch (error) {
      console.error("Error resetting broadcast programs:", error);
      next(error);
    }
  });

  // API để cập nhật trạng thái file audio
  app.post("/api/reset-audio-status", isManagerOrAdmin, async (req, res, next) => {
    try {
      console.log("Resetting audio file statuses");
      
      // Get all audio files
      const audioFiles = await storage.getAllAudioFiles();
      let updatedCount = 0;
      
      // Check each audio file
      for (const file of audioFiles) {
        const isUsed = await storage.isAudioFileUsed(file.id);
        
        // If file status doesn't match its usage, update it
        if ((isUsed && file.status !== "used") || (!isUsed && file.status !== "unused")) {
          const newStatus = isUsed ? "used" : "unused";
          await storage.updateAudioFileStatus(file.id, newStatus);
          updatedCount++;
          console.log(`Updated audio file ID ${file.id} status to ${newStatus}`);
        }
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "reset_audio_status",
        details: `Cập nhật trạng thái của ${updatedCount} file âm thanh`,
      });
      
      res.status(200).json({ 
        message: `Đã cập nhật trạng thái của ${updatedCount} file âm thanh`, 
        updatedCount 
      });
    } catch (error) {
      console.error("Error resetting audio statuses:", error);
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
