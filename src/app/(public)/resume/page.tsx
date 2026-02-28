import type { Metadata } from "next";
import { getSiteSetting, SETTING_KEYS } from "@/lib/settings";
import { ResumeClient } from "./ResumeClient";

export const metadata: Metadata = { title: "Resume" };

export default async function ResumePage() {
  const avatarUrl = await getSiteSetting(SETTING_KEYS.AVATAR_URL);
  return <ResumeClient avatarUrl={avatarUrl} />;
}
