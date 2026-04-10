"use client";

import { useActionState, useState } from "react";
import { UploadImageButton } from "../posts/[id]/upload-image-button";

export type SettingsFormState = {
  error: string | null;
  success: boolean;
};

type SettingsEditFormProps = {
  action: (
    state: SettingsFormState,
    formData: FormData,
  ) => Promise<SettingsFormState>;
  initialValues: {
    avatarUrl: string;
    couplePhotoUrl: string;
  };
};

const initialState: SettingsFormState = { error: null, success: false };

export function SettingsEditForm({ action, initialValues }: SettingsEditFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl);
  const [couplePhotoUrl, setCouplePhotoUrl] = useState(initialValues.couplePhotoUrl);

  return (
    <form action={formAction} className="portal-form-grid">
      <div className="portal-form-main">
        <section className="portal-aside-card">
          <h3 className="portal-aside-title">Avatar</h3>
          <input type="hidden" name="avatarUrl" value={avatarUrl} />
          {avatarUrl ? (
            <div className="portal-image-preview">
              <img alt="Avatar" className="portal-image-preview-media" src={avatarUrl} />
              <button className="portal-inline-button" type="button" onClick={() => setAvatarUrl("")}>
                Remove
              </button>
            </div>
          ) : (
            <div className="portal-image-empty">No avatar selected.</div>
          )}
          <UploadImageButton onUpload={setAvatarUrl} />
        </section>

        <section className="portal-aside-card">
          <h3 className="portal-aside-title">Couple Photo</h3>
          <input type="hidden" name="couplePhotoUrl" value={couplePhotoUrl} />
          {couplePhotoUrl ? (
            <div className="portal-image-preview">
              <img alt="Couple photo" className="portal-image-preview-media" src={couplePhotoUrl} />
              <button className="portal-inline-button" type="button" onClick={() => setCouplePhotoUrl("")}>
                Remove
              </button>
            </div>
          ) : (
            <div className="portal-image-empty">No couple photo selected.</div>
          )}
          <UploadImageButton onUpload={setCouplePhotoUrl} />
        </section>
      </div>

      {state.error ? <div className="portal-error-banner">{state.error}</div> : null}
      {state.success ? <div className="portal-success-banner">Settings saved.</div> : null}

      <div className="portal-form-actions">
        <button className="portal-primary-button" disabled={isPending} type="submit">
          {isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
