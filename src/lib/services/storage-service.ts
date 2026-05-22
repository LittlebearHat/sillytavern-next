import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface StorageProvider {
  read(filePath: string): Promise<Buffer | null>;
  write(filePath: string, data: Buffer | string): Promise<void>;
  delete(filePath: string): Promise<boolean>;
  exists(filePath: string): Promise<boolean>;
  list(dirPath: string): Promise<string[]>;
  getUrl(filePath: string): string;
}

/**
 * 本地文件系统存储
 */
class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), "data");
    this.ensureDir(this.baseDir);
  }

  private resolvePath(filePath: string): string {
    const resolved = path.resolve(this.baseDir, filePath);
    // 安全检查: 防止路径遍历
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error("Path traversal detected");
    }
    return resolved;
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async read(filePath: string): Promise<Buffer | null> {
    const resolved = this.resolvePath(filePath);
    if (!fs.existsSync(resolved)) return null;
    return fs.readFileSync(resolved);
  }

  async write(filePath: string, data: Buffer | string): Promise<void> {
    const resolved = this.resolvePath(filePath);
    this.ensureDir(path.dirname(resolved));
    fs.writeFileSync(resolved, data);
  }

  async delete(filePath: string): Promise<boolean> {
    const resolved = this.resolvePath(filePath);
    if (!fs.existsSync(resolved)) return false;
    fs.unlinkSync(resolved);
    return true;
  }

  async exists(filePath: string): Promise<boolean> {
    const resolved = this.resolvePath(filePath);
    return fs.existsSync(resolved);
  }

  async list(dirPath: string): Promise<string[]> {
    const resolved = this.resolvePath(dirPath);
    if (!fs.existsSync(resolved)) return [];
    return fs.readdirSync(resolved);
  }

  getUrl(filePath: string): string {
    return `/api/files/${filePath}`;
  }
}

/**
 * 生成唯一文件名
 */
export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

/**
 * 获取用户专属存储目录
 */
export function getUserStoragePath(userId: string, subDir: string): string {
  return path.join("users", userId, subDir);
}

// 导出单例
export const storage: StorageProvider = new LocalStorageProvider();

// 预定义子目录
export const STORAGE_DIRS = {
  avatars: "avatars",
  characters: "characters",
  chats: "chats",
  backgrounds: "backgrounds",
  uploads: "uploads",
  worldinfo: "worldinfo",
  presets: "presets",
  themes: "themes",
} as const;
