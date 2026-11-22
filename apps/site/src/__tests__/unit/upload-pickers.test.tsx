// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { SettingsUploadField } from "@/components/admin/SettingsUploadField";

// The file pickers must offer the same image types the upload route accepts.
const EXPECTED_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

afterEach(() => {
  cleanup();
});

function fileInputAccept(container: HTMLElement): string | null {
  return container.querySelector('input[type="file"]')?.getAttribute("accept") ?? null;
}

describe("image file pickers", () => {
  it("ImageUploadButton offers the allowed image types", () => {
    const { container } = render(<ImageUploadButton onUpload={() => {}} />);
    expect(fileInputAccept(container)).toBe(EXPECTED_ACCEPT);
  });

  it("SettingsUploadField offers the allowed image types", () => {
    const { container } = render(<SettingsUploadField name="avatar_url" />);
    expect(fileInputAccept(container)).toBe(EXPECTED_ACCEPT);
  });
});
