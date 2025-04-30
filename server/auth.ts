import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "supermarket-audio-system-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Tài khoản không tồn tại." });
        }
        
        if (user.status === "inactive") {
          return done(null, false, { message: "Tài khoản đã bị khóa." });
        }
        
        if (!(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Mật khẩu không chính xác." });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if the request is from an authenticated admin user
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền tạo tài khoản" });
      }
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
      }
      
      const hashedPassword = await hashPassword(req.body.password);
      
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create_user",
        details: `Tạo tài khoản mới cho ${user.fullName} (${user.username})`,
      });
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      });
    } catch (error) {
      next(error);
    }
  });

  // Special endpoint for initial admin user creation
  app.post("/api/init-admin", async (req, res, next) => {
    try {
      // Check if there are any users in the system
      const userCount = await storage.getUserCount();
      
      // Only allow creating initial admin if there are no users
      if (userCount > 0) {
        return res.status(403).json({ message: "Hệ thống đã có người dùng" });
      }
      
      const hashedPassword = await hashPassword(req.body.password);
      
      const user = await storage.createUser({
        username: req.body.username,
        password: hashedPassword,
        fullName: req.body.fullName || "Admin",
        role: "admin",
        status: "active",
      });
      
      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Đăng nhập thất bại" });
      }
      
      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Log the activity
        await storage.createActivityLog({
          userId: user.id,
          action: "login",
          details: `Đăng nhập vào hệ thống`,
        });
        
        res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      
      // Log the activity before logging out
      await storage.createActivityLog({
        userId,
        action: "logout",
        details: `Đăng xuất khỏi hệ thống`,
      });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    });
  });
  
  // Check if initial system setup is needed
  app.get("/api/check-initial-setup", async (req, res, next) => {
    try {
      const userCount = await storage.getUserCount();
      res.json({ needsInitialSetup: userCount === 0 });
    } catch (error) {
      next(error);
    }
  });

  // Change password
  app.post("/api/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Chưa đăng nhập" });
      }
      
      const { userId, currentPassword, newPassword } = req.body;
      
      // Admin can change anyone's password, regular users can only change their own
      if (userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền thay đổi mật khẩu người khác" });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      
      // If changing own password, verify current password
      if (userId === req.user.id) {
        if (!(await comparePasswords(currentPassword, targetUser.password))) {
          return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác" });
        }
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "change_password",
        details: userId === req.user.id
          ? "Thay đổi mật khẩu cho tài khoản của mình"
          : `Thay đổi mật khẩu cho ${targetUser.fullName} (${targetUser.username})`,
      });
      
      res.status(200).json({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
      next(error);
    }
  });

  // Update user status
  app.post("/api/users/:id/status", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền thay đổi trạng thái người dùng" });
      }
      
      const userId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (status !== "active" && status !== "inactive") {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
      }
      
      // Don't allow admins to deactivate themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Không thể thay đổi trạng thái của chính mình" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      
      await storage.updateUserStatus(userId, status);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: status === "active" ? "activate_user" : "deactivate_user",
        details: `${status === "active" ? "Kích hoạt" : "Khóa"} tài khoản của ${user.fullName} (${user.username})`,
      });
      
      res.status(200).json({ message: `Cập nhật trạng thái thành công` });
    } catch (error) {
      next(error);
    }
  });
}
