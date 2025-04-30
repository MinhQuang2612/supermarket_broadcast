import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { 
  insertSupermarketSchema, 
  insertAudioFileSchema, 
  insertBroadcastProgramSchema,
  insertPlaylistSchema,
  insertBroadcastAssignmentSchema
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
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

  // User management routes
  app.get("/api/users", isManagerOrAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      })));
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

  // Activity logs
  app.get("/api/activity-logs", isAdmin, async (req, res, next) => {
    try {
      // Get the last 10 days of logs
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const logs = await storage.getActivityLogs(tenDaysAgo);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Supermarket routes
  app.get("/api/supermarkets", isAuthenticated, async (req, res, next) => {
    try {
      const supermarkets = await storage.getAllSupermarkets();
      res.json(supermarkets);
    } catch (error) {
      next(error);
    }
  });
  
  // Import supermarkets from CSV file
  app.post("/api/supermarkets/import", isManagerOrAdmin, upload.single('file'), async (req, res, next) => {
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
      const requiredFields = ['name', 'address', 'ward', 'district', 'province', 'region'];
      
      // Check if all required fields are in the header
      const missingFields = requiredFields.filter(field => !header.includes(field));
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `File thiếu các trường bắt buộc: ${missingFields.join(', ')}` 
        });
      }
      
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
        
        // Create supermarket object from row
        const supermarketData: any = {
          status: 'active' // Default value
        };
        
        header.forEach((field, index) => {
          supermarketData[field] = values[index];
        });
        
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

  // Audio file routes
  app.get("/api/audio-files", isAuthenticated, async (req, res, next) => {
    try {
      const audioFiles = await storage.getAllAudioFiles();
      res.json(audioFiles);
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

  app.post("/api/audio-files", isManagerOrAdmin, upload.single("audioFile"), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Không có file âm thanh được tải lên" });
      }
      
      // Get file information
      const fileInfo = {
        filename: req.file.filename,
        displayName: req.body.displayName || path.parse(req.file.originalname).name,
        fileSize: req.file.size,
        duration: parseInt(req.body.duration) || 0, // In seconds
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

  // Serve audio files
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

  // Broadcast program routes
  app.get("/api/broadcast-programs", isAuthenticated, async (req, res, next) => {
    try {
      const broadcastPrograms = await storage.getAllBroadcastPrograms();
      res.json(broadcastPrograms);
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
      const validation = insertBroadcastProgramSchema.safeParse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      const program = await storage.createBroadcastProgram(validation.data);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create_broadcast_program",
        details: `Tạo mới chương trình phát ${program.name}`,
      });
      
      res.status(201).json(program);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/broadcast-programs/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const programId = parseInt(req.params.id);
      
      const validation = insertBroadcastProgramSchema
        .omit({ createdBy: true })
        .safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: validation.error.format() 
        });
      }
      
      const existingProgram = await storage.getBroadcastProgram(programId);
      if (!existingProgram) {
        return res.status(404).json({ message: "Không tìm thấy chương trình phát" });
      }
      
      const updatedProgram = await storage.updateBroadcastProgram(programId, validation.data);
      
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

  // Playlist routes
  app.get("/api/playlists", isAuthenticated, async (req, res, next) => {
    try {
      const playlists = await storage.getAllPlaylists();
      res.json(playlists);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/playlists/:id", isAuthenticated, async (req, res, next) => {
    try {
      const playlistId = parseInt(req.params.id);
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Không tìm thấy danh sách phát" });
      }
      
      res.json(playlist);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/broadcast-programs/:id/playlist", isAuthenticated, async (req, res, next) => {
    try {
      const programId = parseInt(req.params.id);
      const playlist = await storage.getPlaylistByProgramId(programId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Không tìm thấy danh sách phát cho chương trình này" });
      }
      
      res.json(playlist);
    } catch (error) {
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
      
      // Check if a playlist already exists for this program
      const existingPlaylist = await storage.getPlaylistByProgramId(validation.data.broadcastProgramId);
      if (existingPlaylist) {
        return res.status(400).json({ message: "Đã tồn tại danh sách phát cho chương trình này" });
      }
      
      const playlist = await storage.createPlaylist(validation.data);
      
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
      next(error);
    }
  });

  app.put("/api/playlists/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const playlistId = parseInt(req.params.id);
      
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
      
      // Update the playlist
      const updatedPlaylist = await storage.updatePlaylist(playlistId, validation.data);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
