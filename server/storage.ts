import {
  users,
  User,
  InsertUser,
  activityLogs,
  ActivityLog,
  InsertActivityLog,
  supermarkets,
  Supermarket,
  InsertSupermarket,
  audioFiles,
  AudioFile,
  InsertAudioFile,
  broadcastPrograms,
  BroadcastProgram,
  InsertBroadcastProgram,
  playlists,
  Playlist,
  InsertPlaylist,
  broadcastAssignments,
  BroadcastAssignment,
  InsertBroadcastAssignment,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserStatus(id: number, status: string): Promise<void>;
  deleteUser(id: number): Promise<void>;
  getUserCount(): Promise<number>;
  
  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(since: Date): Promise<ActivityLog[]>;
  getRecentActivities(limit: number): Promise<ActivityLog[]>;
  
  // Supermarket operations
  createSupermarket(supermarket: InsertSupermarket): Promise<Supermarket>;
  getSupermarket(id: number): Promise<Supermarket | undefined>;
  getAllSupermarkets(): Promise<Supermarket[]>;
  updateSupermarket(id: number, supermarket: InsertSupermarket): Promise<Supermarket>;
  deleteSupermarket(id: number): Promise<void>;
  updateSupermarketStatus(id: number, status: string): Promise<void>;
  updateSupermarketCurrentProgram(id: number, programName: string | null): Promise<void>;
  getSupermarketCount(): Promise<number>;
  
  // Audio file operations
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  getAudioFile(id: number): Promise<AudioFile | undefined>;
  getAllAudioFiles(): Promise<AudioFile[]>;
  deleteAudioFile(id: number): Promise<void>;
  updateAudioFileStatus(id: number, status: string): Promise<void>;
  isAudioFileUsed(id: number): Promise<boolean>;
  getAudioFileCount(): Promise<number>;
  
  // Broadcast program operations
  createBroadcastProgram(program: InsertBroadcastProgram): Promise<BroadcastProgram>;
  getBroadcastProgram(id: number): Promise<BroadcastProgram | undefined>;
  getAllBroadcastPrograms(): Promise<BroadcastProgram[]>;
  updateBroadcastProgram(id: number, program: Partial<InsertBroadcastProgram>): Promise<BroadcastProgram>;
  deleteBroadcastProgram(id: number): Promise<void>;
  getBroadcastProgramCount(): Promise<number>;
  
  // Playlist operations
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  getPlaylist(id: number): Promise<Playlist | undefined>;
  getPlaylistByProgramId(programId: number): Promise<Playlist | undefined>;
  getAllPlaylists(): Promise<Playlist[]>;
  updatePlaylist(id: number, playlist: Partial<InsertPlaylist>): Promise<Playlist>;
  deletePlaylist(id: number): Promise<void>;
  
  // Broadcast assignment operations
  createBroadcastAssignment(assignment: InsertBroadcastAssignment): Promise<BroadcastAssignment>;
  getBroadcastAssignment(id: number): Promise<BroadcastAssignment | undefined>;
  getAllBroadcastAssignments(): Promise<BroadcastAssignment[]>;
  getSupermarketBroadcastAssignments(supermarketId: number): Promise<BroadcastAssignment[]>;
  getBroadcastProgramAssignments(programId: number): Promise<BroadcastAssignment[]>;
  updateBroadcastAssignment(id: number, assignment: Partial<InsertBroadcastAssignment>): Promise<BroadcastAssignment>;
  deleteBroadcastAssignment(id: number): Promise<void>;
  
  // Session storage
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private activityLogsMap: Map<number, ActivityLog>;
  private supermarketsMap: Map<number, Supermarket>;
  private audioFilesMap: Map<number, AudioFile>;
  private broadcastProgramsMap: Map<number, BroadcastProgram>;
  private playlistsMap: Map<number, Playlist>;
  private broadcastAssignmentsMap: Map<number, BroadcastAssignment>;
  
  // Current IDs
  private userIdCounter: number;
  private activityLogIdCounter: number;
  private supermarketIdCounter: number;
  private audioFileIdCounter: number;
  private broadcastProgramIdCounter: number;
  private playlistIdCounter: number;
  private broadcastAssignmentIdCounter: number;
  
  // Session store
  sessionStore: session.Store;

  constructor() {
    // Initialize maps
    this.usersMap = new Map();
    this.activityLogsMap = new Map();
    this.supermarketsMap = new Map();
    this.audioFilesMap = new Map();
    this.broadcastProgramsMap = new Map();
    this.playlistsMap = new Map();
    this.broadcastAssignmentsMap = new Map();
    
    // Initialize ID counters
    this.userIdCounter = 1;
    this.activityLogIdCounter = 1;
    this.supermarketIdCounter = 1;
    this.audioFileIdCounter = 1;
    this.broadcastProgramIdCounter = 1;
    this.playlistIdCounter = 1;
    this.broadcastAssignmentIdCounter = 1;
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    
    const user: User = {
      ...userData,
      id,
      createdAt,
    };
    
    this.usersMap.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    const user = this.usersMap.get(id);
    if (user) {
      user.password = password;
      this.usersMap.set(id, user);
    }
  }

  async updateUserStatus(id: number, status: string): Promise<void> {
    const user = this.usersMap.get(id);
    if (user) {
      user.status = status;
      this.usersMap.set(id, user);
    }
  }
  
  async deleteUser(id: number): Promise<void> {
    this.usersMap.delete(id);
  }

  async getUserCount(): Promise<number> {
    return this.usersMap.size;
  }

  // Activity logs
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const timestamp = new Date();
    
    const log: ActivityLog = {
      ...logData,
      id,
      timestamp,
    };
    
    this.activityLogsMap.set(id, log);
    return log;
  }

  async getActivityLogs(since: Date): Promise<ActivityLog[]> {
    return Array.from(this.activityLogsMap.values())
      .filter(log => log.timestamp >= since)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getRecentActivities(limit: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLogsMap.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Supermarket operations
  async createSupermarket(supermarketData: InsertSupermarket): Promise<Supermarket> {
    const id = this.supermarketIdCounter++;
    const createdAt = new Date();
    
    const supermarket: Supermarket = {
      ...supermarketData,
      id,
      createdAt,
    };
    
    this.supermarketsMap.set(id, supermarket);
    return supermarket;
  }

  async getSupermarket(id: number): Promise<Supermarket | undefined> {
    return this.supermarketsMap.get(id);
  }

  async getAllSupermarkets(): Promise<Supermarket[]> {
    return Array.from(this.supermarketsMap.values());
  }

  async updateSupermarket(id: number, supermarketData: InsertSupermarket): Promise<Supermarket> {
    const existingSupermarket = this.supermarketsMap.get(id);
    if (!existingSupermarket) {
      throw new Error("Supermarket not found");
    }
    
    const updatedSupermarket: Supermarket = {
      ...existingSupermarket,
      ...supermarketData,
    };
    
    this.supermarketsMap.set(id, updatedSupermarket);
    return updatedSupermarket;
  }

  async deleteSupermarket(id: number): Promise<void> {
    this.supermarketsMap.delete(id);
  }

  async updateSupermarketStatus(id: number, status: string): Promise<void> {
    const supermarket = this.supermarketsMap.get(id);
    if (supermarket) {
      supermarket.status = status;
      this.supermarketsMap.set(id, supermarket);
    }
  }

  async updateSupermarketCurrentProgram(id: number, programName: string | null): Promise<void> {
    const supermarket = this.supermarketsMap.get(id);
    if (supermarket) {
      supermarket.currentProgram = programName || undefined;
      this.supermarketsMap.set(id, supermarket);
    }
  }

  async getSupermarketCount(): Promise<number> {
    return this.supermarketsMap.size;
  }

  // Audio file operations
  async createAudioFile(audioFileData: InsertAudioFile): Promise<AudioFile> {
    const id = this.audioFileIdCounter++;
    const uploadedAt = new Date();
    
    const audioFile: AudioFile = {
      ...audioFileData,
      id,
      uploadedAt,
    };
    
    this.audioFilesMap.set(id, audioFile);
    return audioFile;
  }

  async getAudioFile(id: number): Promise<AudioFile | undefined> {
    return this.audioFilesMap.get(id);
  }

  async getAllAudioFiles(): Promise<AudioFile[]> {
    return Array.from(this.audioFilesMap.values());
  }

  async deleteAudioFile(id: number): Promise<void> {
    this.audioFilesMap.delete(id);
  }

  async updateAudioFileStatus(id: number, status: string): Promise<void> {
    const audioFile = this.audioFilesMap.get(id);
    if (audioFile) {
      audioFile.status = status;
      this.audioFilesMap.set(id, audioFile);
    }
  }

  async isAudioFileUsed(id: number): Promise<boolean> {
    // Check if the audio file is used in any playlist
    for (const playlist of this.playlistsMap.values()) {
      const items = JSON.parse(JSON.stringify(playlist.items)); // Convert from JSON type
      if (items.some((item: any) => item.audioFileId === id)) {
        return true;
      }
    }
    return false;
  }

  async getAudioFileCount(): Promise<number> {
    return this.audioFilesMap.size;
  }

  // Broadcast program operations
  async createBroadcastProgram(programData: InsertBroadcastProgram): Promise<BroadcastProgram> {
    const id = this.broadcastProgramIdCounter++;
    const createdAt = new Date();
    
    const program: BroadcastProgram = {
      ...programData,
      id,
      createdAt,
    };
    
    this.broadcastProgramsMap.set(id, program);
    return program;
  }

  async getBroadcastProgram(id: number): Promise<BroadcastProgram | undefined> {
    return this.broadcastProgramsMap.get(id);
  }

  async getAllBroadcastPrograms(): Promise<BroadcastProgram[]> {
    return Array.from(this.broadcastProgramsMap.values());
  }

  async updateBroadcastProgram(id: number, programData: Partial<InsertBroadcastProgram>): Promise<BroadcastProgram> {
    const existingProgram = this.broadcastProgramsMap.get(id);
    if (!existingProgram) {
      throw new Error("Broadcast program not found");
    }
    
    const updatedProgram: BroadcastProgram = {
      ...existingProgram,
      ...programData,
    };
    
    this.broadcastProgramsMap.set(id, updatedProgram);
    return updatedProgram;
  }

  async deleteBroadcastProgram(id: number): Promise<void> {
    this.broadcastProgramsMap.delete(id);
  }

  async getBroadcastProgramCount(): Promise<number> {
    return this.broadcastProgramsMap.size;
  }

  // Playlist operations
  async createPlaylist(playlistData: InsertPlaylist): Promise<Playlist> {
    const id = this.playlistIdCounter++;
    const createdAt = new Date();
    
    const playlist: Playlist = {
      ...playlistData,
      id,
      createdAt,
    };
    
    this.playlistsMap.set(id, playlist);
    return playlist;
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    return this.playlistsMap.get(id);
  }

  async getPlaylistByProgramId(programId: number): Promise<Playlist | undefined> {
    return Array.from(this.playlistsMap.values()).find(
      (playlist) => playlist.broadcastProgramId === programId
    );
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    return Array.from(this.playlistsMap.values());
  }

  async updatePlaylist(id: number, playlistData: Partial<InsertPlaylist>): Promise<Playlist> {
    const existingPlaylist = this.playlistsMap.get(id);
    if (!existingPlaylist) {
      throw new Error("Playlist not found");
    }
    
    const updatedPlaylist: Playlist = {
      ...existingPlaylist,
      ...playlistData,
    };
    
    this.playlistsMap.set(id, updatedPlaylist);
    return updatedPlaylist;
  }

  async deletePlaylist(id: number): Promise<void> {
    this.playlistsMap.delete(id);
  }

  // Broadcast assignment operations
  async createBroadcastAssignment(assignmentData: InsertBroadcastAssignment): Promise<BroadcastAssignment> {
    const id = this.broadcastAssignmentIdCounter++;
    const assignedAt = new Date();
    
    const assignment: BroadcastAssignment = {
      ...assignmentData,
      id,
      assignedAt,
    };
    
    this.broadcastAssignmentsMap.set(id, assignment);
    return assignment;
  }

  async getBroadcastAssignment(id: number): Promise<BroadcastAssignment | undefined> {
    return this.broadcastAssignmentsMap.get(id);
  }

  async getAllBroadcastAssignments(): Promise<BroadcastAssignment[]> {
    return Array.from(this.broadcastAssignmentsMap.values());
  }

  async getSupermarketBroadcastAssignments(supermarketId: number): Promise<BroadcastAssignment[]> {
    return Array.from(this.broadcastAssignmentsMap.values()).filter(
      (assignment) => assignment.supermarketId === supermarketId
    );
  }

  async getBroadcastProgramAssignments(programId: number): Promise<BroadcastAssignment[]> {
    return Array.from(this.broadcastAssignmentsMap.values()).filter(
      (assignment) => assignment.broadcastProgramId === programId
    );
  }

  async updateBroadcastAssignment(id: number, assignmentData: Partial<InsertBroadcastAssignment>): Promise<BroadcastAssignment> {
    const existingAssignment = this.broadcastAssignmentsMap.get(id);
    if (!existingAssignment) {
      throw new Error("Broadcast assignment not found");
    }
    
    const updatedAssignment: BroadcastAssignment = {
      ...existingAssignment,
      ...assignmentData,
    };
    
    this.broadcastAssignmentsMap.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteBroadcastAssignment(id: number): Promise<void> {
    this.broadcastAssignmentsMap.delete(id);
  }
}

// Export the database storage instead of memory storage
import { DatabaseStorage } from './database-storage';
export const storage = new DatabaseStorage();
