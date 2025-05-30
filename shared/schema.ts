import { pgTable, text, serial, integer, boolean, timestamp, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/pg-core";

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

// Regions
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Miền Bắc", "Miền Trung", "Miền Nam"
  code: text("code").notNull().unique(), // "north", "central", "south"
});

export const regionsRelations = relations(regions, ({ many }) => ({
  provinces: many(provinces),
}));

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
});

// Provinces (Tỉnh/thành phố)
export const provinces = pgTable("provinces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  regionId: integer("region_id").notNull().references(() => regions.id),
});

export const provincesRelations = relations(provinces, ({ one, many }) => ({
  region: one(regions, {
    fields: [provinces.regionId],
    references: [regions.id],
  }),
  communes: many(communes),
  supermarkets: many(supermarkets, { relationName: "provinceSupermarkets" }),
}));

export const insertProvinceSchema = createInsertSchema(provinces).omit({
  id: true,
});

// Communes (Xã/phường)
export const communes = pgTable("communes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
});

export const communesRelations = relations(communes, ({ one, many }) => ({
  province: one(provinces, {
    fields: [communes.provinceId],
    references: [provinces.id],
  }),
  supermarkets: many(supermarkets, { relationName: "communeSupermarkets" }),
}));

export const insertCommuneSchema = createInsertSchema(communes).omit({
  id: true,
});

// Supermarket types
export const supermarketTypes = pgTable("supermarket_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Ví dụ: "general", "mini", "hyper"
  displayName: text("display_name").notNull(), // Hiển thị: "Siêu thị lớn", "Siêu thị mini", ...
});

export const supermarketTypesRelations = relations(supermarketTypes, ({ many }) => ({
  supermarkets: many(supermarkets),
}));

// Supermarket model
export const supermarkets = pgTable("supermarkets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(), // Địa chỉ chi tiết (số nhà, tên đường)
  communeId: integer("commune_id").notNull().references(() => communes.id),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
  regionId: integer("region_id").notNull().references(() => regions.id),
  status: text("status").notNull().default("active"), // "active", "paused"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  supermarketTypeId: integer("supermarket_type_id").notNull().references(() => supermarketTypes.id),
});

export const supermarketsRelations = relations(supermarkets, ({ many, one }) => ({
  commune: one(communes, {
    fields: [supermarkets.communeId],
    references: [communes.id],
    relationName: "communeSupermarkets",
  }),
  province: one(provinces, {
    fields: [supermarkets.provinceId],
    references: [provinces.id],
    relationName: "provinceSupermarkets",
  }),
  region: one(regions, {
    fields: [supermarkets.regionId],
    references: [regions.id],
  }),
  supermarketType: one(supermarketTypes, {
    fields: [supermarkets.supermarketTypeId],
    references: [supermarketTypes.id],
  }),
}));

export const insertSupermarketSchema = createInsertSchema(supermarkets).omit({
  id: true,
  createdAt: true,
});

// Audio Groups
export const audioGroups = pgTable("audio_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // "greetings", "promotions", "tips", "announcements", "music"
  frequency: integer("frequency").notNull().default(1), // Tần suất phát mặc định là 1
});

export const audioGroupsRelations = relations(audioGroups, ({ many }) => ({
  audioFiles: many(audioFiles),
}));

export const insertAudioGroupSchema = createInsertSchema(audioGroups).omit({
  id: true,
});

// Audio files
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  displayName: text("display_name").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration").notNull(), // in seconds
  sampleRate: integer("sample_rate"), // in Hz (e.g., 44100, 48000)
  fileType: text("file_type").notNull(),
  audioGroupId: integer("audio_group_id").notNull().references(() => audioGroups.id), // Foreign key to audio_groups
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
  audioGroup: one(audioGroups, {
    fields: [audioFiles.audioGroupId],
    references: [audioGroups.id],
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
  dates: date("dates").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const broadcastProgramsRelations = relations(broadcastPrograms, ({ many }) => ({
}));

// Create base schema và sau đó ghi đè định nghĩa cho trường date
const baseBroadcastProgramSchema = createInsertSchema(broadcastPrograms)
  .omit({
    id: true,
    createdAt: true,
  });

// Tạo schema cuối cùng với date được xử lý đặc biệt
export const insertBroadcastProgramSchema = baseBroadcastProgramSchema.extend({
  date: z.string().or(z.date()),  // Chấp nhận cả chuỗi và Date
});

// Playlists
export const playlists = pgTable("playlists", {
  playlistItemId: serial("playlist_item_id").primaryKey(),
  audioId: integer("audio_id").notNull(), // id của file audio
  broadcastProgramId: integer("broadcast_program_id").notNull().references(() => broadcastPrograms.id),
  name: text("name").notNull(),
  frequency: integer("frequency").notNull().default(1),
  timeSlot: text("time_slot"),
});

export const insertPlaylistSchema = createInsertSchema(playlists);

// Playlist details
export const playlistDetails = pgTable("playlist_details", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull().references(() => audioFiles.id),
  broadcastProgramId: integer("broadcast_program_id").notNull().references(() => broadcastPrograms.id),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

export const insertPlaylistDetailSchema = createInsertSchema(playlistDetails).omit({ id: true });

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

export type InsertProvince = z.infer<typeof insertProvinceSchema>;
export type Province = typeof provinces.$inferSelect;

export type InsertCommune = z.infer<typeof insertCommuneSchema>;
export type Commune = typeof communes.$inferSelect;

export type InsertSupermarket = z.infer<typeof insertSupermarketSchema>;
export type Supermarket = typeof supermarkets.$inferSelect;

export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type AudioFile = typeof audioFiles.$inferSelect;

export type InsertBroadcastProgram = z.infer<typeof insertBroadcastProgramSchema>;
export type BroadcastProgram = typeof broadcastPrograms.$inferSelect;

export type InsertSupermarketType = z.infer<typeof insertSupermarketTypeSchema>;
export type SupermarketType = typeof supermarketTypes.$inferSelect;

export type InsertAudioGroup = z.infer<typeof insertAudioGroupSchema>;
export type AudioGroup = typeof audioGroups.$inferSelect;

export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;

export type InsertPlaylistDetail = z.infer<typeof insertPlaylistDetailSchema>;
export type PlaylistDetail = typeof playlistDetails.$inferSelect;

export const insertSupermarketTypeSchema = createInsertSchema(supermarketTypes).omit({
  id: true,
});

export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
});
