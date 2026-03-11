import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgEnum, pgTable, timestamp, text, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const roleEnum = pgEnum("Role", ["ADMIN", "CLIENT"]);
const messageTypeEnum = pgEnum("MessageType", ["GENERAL", "PROJECT_REQUEST"]);
const environmentEnum = pgEnum("Environment", ["PRODUCTION", "TEST", "DEVELOPMENT"]);
const users = pgTable("User", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash"),
  // renamed from password for legacy compatibility
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  companyName: text("companyName"),
  contactFirstName: text("contactFirstName"),
  contactLastName: text("contactLastName"),
  role: roleEnum("role").notNull().default("CLIENT"),
  logo: text("logo"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
});
const sessions = pgTable("Session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" })
});
const accounts = pgTable("Account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
});
const verifications = pgTable("Verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
});
const clientApps = pgTable("ClientApp", {
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
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
});
const userApps = pgTable("UserApp", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  appId: text("appId").notNull().references(() => clientApps.id, { onDelete: "cascade" })
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.appId] })
}));
const messages = pgTable("Message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromUserId: text("fromUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: text("toUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  type: messageTypeEnum("type").notNull().default("GENERAL"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
}, (table) => ({
  toUserReadCreatedIdx: index("Message_toUserId_read_createdAt_idx").on(table.toUserId, table.read, table.createdAt.desc()),
  fromUserCreatedIdx: index("Message_fromUserId_createdAt_idx").on(table.fromUserId, table.createdAt.desc())
}));
const posts = pgTable("Post", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("coverImage"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
}, (table) => ({
  publishedCreatedIdx: index("Post_published_createdAt_idx").on(table.published, table.createdAt.desc())
}));
const siteSettings = pgTable("SiteSetting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
});
const usersRelations = relations(users, ({ many }) => ({
  apps: many(userApps),
  sentMessages: many(messages, { relationName: "SentMessages" }),
  receivedMessages: many(messages, { relationName: "ReceivedMessages" }),
  sessions: many(sessions),
  accounts: many(accounts)
}));
const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));
const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}));
const clientAppsRelations = relations(clientApps, ({ many }) => ({
  users: many(userApps)
}));
const userAppsRelations = relations(userApps, ({ one }) => ({
  user: one(users, {
    fields: [userApps.userId],
    references: [users.id]
  }),
  app: one(clientApps, {
    fields: [userApps.appId],
    references: [clientApps.id]
  })
}));
const messagesRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
    relationName: "SentMessages"
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
    relationName: "ReceivedMessages"
  })
}));

const schema = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  accounts,
  accountsRelations,
  clientApps,
  clientAppsRelations,
  environmentEnum,
  messageTypeEnum,
  messages,
  messagesRelations,
  posts,
  roleEnum,
  sessions,
  sessionsRelations,
  siteSettings,
  userApps,
  userAppsRelations,
  users,
  usersRelations,
  verifications
}, Symbol.toStringTag, { value: 'Module' }));

const globalForDb = globalThis;
const queryClient = globalForDb.queryClient ?? postgres(process.env.DATABASE_URL, {
  max: process.env.NODE_ENV === "production" ? 10 : 1,
  prepare: false
  // Required for query batching
});
if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}
const db = drizzle(queryClient, { schema });

export { accounts as a, db as d, posts as p, sessions as s, users as u, verifications as v };
