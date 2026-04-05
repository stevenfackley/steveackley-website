import { count, desc, eq } from "drizzle-orm";
import {
  clientApps,
  db,
  messages,
  posts,
  siteSettings,
  users,
} from "@shared/index";

export async function getAdminOverview() {
  const [
    [postCount],
    [publishedCount],
    [userCount],
    [clientCount],
    [appCount],
    [messageCount],
  ] = await Promise.all([
    db.select({ value: count() }).from(posts),
    db.select({ value: count() }).from(posts).where(eq(posts.published, true)),
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(eq(users.role, "CLIENT")),
    db.select({ value: count() }).from(clientApps),
    db.select({ value: count() }).from(messages),
  ]);

  return {
    posts: postCount?.value ?? 0,
    publishedPosts: publishedCount?.value ?? 0,
    users: userCount?.value ?? 0,
    clients: clientCount?.value ?? 0,
    apps: appCount?.value ?? 0,
    messages: messageCount?.value ?? 0,
  };
}

export async function getRecentMessages(limit = 20) {
  return db
    .select({
      id: messages.id,
      subject: messages.subject,
      body: messages.body,
      type: messages.type,
      read: messages.read,
      createdAt: messages.createdAt,
      toUserId: messages.toUserId,
      fromUserId: messages.fromUserId,
    })
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export async function getSettingsSnapshot() {
  return db.select().from(siteSettings).orderBy(siteSettings.key);
}

export async function getUsersSnapshot() {
  return db.select().from(users).orderBy(users.createdAt);
}

export async function getClientsSnapshot() {
  return db.select().from(users).where(eq(users.role, "CLIENT")).orderBy(users.createdAt);
}

export async function getAppsSnapshot() {
  return db.select().from(clientApps).orderBy(clientApps.createdAt);
}

export async function getPostsSnapshot() {
  return db.select().from(posts).orderBy(desc(posts.createdAt));
}
