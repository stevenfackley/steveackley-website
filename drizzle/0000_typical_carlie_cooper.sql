CREATE TYPE "public"."Environment" AS ENUM('PRODUCTION', 'TEST', 'DEVELOPMENT');--> statement-breakpoint
CREATE TYPE "public"."MessageType" AS ENUM('GENERAL', 'PROJECT_REQUEST');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('ADMIN', 'CLIENT');--> statement-breakpoint
CREATE TABLE "ClientApp" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"productName" text,
	"companyName" text,
	"environment" "Environment" DEFAULT 'PRODUCTION' NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"icon" text,
	"favicon" text,
	"ogImage" text,
	"isLive" boolean DEFAULT true NOT NULL,
	"metadataFetchedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" text PRIMARY KEY NOT NULL,
	"fromUserId" text NOT NULL,
	"toUserId" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"type" "MessageType" DEFAULT 'GENERAL' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Post" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"coverImage" text,
	"published" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "SiteSetting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserApp" (
	"userId" text NOT NULL,
	"appId" text NOT NULL,
	CONSTRAINT "UserApp_userId_appId_pk" PRIMARY KEY("userId","appId")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"name" text,
	"companyName" text,
	"contactFirstName" text,
	"contactLastName" text,
	"role" "Role" DEFAULT 'CLIENT' NOT NULL,
	"logo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromUserId_User_id_fk" FOREIGN KEY ("fromUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_toUserId_User_id_fk" FOREIGN KEY ("toUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserApp" ADD CONSTRAINT "UserApp_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserApp" ADD CONSTRAINT "UserApp_appId_ClientApp_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."ClientApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Message_toUserId_read_createdAt_idx" ON "Message" USING btree ("toUserId","read","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "Message_fromUserId_createdAt_idx" ON "Message" USING btree ("fromUserId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "Post_published_createdAt_idx" ON "Post" USING btree ("published","createdAt" DESC NULLS LAST);