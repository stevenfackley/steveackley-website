import { pgTable, text, timestamp, boolean, pgEnum, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("Role", ["ADMIN", "CLIENT"]);
export const messageTypeEnum = pgEnum("MessageType", ["GENERAL", "PROJECT_REQUEST"]);
export const environmentEnum = pgEnum("Environment", ["PRODUCTION", "TEST", "DEVELOPMENT"]);

// User table
export const users = pgTable("User", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  companyName: text("companyName"),
  contactFirstName: text("contactFirstName"),
  contactLastName: text("contactLastName"),
  role: roleEnum("role").notNull().default("CLIENT"),
  logo: text("logo"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ClientApp table
export const clientApps = pgTable("ClientApp", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  productName: text("productName"),
  companyName: text("companyName"),
  environment: environmentEnum("environment").notNull().default("PRODUCTION"),
  url: text("url").notNull(),
  description: text("description"),
  icon: text("icon"),
  favicon: text("favicon"),
  ogImage: text("ogImage"),
  isLive: boolean("isLive").notNull().default(true),
  metadataFetchedAt: timestamp("metadataFetchedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// UserApp junction table
export const userApps = pgTable("UserApp", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  appId: text("appId").notNull().references(() => clientApps.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.appId] }),
}));

// Message table
export const messages = pgTable("Message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromUserId: text("fromUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: text("toUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  type: messageTypeEnum("type").notNull().default("GENERAL"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  toUserReadCreatedIdx: index("Message_toUserId_read_createdAt_idx").on(table.toUserId, table.read, table.createdAt.desc()),
  fromUserCreatedIdx: index("Message_fromUserId_createdAt_idx").on(table.fromUserId, table.createdAt.desc()),
}));

// Post table
export const posts = pgTable("Post", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("coverImage"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  publishedCreatedIdx: index("Post_published_createdAt_idx").on(table.published, table.createdAt.desc()),
}));

// SiteSetting table
export const siteSettings = pgTable("SiteSetting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apps: many(userApps),
  sentMessages: many(messages, { relationName: "SentMessages" }),
  receivedMessages: many(messages, { relationName: "ReceivedMessages" }),
}));

export const clientAppsRelations = relations(clientApps, ({ many }) => ({
  users: many(userApps),
}));

export const userAppsRelations = relations(userApps, ({ one }) => ({
  user: one(users, {
    fields: [userApps.userId],
    references: [users.id],
  }),
  app: one(clientApps, {
    fields: [userApps.appId],
    references: [clientApps.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
    relationName: "SentMessages",
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
    relationName: "ReceivedMessages",
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClientApp = typeof clientApps.$inferSelect;
export type NewClientApp = typeof clientApps.$inferInsert;
export type UserApp = typeof userApps.$inferSelect;
export type NewUserApp = typeof userApps.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;
