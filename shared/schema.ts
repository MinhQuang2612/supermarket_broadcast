import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"), // "admin", "manager", "user"
  status: text("status").notNull().default("active"), // "active", "inactive"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs),
  uploadedAudioFiles: many(audioFiles, { relationName: "uploadedBy" }),
  createdPrograms: many(broadcastPrograms, { relationName: "createdBy" }),
  assignedBroadcasts: many(broadcastAssignments, { relationName: "assignedBy" }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  details: text("details").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

// Supermarket model
export const supermarkets = pgTable("supermarkets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  region: text("region").notNull(), // "north", "central", "south"
  status: text("status").notNull().default("active"), // "active", "paused"
  currentProgram: text("current_program"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supermarketsRelations = relations(supermarkets, ({ many }) => ({
  broadcastAssignments: many(broadcastAssignments),
}));

export const insertSupermarketSchema = createInsertSchema(supermarkets).omit({
  id: true,
  createdAt: true,
});

// Audio files
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  displayName: text("display_name").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration").notNull(), // in seconds
  fileType: text("file_type").notNull(),
  group: text("group").notNull(), // "greetings", "promotions", "tips", "announcements"
  status: text("status").notNull().default("unused"), // "used", "unused"
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const audioFilesRelations = relations(audioFiles, ({ one }) => ({
  uploader: one(users, {
    fields: [audioFiles.uploadedBy],
    references: [users.id],
    relationName: "uploadedBy",
  }),
}));

export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({
  id: true,
  uploadedAt: true,
});

// Broadcast programs
export const broadcastPrograms = pgTable("broadcast_programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  settings: json("settings").notNull().$type<BroadcastProgramSettings>(), // JSON with frequency settings for each audio group
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const broadcastProgramsRelations = relations(broadcastPrograms, ({ one, many }) => ({
  creator: one(users, {
    fields: [broadcastPrograms.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  playlists: many(playlists),
  assignments: many(broadcastAssignments, { relationName: "programAssignments" }),
}));

export const insertBroadcastProgramSchema = createInsertSchema(broadcastPrograms).omit({
  id: true,
  createdAt: true,
});

// Playlists
export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  broadcastProgramId: integer("broadcast_program_id").notNull(),
  items: json("items").notNull(), // Array of playlist items with audio file IDs and times
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
});

// Supermarket broadcast assignments
export const broadcastAssignments = pgTable("broadcast_assignments", {
  id: serial("id").primaryKey(),
  supermarketId: integer("supermarket_id").notNull(),
  broadcastProgramId: integer("broadcast_program_id").notNull(),
  assignedBy: integer("assigned_by").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertBroadcastAssignmentSchema = createInsertSchema(broadcastAssignments).omit({
  id: true,
  assignedAt: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertSupermarket = z.infer<typeof insertSupermarketSchema>;
export type Supermarket = typeof supermarkets.$inferSelect;

export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type AudioFile = typeof audioFiles.$inferSelect;

export type InsertBroadcastProgram = z.infer<typeof insertBroadcastProgramSchema>;
export type BroadcastProgram = typeof broadcastPrograms.$inferSelect;

export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;

export type InsertBroadcastAssignment = z.infer<typeof insertBroadcastAssignmentSchema>;
export type BroadcastAssignment = typeof broadcastAssignments.$inferSelect;

// Group frequency settings interface
export interface GroupFrequencySettings {
  enabled: boolean;
  frequencyMinutes: number;
  maxPlays: number;
  startTime: string;
  endTime: string;
}

export interface BroadcastProgramSettings {
  greetings?: GroupFrequencySettings;
  promotions?: GroupFrequencySettings;
  tips?: GroupFrequencySettings;
  announcements?: GroupFrequencySettings;
}

export interface PlaylistItem {
  audioFileId: number;
  playTime: string; // HH:MM format
}
