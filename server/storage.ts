import {
  users,
  User,
  InsertUser,
  activityLogs,
  ActivityLog,
  InsertActivityLog,
  regions,
  Region,
  InsertRegion,
  provinces,
  Province,
  InsertProvince,
  communes,
  Commune,
  InsertCommune,
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
  SupermarketType,
  AudioGroup,
  InsertAudioGroup,
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
  
  // Region operations
  createRegion(region: InsertRegion): Promise<Region>;
  getRegion(id: number): Promise<Region | undefined>;
  getRegionByCode(code: string): Promise<Region | undefined>;
  getAllRegions(): Promise<Region[]>;
  updateRegion(id: number, region: InsertRegion): Promise<Region>;
  deleteRegion(id: number): Promise<void>;
  
  // Province operations
  createProvince(province: InsertProvince): Promise<Province>;
  getProvince(id: number): Promise<Province | undefined>;
  getAllProvinces(): Promise<Province[]>;
  getProvincesByRegion(regionId: number): Promise<Province[]>;
  updateProvince(id: number, province: InsertProvince): Promise<Province>;
  deleteProvince(id: number): Promise<void>;
  
  // Commune operations
  createCommune(commune: InsertCommune): Promise<Commune>;
  getCommune(id: number): Promise<Commune | undefined>;
  getAllCommunes(): Promise<Commune[]>;
  getCommunesByProvince(provinceId: number): Promise<Commune[]>;
  updateCommune(id: number, commune: InsertCommune): Promise<Commune>;
  deleteCommune(id: number): Promise<void>;
  
  // Supermarket operations
  createSupermarket(supermarket: InsertSupermarket): Promise<Supermarket>;
  getSupermarket(id: number): Promise<Supermarket | undefined>;
  getAllSupermarkets(): Promise<Supermarket[]>;
  updateSupermarket(id: number, supermarket: InsertSupermarket): Promise<Supermarket>;
  deleteSupermarket(id: number): Promise<void>;
  updateSupermarketStatus(id: number, status: string): Promise<void>;
  getSupermarketCount(): Promise<number>;
  getAllSupermarketTypes(): Promise<SupermarketType[]>;
  
  // Audio file operations
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  getAudioFile(id: number): Promise<AudioFile | undefined>;
  getAllAudioFiles(): Promise<AudioFile[]>;
  deleteAudioFile(id: number): Promise<void>;
  updateAudioFileStatus(id: number, status: string): Promise<void>;
  isAudioFileUsed(id: number): Promise<boolean>;
  getAudioFileCount(): Promise<number>;
  
  // Audio Group operations
  createAudioGroup(groupData: InsertAudioGroup): Promise<AudioGroup>;
  getAudioGroup(id: number): Promise<AudioGroup | undefined>;
  getAudioGroupByName(name: string): Promise<AudioGroup | undefined>;
  getAllAudioGroups(): Promise<AudioGroup[]>;
  updateAudioGroup(id: number, groupData: Partial<InsertAudioGroup>): Promise<AudioGroup>;
  deleteAudioGroup(id: number): Promise<void>;
  updateAudioGroupFrequency(id: number, frequency: number): Promise<void>;
  
  // Session storage
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private activityLogsMap: Map<number, ActivityLog>;
  private regionsMap: Map<number, Region>;
  private provincesMap: Map<number, Province>;
  private communesMap: Map<number, Commune>;
  private supermarketsMap: Map<number, Supermarket>;
  private audioFilesMap: Map<number, AudioFile>;
  private broadcastProgramsMap: Map<number, BroadcastProgram>;
  private playlistsMap: Map<number, Playlist>;
  private audioGroupsMap: Map<number, AudioGroup>;
  
  // Current IDs
  private userIdCounter: number;
  private activityLogIdCounter: number;
  private regionIdCounter: number;
  private provinceIdCounter: number;
  private communeIdCounter: number;
  private supermarketIdCounter: number;
  private audioFileIdCounter: number;
  private broadcastProgramIdCounter: number;
  private playlistIdCounter: number;
  private audioGroupIdCounter: number;
  
  // Session store
  sessionStore: session.Store;

  constructor() {
    // Initialize maps
    this.usersMap = new Map();
    this.activityLogsMap = new Map();
    this.regionsMap = new Map();
    this.provincesMap = new Map();
    this.communesMap = new Map();
    this.supermarketsMap = new Map();
    this.audioFilesMap = new Map();
    this.broadcastProgramsMap = new Map();
    this.playlistsMap = new Map();
    this.audioGroupsMap = new Map();
    
    // Initialize ID counters
    this.userIdCounter = 1;
    this.activityLogIdCounter = 1;
    this.regionIdCounter = 1;
    this.provinceIdCounter = 1;
    this.communeIdCounter = 1;
    this.supermarketIdCounter = 1;
    this.audioFileIdCounter = 1;
    this.broadcastProgramIdCounter = 1;
    this.playlistIdCounter = 1;
    this.audioGroupIdCounter = 1;
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Initialize default regions
    this.createRegion({ name: "Miền Bắc", code: "north" });
    this.createRegion({ name: "Miền Trung", code: "central" });
    this.createRegion({ name: "Miền Nam", code: "south" });
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
      role: userData.role ?? 'user',
      status: userData.status ?? 'active',
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
  
  // Region operations
  async createRegion(regionData: InsertRegion): Promise<Region> {
    const id = this.regionIdCounter++;
    
    const region: Region = {
      ...regionData,
      id,
    };
    
    this.regionsMap.set(id, region);
    return region;
  }

  async getRegion(id: number): Promise<Region | undefined> {
    return this.regionsMap.get(id);
  }
  
  async getRegionByCode(code: string): Promise<Region | undefined> {
    return Array.from(this.regionsMap.values()).find(
      (region) => region.code === code
    );
  }

  async getAllRegions(): Promise<Region[]> {
    return Array.from(this.regionsMap.values());
  }

  async updateRegion(id: number, regionData: InsertRegion): Promise<Region> {
    const existingRegion = this.regionsMap.get(id);
    if (!existingRegion) {
      throw new Error("Region not found");
    }
    
    const updatedRegion: Region = {
      ...existingRegion,
      ...regionData,
    };
    
    this.regionsMap.set(id, updatedRegion);
    return updatedRegion;
  }

  async deleteRegion(id: number): Promise<void> {
    this.regionsMap.delete(id);
  }
  
  // Province operations
  async createProvince(provinceData: InsertProvince): Promise<Province> {
    const id = this.provinceIdCounter++;
    
    const province: Province = {
      ...provinceData,
      id,
    };
    
    this.provincesMap.set(id, province);
    return province;
  }

  async getProvince(id: number): Promise<Province | undefined> {
    return this.provincesMap.get(id);
  }

  async getAllProvinces(): Promise<Province[]> {
    return Array.from(this.provincesMap.values());
  }
  
  async getProvincesByRegion(regionId: number): Promise<Province[]> {
    return Array.from(this.provincesMap.values()).filter(
      (province) => province.regionId === regionId
    );
  }

  async updateProvince(id: number, provinceData: InsertProvince): Promise<Province> {
    const existingProvince = this.provincesMap.get(id);
    if (!existingProvince) {
      throw new Error("Province not found");
    }
    
    const updatedProvince: Province = {
      ...existingProvince,
      ...provinceData,
    };
    
    this.provincesMap.set(id, updatedProvince);
    return updatedProvince;
  }

  async deleteProvince(id: number): Promise<void> {
    this.provincesMap.delete(id);
  }
  
  // Commune operations
  async createCommune(communeData: InsertCommune): Promise<Commune> {
    const id = this.communeIdCounter++;
    
    const commune: Commune = {
      ...communeData,
      id,
    };
    
    this.communesMap.set(id, commune);
    return commune;
  }

  async getCommune(id: number): Promise<Commune | undefined> {
    return this.communesMap.get(id);
  }

  async getAllCommunes(): Promise<Commune[]> {
    return Array.from(this.communesMap.values());
  }
  
  async getCommunesByProvince(provinceId: number): Promise<Commune[]> {
    return Array.from(this.communesMap.values()).filter(
      (commune) => commune.provinceId === provinceId
    );
  }

  async updateCommune(id: number, communeData: InsertCommune): Promise<Commune> {
    const existingCommune = this.communesMap.get(id);
    if (!existingCommune) {
      throw new Error("Commune not found");
    }
    
    const updatedCommune: Commune = {
      ...existingCommune,
      ...communeData,
    };
    
    this.communesMap.set(id, updatedCommune);
    return updatedCommune;
  }

  async deleteCommune(id: number): Promise<void> {
    this.communesMap.delete(id);
  }

  // Supermarket operations
  async createSupermarket(supermarketData: InsertSupermarket): Promise<Supermarket> {
    const id = this.supermarketIdCounter++;
    const createdAt = new Date();
    const supermarket: Supermarket = {
      ...supermarketData,
      id,
      createdAt,
      status: supermarketData.status ?? 'active',
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

  async getSupermarketCount(): Promise<number> {
    return this.supermarketsMap.size;
  }

  async getAllSupermarketTypes(): Promise<SupermarketType[]> {
    return [
      { id: 1, name: "general", displayName: "Siêu thị lớn" },
      { id: 2, name: "mini", displayName: "Siêu thị mini" },
      { id: 3, name: "hyper", displayName: "Siêu thị hyper" },
    ];
  }

  // Audio file operations
  async createAudioFile(audioFileData: InsertAudioFile): Promise<AudioFile> {
    const id = this.audioFileIdCounter++;
    const uploadedAt = new Date();
    const audioFile: AudioFile = {
      ...audioFileData,
      id,
      uploadedAt,
      status: audioFileData.status ?? 'unused',
      sampleRate: audioFileData.sampleRate ?? null,
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
    // Kiểm tra nếu có playlist nào có id trùng với id audio
    for (const playlist of Array.from(this.playlistsMap.values())) {
      if (playlist.id === id) {
        return true;
      }
    }
    return false;
  }

  async getAudioFileCount(): Promise<number> {
    return this.audioFilesMap.size;
  }

  // Audio Group operations
  async createAudioGroup(groupData: InsertAudioGroup): Promise<AudioGroup> {
    const id = this.audioGroupIdCounter++;
    const group: AudioGroup = {
      ...groupData,
      id,
      frequency: groupData.frequency ?? 1,
    };
    this.audioGroupsMap.set(id, group);
    return group;
  }

  async getAudioGroup(id: number): Promise<AudioGroup | undefined> {
    return this.audioGroupsMap.get(id);
  }

  async getAudioGroupByName(name: string): Promise<AudioGroup | undefined> {
    return Array.from(this.audioGroupsMap.values()).find(
      (group) => group.name === name
    );
  }

  async getAllAudioGroups(): Promise<AudioGroup[]> {
    return Array.from(this.audioGroupsMap.values());
  }

  async updateAudioGroup(id: number, groupData: Partial<InsertAudioGroup>): Promise<AudioGroup> {
    const existingGroup = this.audioGroupsMap.get(id);
    if (!existingGroup) {
      throw new Error("Audio group not found");
    }
    
    const updatedGroup: AudioGroup = {
      ...existingGroup,
      ...groupData,
    };
    
    this.audioGroupsMap.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteAudioGroup(id: number): Promise<void> {
    this.audioGroupsMap.delete(id);
  }

  async updateAudioGroupFrequency(id: number, frequency: number): Promise<void> {
    const group = this.audioGroupsMap.get(id);
    if (group) {
      group.frequency = frequency;
      this.audioGroupsMap.set(id, group);
    }
  }
}

// Export the database storage instead of memory storage
import { DatabaseStorage } from './database-storage';
export const storage = new DatabaseStorage();
