// Extract route handlers for broadcast assignments to a separate file
import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./database-storage";
import { broadcastPrograms, insertBroadcastAssignmentSchema } from "@shared/schema";

// Define middleware functions locally since they're not exported from routes.ts
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Chưa đăng nhập" });
}

function isManagerOrAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.role === "manager" || req.user.role === "admin")) {
    return next();
  }
  res.status(403).json({ message: "Không có quyền truy cập" });
}

export function registerBroadcastAssignmentRoutes(app: Express) {
  // Get all assignments with pagination
  app.get("/api/broadcast-assignments", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get all broadcast assignments
      const allAssignments = await storage.getAllBroadcastAssignments();
      const totalCount = allAssignments.length;
      
      // Apply pagination
      const paginatedAssignments = allAssignments.slice(offset, offset + limit);
      
      // Return with pagination metadata
      res.json({
        assignments: paginatedAssignments,
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

  // Get assignments for a specific supermarket with pagination
  app.get("/api/broadcast-assignments/by-supermarket/:id", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supermarketId = parseInt(req.params.id);
      
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get all assignments for this supermarket
      const allAssignments = await storage.getSupermarketBroadcastAssignments(supermarketId);
      const totalCount = allAssignments.length;
      
      // Apply pagination
      const paginatedAssignments = allAssignments.slice(offset, offset + limit);
      
      // Enrich assignments with related data
      const enrichedAssignments = await Promise.all(
        paginatedAssignments.map(async (assignment) => {
          const program = await storage.getBroadcastProgram(assignment.broadcastProgramId);
          const supermarket = await storage.getSupermarket(assignment.supermarketId);
          
          // Lấy thông tin chi tiết về commune, province và region
          const commune = supermarket?.communeId ? await storage.getCommune(supermarket.communeId) : null;
          const province = supermarket?.provinceId ? await storage.getProvince(supermarket.provinceId) : null;
          const region = supermarket?.regionId ? await storage.getRegion(supermarket.regionId) : null;
          
          const fullAddress = supermarket ? 
            `${supermarket.address}${commune ? ', ' + commune.name : ''}${province ? ', ' + province.name : ''}` 
            : 'Unknown Address';
          
          return {
            ...assignment,
            programName: program?.name || 'Unknown Program',
            programDate: program?.date || new Date(),
            supermarketName: supermarket?.name || 'Unknown Supermarket',
            supermarketAddress: fullAddress,
            communeName: commune?.name || '',
            provinceName: province?.name || '',
            regionName: region?.name || ''
          };
        })
      );
      
      console.log("Enriched assignments:", JSON.stringify(enrichedAssignments, null, 2));
      
      // Return with pagination metadata
      res.json({
        assignments: enrichedAssignments,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching supermarket assignments:", error);
      next(error);
    }
  });

  // Get assignments for a program with pagination
  app.get("/api/broadcast-assignments/by-program/:id", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const programId = parseInt(req.params.id);
      
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get all assignments for this program
      const allAssignments = await storage.getBroadcastProgramAssignments(programId);
      const totalCount = allAssignments.length;
      
      // Apply pagination
      const paginatedAssignments = allAssignments.slice(offset, offset + limit);
      
      // Enrich assignments with related data
      const enrichedAssignments = await Promise.all(
        paginatedAssignments.map(async (assignment) => {
          const program = await storage.getBroadcastProgram(assignment.broadcastProgramId);
          const supermarket = await storage.getSupermarket(assignment.supermarketId);
          
          // Lấy thông tin chi tiết về commune, province và region
          const commune = supermarket?.communeId ? await storage.getCommune(supermarket.communeId) : null;
          const province = supermarket?.provinceId ? await storage.getProvince(supermarket.provinceId) : null;
          const region = supermarket?.regionId ? await storage.getRegion(supermarket.regionId) : null;
          
          const fullAddress = supermarket ? 
            `${supermarket.address}${commune ? ', ' + commune.name : ''}${province ? ', ' + province.name : ''}` 
            : 'Unknown Address';
          
          return {
            ...assignment,
            programName: program?.name || 'Unknown Program',
            programDate: program?.date || new Date(),
            supermarketName: supermarket?.name || 'Unknown Supermarket',
            supermarketAddress: fullAddress,
            communeName: commune?.name || '',
            provinceName: province?.name || '',
            regionName: region?.name || ''
          };
        })
      );
      
      // Return with pagination metadata
      res.json({
        assignments: enrichedAssignments,
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

  // Create a new broadcast assignment
  app.post("/api/broadcast-assignments", isManagerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      
      const validation = insertBroadcastAssignmentSchema.safeParse({
        ...req.body,
        assignedBy: user.id,
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
      
      // If no playlist ID provided, check for default playlist
      if (!validation.data.playlistId) {
        // Check for default playlist for this program
        const defaultPlaylist = await storage.getPlaylistByProgramId(validation.data.broadcastProgramId);
        if (defaultPlaylist) {
          // If there's a default playlist, use it
          validation.data.playlistId = defaultPlaylist.id;
        }
        // No error if no default playlist, allow assignment without playlist
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
          userId: user.id,
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
        userId: user.id,
        action: "create_broadcast_assignment",
        details: `Gán chương trình phát ${program.name} cho siêu thị ${supermarket.name}`,
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      next(error);
    }
  });

  // Delete a broadcast assignment
  app.delete("/api/broadcast-assignments/:id", isManagerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const assignmentId = parseInt(req.params.id);
      
      const existingAssignment = await storage.getBroadcastAssignment(assignmentId);
      if (!existingAssignment) {
        return res.status(404).json({ message: "Không tìm thấy gán kết" });
      }
      
      // Get related supermarket and program for activity log
      const supermarket = await storage.getSupermarket(existingAssignment.supermarketId);
      const program = await storage.getBroadcastProgram(existingAssignment.broadcastProgramId);
      
      // Delete the assignment
      await storage.deleteBroadcastAssignment(assignmentId);
      
      // Clear the supermarket's current program
      await storage.updateSupermarketCurrentProgram(
        existingAssignment.supermarketId,
        null
      );
      
      // Log the activity
      await storage.createActivityLog({
        userId: user.id,
        action: "delete_broadcast_assignment",
        details: `Hủy gán chương trình phát ${program?.name || 'Unknown'} khỏi siêu thị ${supermarket?.name || 'Unknown'}`,
      });
      
      res.status(200).json({ message: "Đã hủy gán chương trình thành công" });
    } catch (error) {
      next(error);
    }
  });
}