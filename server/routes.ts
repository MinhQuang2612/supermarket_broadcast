import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./database-storage";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import * as mm from "music-metadata";
import { 
  insertSupermarketSchema, 
  insertAudioFileSchema, 
  audioFiles
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { PlaylistManager } from './playlist-algorithm.js';

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

  // Supermarket routes with pagination, filtering and sorting
  app.get("/api/supermarkets", isAuthenticated, async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sortKey = req.query.sortKey as string || null;
      const sortDirection = req.query.sortDirection as 'asc' | 'desc' | null || null;
      const region = req.query.region as string || null;
      const status = req.query.status as string || null;
      const search = req.query.search as string || null;
      
      // Get all supermarkets for filtering, sorting, and pagination
      const allSupermarkets = await storage.getAllSupermarkets();
      
      // Apply filtering
      let filteredSupermarkets = [...allSupermarkets];
      
      if (region && region !== 'all') {
        const regions = await storage.getAllRegions();
        const regionObj = regions.find(r => r.code === region);
        if (regionObj) {
          filteredSupermarkets = filteredSupermarkets.filter(s => s.regionId === regionObj.id);
        }
      }
      
      if (status && status !== 'all') {
        filteredSupermarkets = filteredSupermarkets.filter(s => s.status === status);
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        const regions = await storage.getAllRegions();
        const provinces = await storage.getAllProvinces();
        const communes = await storage.getAllCommunes();
        
        filteredSupermarkets = filteredSupermarkets.filter(supermarket => {
          // Search by name or address
          if (supermarket.name.toLowerCase().includes(searchLower) || 
              supermarket.address.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          // Search by region name
          const region = regions.find(r => r.id === supermarket.regionId);
          if (region && region.name.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          // Search by province name
          const province = provinces.find(p => p.id === supermarket.provinceId);
          if (province && province.name.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          // Search by commune name
          const commune = communes.find(c => c.id === supermarket.communeId);
          if (commune && commune.name.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          return false;
        });
      }
      
      // Apply sorting
      if (sortKey && sortDirection) {
        // Tạo biến tham chiếu cho regions để tránh xung đột tên với biến bên ngoài
        const regionsData = await storage.getAllRegions();
        
        filteredSupermarkets.sort((a, b) => {
          let aValue, bValue;
          
          if (sortKey === 'regionId') {
            const aRegion = regionsData.find(r => r.id === a.regionId);
            const bRegion = regionsData.find(r => r.id === b.regionId);
            aValue = aRegion?.name || '';
            bValue = bRegion?.name || '';
          } else if (sortKey === 'status') {
            aValue = a.status === 'active' ? '1' : '0';
            bValue = b.status === 'active' ? '1' : '0';
          } else {
            aValue = String(a[sortKey as keyof typeof a] || '').toLowerCase();
            bValue = String(b[sortKey as keyof typeof b] || '').toLowerCase();
          }
          
          if (sortDirection === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
        });
      }
      
      // Get total count after filtering
      const totalCount = filteredSupermarkets.length;
      
      // Apply pagination
      const offset = (page - 1) * pageSize;
      const paginatedSupermarkets = filteredSupermarkets.slice(offset, offset + pageSize);
      
      // Trả về trực tiếp danh sách siêu thị, không còn đếm programCount
      res.json({
        supermarkets: paginatedSupermarkets,
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize)
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
      const requiredFields = ['name', 'address', 'regionId', 'provinceId', 'communeId', 'status', 'supermarketTypeId'];
      
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
          status: rowData.status || 'active', // Use provided status or default to active
          supermarketTypeId: parseInt(rowData.supermarketTypeId)
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

  // Audio file routes with pagination and enhanced filtering
  app.get("/api/audio-files", isAuthenticated, async (req, res, next) => {
    try {
      console.log(`===== GET AUDIO FILES (User: ${req.user.username}) =====`);
      
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      console.log(`Pagination params: page=${page}, limit=${limit}, offset=${offset}`);
      
      // Get all filters from query parameters
      const group = req.query.group as string;
      const status = req.query.status as string;
      const search = req.query.search as string;
      
      // Log filters for debugging
      if (group) console.log(`Filtering by group: ${group}`);
      if (status) console.log(`Filtering by status: ${status}`);
      if (search) console.log(`Searching for: "${search}"`);
      
      // Get all audio files
      const allAudioFiles = await storage.getAllAudioFiles();
      console.log(`Total audio files in storage: ${allAudioFiles.length}`);
      
      if (allAudioFiles.length > 0) {
        console.log(`First few audio files: ${JSON.stringify(allAudioFiles.slice(0, 3).map(file => ({ id: file.id, filename: file.filename }))).substring(0, 200)}...`);
        console.log(`Audio file IDs: ${allAudioFiles.map(file => file.id).sort((a, b) => a - b).join(', ')}`);
      }
      
      // Apply ALL filters based on query parameters
      let filteredAudioFiles = [...allAudioFiles];
      
      // Apply group filter if provided
      if (group) {
        filteredAudioFiles = filteredAudioFiles.filter(file => file.group === group);
        console.log(`After group filter: ${filteredAudioFiles.length} files match`);
      }
      
      // Apply status filter if provided
      if (status) {
        filteredAudioFiles = filteredAudioFiles.filter(file => file.status === status);
        console.log(`After status filter: ${filteredAudioFiles.length} files match`);
      }
      
      // Apply search filter if provided
      if (search && search.trim() !== '') {
        const searchTerm = search.toLowerCase().trim();
        filteredAudioFiles = filteredAudioFiles.filter(file => 
          file.displayName.toLowerCase().includes(searchTerm) || 
          file.filename.toLowerCase().includes(searchTerm)
        );
        console.log(`After search filter: ${filteredAudioFiles.length} files match "${searchTerm}"`);
      }
      
      const totalCount = filteredAudioFiles.length;
      console.log(`After applying all filters: ${filteredAudioFiles.length} files match criteria`);
      
      // Apply pagination (or return all if limit is very high)
      let paginatedAudioFiles;
      if (limit > 500) {
        console.log(`Returning all ${filteredAudioFiles.length} files without pagination (high limit: ${limit})`);
        paginatedAudioFiles = filteredAudioFiles;
      } else {
        paginatedAudioFiles = filteredAudioFiles.slice(offset, offset + limit);
        console.log(`After pagination: returning ${paginatedAudioFiles.length} files`);
      }
      
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
      
      console.log(`===== GET AUDIO FILES COMPLETED =====`);
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
        audioGroupId: parseInt(req.body.audioGroupId) || 1, // Sử dụng audioGroupId thay vì group, mặc định là 1 (music)
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
      const { audioGroupId } = req.body;
      
      if (!audioGroupId) {
        return res.status(400).json({ message: "ID nhóm không được để trống" });
      }
      
      const audioFile = await storage.getAudioFile(audioFileId);
      if (!audioFile) {
        return res.status(404).json({ message: "Không tìm thấy file âm thanh" });
      }
      
      // Verify audio group exists
      const audioGroup = await storage.getAudioGroup(audioGroupId);
      if (!audioGroup) {
        return res.status(404).json({ message: "Không tìm thấy nhóm audio" });
      }
      
      // Check if file is being used in playlists
      if (audioFile.status === "used") {
        return res.status(400).json({ 
          message: "Không thể thay đổi nhóm của file đang được sử dụng trong playlist" 
        });
      }
      
      // Get old group for logging
      const oldGroup = await storage.getAudioGroup(audioFile.audioGroupId);
      const oldGroupName = oldGroup ? oldGroup.name : "Không có nhóm";
      
      // Update the file's group in database
      await db.update(audioFiles)
        .set({ audioGroupId })
        .where(eq(audioFiles.id, audioFileId));
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "update_audio_group",
        details: `Thay đổi nhóm của file "${audioFile.displayName}" từ "${oldGroupName}" thành "${audioGroup.name}"`,
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
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/supermarket-types", async (req, res, next) => {
    try {
      const types = await storage.getAllSupermarketTypes();
      res.json(types);
    } catch (error) {
      next(error);
    }
  });

  // API lấy danh sách chương trình phát (có phân trang, tìm kiếm, sort)
  app.get("/api/broadcast-programs", async (req, res, next) => {
    try {
      let programs = await storage.getAllBroadcastPrograms();
      // Lọc theo search
      const search = req.query.search ? String(req.query.search).toLowerCase() : null;
      if (search) {
        programs = programs.filter(p => p.name.toLowerCase().includes(search));
      }
      // Sort
      const sortKey = req.query.sortKey as string || null;
      const sortDirection = req.query.sortDirection as 'asc' | 'desc' || 'asc';
      if (sortKey) {
        programs = programs.sort((a, b) => {
          let aValue = a[sortKey];
          let bValue = b[sortKey];
          if (typeof aValue === 'string') aValue = aValue.toLowerCase();
          if (typeof bValue === 'string') bValue = bValue.toLowerCase();
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      // Phân trang
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const total = programs.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const paginated = programs.slice(offset, offset + pageSize);
      res.json({
        programs: paginated,
        pagination: { total, page, pageSize, totalPages }
      });
    } catch (error) {
      next(error);
    }
  });

  // API tạo mới chương trình phát
  app.post("/api/broadcast-programs", async (req, res, next) => {
    try {
      const { name, dates } = req.body;
      if (!name || !dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({ message: "Tên và ngày phát sóng là bắt buộc" });
      }
      const program = await storage.createBroadcastProgram({ name, dates });
      res.status(201).json(program);
    } catch (error) {
      next(error);
    }
  });

  // API cập nhật chương trình phát
  app.put("/api/broadcast-programs/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { name, dates } = req.body;
      if (!name && !dates) {
        return res.status(400).json({ message: "Phải có ít nhất tên hoặc ngày phát sóng để cập nhật" });
      }
      const updateData = {};
      if (name) updateData.name = name;
      if (dates) updateData.dates = dates;
      const updated = await storage.updateBroadcastProgram(id, updateData);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // API xoá chương trình phát
  app.delete("/api/broadcast-programs/:id", isManagerOrAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBroadcastProgram(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // API tạo/sửa playlist cho chương trình
  app.post("/api/playlists", async (req, res, next) => {
    try {
      const { broadcastProgramId, items } = req.body;
      if (!broadcastProgramId || !Array.isArray(items)) {
        return res.status(400).json({ message: "broadcastProgramId và items là bắt buộc" });
      }
      // Xóa playlist cũ nếu có
      let playlist = await storage.getPlaylistByProgramId(broadcastProgramId);
      if (playlist) {
        await storage.deletePlaylist(playlist.id);
      }
      // Lưu từng item của playlist vào DB
      const insertedItems = [];
      for (const item of items) {
        // Đảm bảo truyền đúng các trường, map time_slot -> timeSlot
        const dbItem = {
          id: item.id, // id audio
          broadcastProgramId,
          name: item.name,
          frequency: item.frequency || 1,
          timeSlot: item.time_slot || item.timeSlot || null,
        };
        const inserted = await storage.createPlaylist(dbItem);
        insertedItems.push(inserted);
      }
      // Sau khi lưu playlist, backend tự chạy lại giải thuật để lấy playlistObj (object thời gian phát)
      const { PlaylistManager } = await import('./playlist-algorithm.js');
      const manager = new PlaylistManager();
      manager.processInputData(items);
      const playlistObj = manager.getPlaylist();
      // Tính tổng thời gian phát
      let tongThoiGianPhat = 0;
      const toSeconds = (t) => {
        const [h, m, s] = t.split(':').map(Number);
        return h * 3600 + m * 60 + s;
      };
      for (const key of Object.keys(playlistObj)) {
        const [start, end] = key.split('-');
        tongThoiGianPhat += toSeconds(end) - toSeconds(start);
      }
      playlistObj['tong_thoi_gian_phat'] = tongThoiGianPhat;
      fs.writeFileSync('server/playlist.json', JSON.stringify(playlistObj, null, 2), 'utf8');
      res.status(201).json({ message: "Đã lưu playlist", items: insertedItems });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/audio-groups", async (req, res, next) => {
    try {
      const groups = await storage.getAllAudioGroups();
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/generate-playlist', async (req, res) => {
    try {
      const items = req.body.items;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: 'items phải là mảng' });
      }
      const manager = new PlaylistManager();
      manager.processInputData(items);
      const playlistObj = manager.getPlaylist();
      res.json({ playlist: playlistObj });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi xử lý playlist', error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}