import { revalidatePath } from "next/cache";
import { getSettingsSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { setSiteSetting, SETTING_KEYS } from "@shared/lib/settings";
import { SettingsEditForm, type SettingsFormState } from "./settings-edit-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminSession();

  const settings = await getSettingsSnapshot();
  const getValue = (key: string) => settings.find((s) => s.key === key)?.value ?? "";

  async function saveSettings(
    _prev: SettingsFormState,
    formData: FormData,
  ): Promise<SettingsFormState> {
    "use server";

    await requireAdminSession();

    const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
    const couplePhotoUrl = String(formData.get("couplePhotoUrl") ?? "").trim();

    await Promise.all([
      setSiteSetting(SETTING_KEYS.AVATAR_URL, avatarUrl),
      setSiteSetting(SETTING_KEYS.COUPLE_PHOTO_URL, couplePhotoUrl),
    ]);

    revalidatePath("/admin/settings");

    return { error: null, success: true };
  }

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/settings" />
      <section className="portal-card portal-grid-spaced">
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Site Configuration</p>
            <h2 className="portal-section-title">Settings</h2>
          </div>
        </div>

        <SettingsEditForm
          action={saveSettings}
          initialValues={{
            avatarUrl: getValue(SETTING_KEYS.AVATAR_URL),
            couplePhotoUrl: getValue(SETTING_KEYS.COUPLE_PHOTO_URL),
          }}
        />
      </section>

      <section className="portal-card portal-grid-spaced" style={{ marginTop: "1.5rem" }}>
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Configuration Snapshot</p>
            <h2 className="portal-section-title">All Keys</h2>
          </div>
          <div className="portal-inline-metrics">
            <div className="portal-inline-metric">
              <strong>{settings.length}</strong>
              <span>keys</span>
            </div>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td>{setting.key}</td>
                <td className="portal-muted">{setting.value}</td>
                <td>{setting.updatedAt?.toLocaleString() ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
