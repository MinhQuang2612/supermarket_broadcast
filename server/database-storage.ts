import { IStorage } from './storage';
import { db } from './db';
import { 
  users, activityLogs, supermarkets, audioFiles, 
  broadcastPrograms, playlists, broadcastAssignments,
  User, ActivityLog, Supermarket, AudioFile, 
  BroadcastProgram, Playlist, BroadcastAssignment,
  InsertUser, InsertActivityLog, InsertSupermarket, InsertAudioFile,
  InsertBroadcastProgram, InsertPlaylist, InsertBroadcastAssignment
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

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0].count;
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
    const usedPlaylists = await db
      .select()
      .from(playlists)
      .where(sql`json_array_length(items) > 0 AND EXISTS (
        SELECT 1 FROM json_each(items) 
        WHERE json_extract(value, '$.audioFileId') = ${id}
      )`);
    
    return usedPlaylists.length > 0;
  }

  async getAudioFileCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(audioFiles);
    return result[0].count;
  }

  // Broadcast program operations
  async createBroadcastProgram(programData: InsertBroadcastProgram): Promise<BroadcastProgram> {
    const [program] = await db
      .insert(broadcastPrograms)
      .values(programData)
      .returning();
    
    return program;
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
    const [program] = await db
      .update(broadcastPrograms)
      .set(programData)
      .where(eq(broadcastPrograms.id, id))
      .returning();
    
    return program;
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
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(eq(playlists.broadcastProgramId, programId));
    
    return playlist;
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    return db.select().from(playlists);
  }

  async updatePlaylist(id: number, playlistData: Partial<InsertPlaylist>): Promise<Playlist> {
    const [playlist] = await db
      .update(playlists)
      .set(playlistData)
      .where(eq(playlists.id, id))
      .returning();
    
    return playlist;
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