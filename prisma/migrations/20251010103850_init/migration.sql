-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GroupStreakStatus" AS ENUM ('COMPLETED', 'MISSED', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "profile_url" TEXT,
    "profile_picture_url" TEXT,
    "real_name" TEXT,
    "github_url" TEXT,
    "linkedin_url" TEXT,
    "twitter_url" TEXT,
    "country_name" TEXT,
    "birthday" TIMESTAMP(3),
    "school" TEXT,
    "company" TEXT,
    "website_url" TEXT[],
    "ranking" INTEGER,
    "reputation" INTEGER DEFAULT 0,
    "skill_tags" TEXT[],
    "about_me" TEXT,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "accepted_submissions" INTEGER NOT NULL DEFAULT 0,
    "easy_count" INTEGER NOT NULL DEFAULT 0,
    "medium_count" INTEGER NOT NULL DEFAULT 0,
    "hard_count" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_problem_solved_at" TIMESTAMP(3),
    "total_problems_solved" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_slug" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "status_display" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT,

    CONSTRAINT "user_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "problems_solved" INTEGER NOT NULL DEFAULT 0,
    "first_problem_at" TIMESTAMP(3),

    CONSTRAINT "streak_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "invite_code" TEXT,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_streak_history" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "GroupStreakStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "streak_value" INTEGER NOT NULL DEFAULT 0,
    "active_members" INTEGER NOT NULL DEFAULT 0,
    "total_problems_solved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "group_streak_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sync_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "api_rate_limit_remaining" INTEGER,
    "partial_sync_offset" TEXT,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "user_submissions_user_id_submitted_at_idx" ON "user_submissions"("user_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "user_submissions_user_id_status_display_submitted_at_idx" ON "user_submissions"("user_id", "status_display", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_submissions_user_id_title_slug_submitted_at_key" ON "user_submissions"("user_id", "title_slug", "submitted_at");

-- CreateIndex
CREATE INDEX "streak_history_user_id_date_idx" ON "streak_history"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "streak_history_user_id_date_key" ON "streak_history"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "groups_invite_code_key" ON "groups"("invite_code");

-- CreateIndex
CREATE INDEX "user_groups_group_id_role_idx" ON "user_groups"("group_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_user_id_group_id_key" ON "user_groups"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "group_streak_history_group_id_date_idx" ON "group_streak_history"("group_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "group_streak_history_group_id_date_key" ON "group_streak_history"("group_id", "date");

-- CreateIndex
CREATE INDEX "sync_logs_user_id_sync_time_idx" ON "sync_logs"("user_id", "sync_time" DESC);

-- AddForeignKey
ALTER TABLE "user_submissions" ADD CONSTRAINT "user_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_history" ADD CONSTRAINT "streak_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_streak_history" ADD CONSTRAINT "group_streak_history_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
