import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const provenanceAssets = mysqlTable("provenanceAssets", {
  id: varchar("id", { length: 96 }).primaryKey(),
  kind: mysqlEnum("kind", ["dataset", "transformation", "feature", "model", "run", "result", "job"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["fresh", "stale", "changed", "running", "archived"]).notNull().default("fresh"),
  description: text("description"),
  owner: varchar("owner", { length: 255 }),
  checksum: varchar("checksum", { length: 128 }),
  metadata: json("metadata"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("provenanceAssets_kind_idx").on(table.kind), index("provenanceAssets_status_idx").on(table.status)]);

export const lineageEdges = mysqlTable("lineageEdges", {
  id: varchar("id", { length: 96 }).primaryKey(),
  sourceAssetId: varchar("sourceAssetId", { length: 96 }).notNull(),
  targetAssetId: varchar("targetAssetId", { length: 96 }).notNull(),
  relation: varchar("relation", { length: 64 }).notNull(),
  metadata: json("metadata"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, table => [index("lineageEdges_source_idx").on(table.sourceAssetId), index("lineageEdges_target_idx").on(table.targetAssetId)]);

export const pipelineRuns = mysqlTable("pipelineRuns", {
  id: varchar("id", { length: 96 }).primaryKey(),
  pipelineVersion: varchar("pipelineVersion", { length: 160 }).notNull(),
  workflowName: varchar("workflowName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["queued", "running", "succeeded", "failed", "stale"]).notNull(),
  inputs: json("inputs"),
  outputs: json("outputs"),
  environment: json("environment"),
  startedAt: timestamp("startedAt").notNull(),
  finishedAt: timestamp("finishedAt"),
  replayOfRunId: varchar("replayOfRunId", { length: 96 }),
}, table => [index("pipelineRuns_pipelineVersion_idx").on(table.pipelineVersion), index("pipelineRuns_status_idx").on(table.status)]);
