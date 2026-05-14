import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { findSection } from "@/features/settings/lib/sections";
import { AuditLogSection } from "@/features/settings/components/sections/audit-log-section";
import { BrandingSection } from "@/features/settings/components/sections/branding-section";
import { CategoriesSection } from "@/features/settings/components/sections/categories-section";
import { DangerSection } from "@/features/settings/components/sections/danger-section";
import { DataSection } from "@/features/settings/components/sections/data-section";
import { GeneralSection } from "@/features/settings/components/sections/general-section";
import { InventoryRulesSection } from "@/features/settings/components/sections/inventory-rules-section";
import { MembersSection } from "@/features/settings/components/sections/members-section";
import { NotificationsSection } from "@/features/settings/components/sections/notifications-section";
import { PreferencesSection } from "@/features/settings/components/sections/preferences-section";
import { ProfileSection } from "@/features/settings/components/sections/profile-section";
import { SecuritySection } from "@/features/settings/components/sections/security-section";

type Params = { section: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { section } = await params;
  const meta = findSection(section);
  if (!meta) return { title: "Ajustes" };
  return { title: `${meta.label} · Ajustes` };
}

const SECTIONS: Record<string, () => React.ReactNode> = {
  general: () => <GeneralSection />,
  branding: () => <BrandingSection />,
  members: () => <MembersSection />,
  categories: () => <CategoriesSection />,
  inventory: () => <InventoryRulesSection />,
  notifications: () => <NotificationsSection />,
  audit: () => <AuditLogSection />,
  profile: () => <ProfileSection />,
  preferences: () => <PreferencesSection />,
  security: () => <SecuritySection />,
  data: () => <DataSection />,
  danger: () => <DangerSection />,
};

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section } = await params;
  const renderer = SECTIONS[section];
  if (!renderer) notFound();
  return renderer();
}
