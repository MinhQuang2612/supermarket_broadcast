import { IStorage } from './storage';
import { db } from './db';
import { 
  users, activityLogs, regions, provinces, communes, supermarkets, audioFiles, 
  broadcastPrograms, playlists, broadcastAssignments,
  User, ActivityLog, Region, Province, Commune, Supermarket, AudioFile, 
  BroadcastProgram, Playlist, BroadcastAssignment,
  InsertUser, InsertActivityLog, InsertRegion, InsertProvince, InsertCommune,
  InsertSupermarket, InsertAudioFile, InsertBroadcastProgram, 
  InsertPlaylist, InsertBroadcastAssignment
} from '@shared/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
  }

  async updateUserStatus(id: number, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    // Convert count to number (PostgreSQL returns it as a string or bigint)
    return parseInt(result[0].count.toString());
  }

  // Activity logs
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(logData)
      .returning();
    
    return log;
  }

  async getActivityLogs(since: Date): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLogs)
      .where(gte(activityLogs.timestamp, since))
      .orderBy(desc(activityLogs.timestamp));
  }

  async getRecentActivities(limit: number): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  // Region operations
  async createRegion(regionData: InsertRegion): Promise<Region> {
    const [region] = await db
      .insert(regions)
      .values(regionData)
      .returning();
    
    return region;
  }

  async getRegion(id: number): Promise<Region | undefined> {
    const [region] = await db
      .select()
      .from(regions)
      .where(eq(regions.id, id));
    
    return region;
  }
  
  async getRegionByCode(code: string): Promise<Region | undefined> {
    const [region] = await db
      .select()
      .from(regions)
      .where(eq(regions.code, code));
    
    return region;
  }

  async getAllRegions(): Promise<Region[]> {
    return db.select().from(regions);
  }

  async updateRegion(id: number, regionData: InsertRegion): Promise<Region> {
    const [region] = await db
      .update(regions)
      .set(regionData)
      .where(eq(regions.id, id))
      .returning();
    
    return region;
  }

  async deleteRegion(id: number): Promise<void> {
    await db
      .delete(regions)
      .where(eq(regions.id, id));
  }
  
  // Province operations
  async createProvince(provinceData: InsertProvince): Promise<Province> {
    const [province] = await db
      .insert(provinces)
      .values(provinceData)
      .returning();
    
    return province;
  }

  async getProvince(id: number): Promise<Province | undefined> {
    const [province] = await db
      .select()
      .from(provinces)
      .where(eq(provinces.id, id));
    
    return province;
  }

  async getAllProvinces(): Promise<Province[]> {
    return db.select().from(provinces);
  }
  
  async getProvincesByRegion(regionId: number): Promise<Province[]> {
    return db
      .select()
      .from(provinces)
      .where(eq(provinces.regionId, regionId));
  }

  async updateProvince(id: number, provinceData: InsertProvince): Promise<Province> {
    const [province] = await db
      .update(provinces)
      .set(provinceData)
      .where(eq(provinces.id, id))
      .returning();
    
    return province;
  }

  async deleteProvince(id: number): Promise<void> {
    await db
      .delete(provinces)
      .where(eq(provinces.id, id));
  }
  
  // Commune operations
  async createCommune(communeData: InsertCommune): Promise<Commune> {
    const [commune] = await db
      .insert(communes)
      .values(communeData)
      .returning();
    
    return commune;
  }

  async getCommune(id: number): Promise<Commune | undefined> {
    const [commune] = await db
      .select()
      .from(communes)
      .where(eq(communes.id, id));
    
    return commune;
  }

  async getAllCommunes(): Promise<Commune[]> {
    return db.select().from(communes);
  }
  
  async getCommunesByProvince(provinceId: number): Promise<Commune[]> {
    return db
      .select()
      .from(communes)
      .where(eq(communes.provinceId, provinceId));
  }

  async updateCommune(id: number, communeData: InsertCommune): Promise<Commune> {
    const [commune] = await db
      .update(communes)
      .set(communeData)
      .where(eq(communes.id, id))
      .returning();
    
    return commune;
  }

  async deleteCommune(id: number): Promise<void> {
    await db
      .delete(communes)
      .where(eq(communes.id, id));
  }

  // Supermarket operations
  async createSupermarket(supermarketData: InsertSupermarket): Promise<Supermarket> {
    const [supermarket] = await db
      .insert(supermarkets)
      .values(supermarketData)
      .returning();
    
    return supermarket;
  }

  async getSupermarket(id: number): Promise<Supermarket | undefined> {
    const [supermarket] = await db
      .select()
      .from(supermarkets)
      .where(eq(supermarkets.id, id));
    
    return supermarket;
  }

  async getAllSupermarkets(): Promise<Supermarket[]> {
    return db.select().from(supermarkets);
  }

  async updateSupermarket(id: number, supermarketData: InsertSupermarket): Promise<Supermarket> {
    const [supermarket] = await db
      .update(supermarkets)
      .set(supermarketData)
      .where(eq(supermarkets.id, id))
      .returning();
    
    return supermarket;
  }

  async deleteSupermarket(id: number): Promise<void> {
    await db
      .delete(supermarkets)
      .where(eq(supermarkets.id, id));
  }

  async updateSupermarketStatus(id: number, status: string): Promise<void> {
    await db
      .update(supermarkets)
      .set({ status })
      .where(eq(supermarkets.id, id));
  }

  async updateSupermarketCurrentProgram(id: number, programName: string | null): Promise<void> {
    await db
      .update(supermarkets)
      .set({ currentProgram: programName })
      .where(eq(supermarkets.id, id));
  }

  async getSupermarketCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(supermarkets);
    return result[0].count;
  }

  // Audio file operations
  async createAudioFile(audioFileData: InsertAudioFile): Promise<AudioFile> {
    const [audioFile] = await db
      .insert(audioFiles)
      .values(audioFileData)
      .returning();
    
    return audioFile;
  }

  async getAudioFile(id: number): Promise<AudioFile | undefined> {
    const [audioFile] = await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.id, id));
    
    return audioFile;
  }

  async getAllAudioFiles(): Promise<AudioFile[]> {
    return db.select().from(audioFiles);
  }

  async deleteAudioFile(id: number): Promise<void> {
    await db
      .delete(audioFiles)
      .where(eq(audioFiles.id, id));
  }

  async updateAudioFileStatus(id: number, status: string): Promise<void> {
    await db
      .update(audioFiles)
      .set({ status })
      .where(eq(audioFiles.id, id));
  }

  async isAudioFileUsed(id: number): Promise<boolean> {
    // Check if the audio file is used in any playlist
    try {
      // Đơn giản hóa logic kiểm tra - lấy tất cả playlist và kiểm tra trong JavaScript
      const allPlaylists = await db.select().from(playlists);
      
      // Kiểm tra trong từng playlist có item nào chứa audioFileId giống với tham số id không
      for (const playlist of allPlaylists) {
        if (!playlist.items || !Array.isArray(playlist.items)) continue;
        
        const hasAudioFile = playlist.items.some(
          (item: PlaylistItem) => item && item.audioFileId === id
        );
        
        if (hasAudioFile) return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking if audio file is used:", error);
      // Nếu có lỗi, cho phép xóa để tránh blocking người dùng
      return false;
    }
  }

  async getAudioFileCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(audioFiles);
    return result[0].count;
  }

  // Broadcast program operations
  async createBroadcastProgram(programData: InsertBroadcastProgram): Promise<BroadcastProgram> {
    try {
      // Sử dụng cách tiếp cận truyền thống với Drizzle ORM
      const [program] = await db
        .insert(broadcastPrograms)
        .values(programData)
        .returning();
      
      return program;
    } catch (drizzleError) {
      console.error("Drizzle insert error:", drizzleError);
      
      // Fallback: Sử dụng SQL thuần
      try {
        console.log("Fallback to raw SQL for broadcast program creation");
        const dateStr = programData.date instanceof Date 
          ? programData.date.toISOString() 
          : new Date(programData.date as string).toISOString();
        
        const result = await pool.query(
          `INSERT INTO broadcast_programs (name, date, settings, created_by, created_at) 
           VALUES ($1, $2, $3, $4, NOW()) 
           RETURNING *`,
          [
            programData.name,
            dateStr,
            JSON.stringify(programData.settings),
            programData.createdBy
          ]
        );
        
        if (result.rows && result.rows.length > 0) {
          return result.rows[0] as BroadcastProgram;
        }
        throw new Error("Failed to insert broadcast program with raw SQL");
      } catch (sqlError) {
        console.error("Raw SQL insert error:", sqlError);
        throw new Error(`Không thể tạo chương trình phát: ${sqlError.message || drizzleError.message}`);
      }
    }
  }

  async getBroadcastProgram(id: number): Promise<BroadcastProgram | undefined> {
    const [program] = await db
      .select()
      .from(broadcastPrograms)
      .where(eq(broadcastPrograms.id, id));
    
    return program;
  }

  async getAllBroadcastPrograms(): Promise<BroadcastProgram[]> {
    return db.select().from(broadcastPrograms);
  }

  async updateBroadcastProgram(id: number, programData: Partial<InsertBroadcastProgram>): Promise<BroadcastProgram> {
    try {
      // Sử dụng cách tiếp cận truyền thống với Drizzle ORM
      const [program] = await db
        .update(broadcastPrograms)
        .set(programData)
        .where(eq(broadcastPrograms.id, id))
        .returning();
      
      return program;
    } catch (drizzleError) {
      console.error("Drizzle update error:", drizzleError);
      
      // Fallback: Sử dụng SQL thuần
      try {
        console.log("Fallback to raw SQL for broadcast program update");
        
        let dateValue = null;
        if (programData.date) {
          dateValue = programData.date instanceof Date 
            ? programData.date.toISOString() 
            : new Date(programData.date as string).toISOString();
        }
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (programData.name) {
          updates.push(`name = $${paramIndex}`);
          values.push(programData.name);
          paramIndex++;
        }
        
        if (dateValue) {
          updates.push(`date = $${paramIndex}`);
          values.push(dateValue);
          paramIndex++;
        }
        
        if (programData.settings) {
          updates.push(`settings = $${paramIndex}`);
          values.push(JSON.stringify(programData.settings));
          paramIndex++;
        }
        
        if (updates.length === 0) {
          throw new Error("No fields to update");
        }
        
        values.push(id);
        const result = await pool.query(
          `UPDATE broadcast_programs 
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex}
           RETURNING *`,
          values
        );
        
        if (result.rows && result.rows.length > 0) {
          return result.rows[0] as BroadcastProgram;
        }
        throw new Error("Failed to update broadcast program with raw SQL");
      } catch (sqlError) {
        console.error("Raw SQL update error:", sqlError);
        throw new Error(`Không thể cập nhật chương trình phát: ${sqlError.message || drizzleError.message}`);
      }
    }
  }

  async deleteBroadcastProgram(id: number): Promise<void> {
    await db
      .delete(broadcastPrograms)
      .where(eq(broadcastPrograms.id, id));
  }

  async getBroadcastProgramCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(broadcastPrograms);
    return result[0].count;
  }

  // Playlist operations
  async createPlaylist(playlistData: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values(playlistData)
      .returning();
    
    return playlist;
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id));
    
    return playlist;
  }

  async getPlaylistByProgramId(programId: number): Promise<Playlist | undefined> {
    try {
      console.log("Storage: Getting playlist for program ID:", programId);
      
      const [playlist] = await db
        .select()
        .from(playlists)
        .where(eq(playlists.broadcastProgramId, programId));
      
      console.log("Storage: Found playlist:", playlist);
      
      return playlist;
    } catch (error) {
      console.error("Error in getPlaylistByProgramId:", error);
      throw error;
    }
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    return db.select().from(playlists);
  }

  async updatePlaylist(id: number, playlistData: Partial<InsertPlaylist>): Promise<Playlist> {
    try {
      console.log("Database updatePlaylist - ID:", id);
      console.log("Database updatePlaylist - Data:", JSON.stringify(playlistData));
      
      // Validate the id
      if (isNaN(id) || id <= 0) {
        throw new Error(`Invalid playlist ID: ${id}`);
      }
      
      const [playlist] = await db
        .update(playlists)
        .set({
          items: playlistData.items
        })
        .where(eq(playlists.id, id))
        .returning();
      
      console.log("Database updatePlaylist - Result:", JSON.stringify(playlist));
      return playlist;
    } catch (error) {
      console.error("Error updating playlist:", error);
      throw error;
    }
  }

  async deletePlaylist(id: number): Promise<void> {
    await db
      .delete(playlists)
      .where(eq(playlists.id, id));
  }

  // Broadcast assignment operations
  async createBroadcastAssignment(assignmentData: InsertBroadcastAssignment): Promise<BroadcastAssignment> {
    const [assignment] = await db
      .insert(broadcastAssignments)
      .values(assignmentData)
      .returning();
    
    return assignment;
  }

  async getBroadcastAssignment(id: number): Promise<BroadcastAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(broadcastAssignments)
      .where(eq(broadcastAssignments.id, id));
    
    return assignment;
  }

  async getAllBroadcastAssignments(): Promise<BroadcastAssignment[]> {
    return db.select().from(broadcastAssignments);
  }

  async getSupermarketBroadcastAssignments(supermarketId: number): Promise<BroadcastAssignment[]> {
    return db
      .select()
      .from(broadcastAssignments)
      .where(eq(broadcastAssignments.supermarketId, supermarketId));
  }

  async getBroadcastProgramAssignments(programId: number): Promise<BroadcastAssignment[]> {
    return db
      .select()
      .from(broadcastAssignments)
      .where(eq(broadcastAssignments.broadcastProgramId, programId));
  }

  async updateBroadcastAssignment(id: number, assignmentData: Partial<InsertBroadcastAssignment>): Promise<BroadcastAssignment> {
    const [assignment] = await db
      .update(broadcastAssignments)
      .set(assignmentData)
      .where(eq(broadcastAssignments.id, id))
      .returning();
    
    return assignment;
  }

  async deleteBroadcastAssignment(id: number): Promise<void> {
    await db
      .delete(broadcastAssignments)
      .where(eq(broadcastAssignments.id, id));
  }
}

// Export a singleton instance of the database storage
export const storage = new DatabaseStorage();