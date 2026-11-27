// @vitest-environment jsdom
/**
 * Unit tests for src/components/admin/PostForm.tsx
 *
 * Rendered in jsdom with the process timezone set to America/New_York, so a
 * datetime-local value that is treated as UTC shows up as a 5-hour shift.
 * `astro:actions` is a virtual module and is mocked; the TipTap editor and
 * the upload button are replaced with stubs.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const h = vi.hoisted(() => ({
  createPost: vi.fn(),
  updatePost: vi.fn(),
}));

vi.mock("astro:actions", () => ({
  actions: { createPost: h.createPost, updatePost: h.updatePost },
}));
vi.mock("@/components/admin/PostEditor", () => ({ PostEditor: () => null }));
vi.mock("@/components/admin/ImageUploadButton", () => ({ ImageUploadButton: () => null }));

import { PostForm } from "@/components/admin/PostForm";

const originalTz = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/New_York";
});

afterAll(() => {
  process.env.TZ = originalTz;
});

beforeEach(() => {
  vi.clearAllMocks();
  // Returning an error keeps the form on the page instead of navigating.
  h.createPost.mockResolvedValue({ error: "stop" });
  h.updatePost.mockResolvedValue({ error: "stop" });
});

afterEach(() => {
  cleanup();
});

function submit() {
  fireEvent.submit(screen.getByLabelText("Title *").closest("form")!);
}

describe("PostForm schedule time", () => {
  it("runs in a non-UTC zone", () => {
    expect(new Date("2026-12-01T14:00:00Z").getTimezoneOffset()).toBe(300);
  });

  it("pre-fills a stored schedule in the browser's own zone", async () => {
    render(
      <PostForm
        mode="update"
        postId="p1"
        defaultValues={{ title: "T", content: "<p>c</p>", scheduledAt: new Date("2026-12-01T14:00:00Z") }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Schedule Publish")).toHaveValue("2026-12-01T09:00"),
    );
  });

  it("round-trips a stored schedule unchanged on save", async () => {
    render(
      <PostForm
        mode="update"
        postId="p1"
        defaultValues={{ title: "T", content: "<p>c</p>", scheduledAt: new Date("2026-12-01T14:00:00Z") }}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText("Schedule Publish")).not.toHaveValue(""));

    submit();

    await waitFor(() => expect(h.updatePost).toHaveBeenCalled());
    const fd = h.updatePost.mock.calls[0][0] as FormData;
    expect(fd.get("scheduledAt")).toBe("2026-12-01T14:00:00.000Z");
  });

  it("sends a typed local time as an absolute instant", async () => {
    render(<PostForm mode="create" defaultValues={{ title: "T", content: "<p>c</p>" }} />);

    fireEvent.change(screen.getByLabelText("Schedule Publish"), { target: { value: "2026-12-01T09:00" } });
    submit();

    await waitFor(() => expect(h.createPost).toHaveBeenCalled());
    const fd = h.createPost.mock.calls[0][0] as FormData;
    expect(fd.get("scheduledAt")).toBe("2026-12-01T14:00:00.000Z");
  });

  it("sends an empty schedule when none is set", async () => {
    render(<PostForm mode="create" defaultValues={{ title: "T", content: "<p>c</p>" }} />);

    submit();

    await waitFor(() => expect(h.createPost).toHaveBeenCalled());
    const fd = h.createPost.mock.calls[0][0] as FormData;
    expect(fd.get("scheduledAt")).toBe("");
  });
});

describe("PostForm status", () => {
  const publishSwitch = () => screen.getByRole("switch", { name: "Published" });
  const submitButton = () => screen.getByRole("button", { name: /^Save/ });
  const hint = () => screen.queryByText(/^Will auto-publish on/);
  const passedHint = () => screen.queryByText(/^This time has passed/);

  it("says Draft for an unpublished post with no schedule time", () => {
    render(<PostForm mode="create" defaultValues={{ title: "T", content: "<p>c</p>" }} />);

    expect(publishSwitch()).toHaveTextContent("Draft");
    expect(publishSwitch()).toHaveAccessibleDescription("Draft");
    expect(submitButton()).toHaveTextContent("Save Draft");
    expect(hint()).not.toBeInTheDocument();
  });

  it("tells a screen reader the status, not only the switch's name", () => {
    render(<PostForm mode="create" defaultValues={{ title: "T", content: "<p>c</p>" }} />);

    fireEvent.change(screen.getByLabelText("Schedule Publish"), { target: { value: "2099-12-01T09:00" } });
    expect(publishSwitch()).toHaveAccessibleDescription("Scheduled");

    fireEvent.click(publishSwitch());
    expect(publishSwitch()).toHaveAccessibleDescription("Published");
  });

  it("says so when the schedule time has already passed", () => {
    render(<PostForm mode="create" defaultValues={{ title: "T", content: "<p>c</p>" }} />);

    fireEvent.change(screen.getByLabelText("Schedule Publish"), { target: { value: "2020-01-01T09:00" } });

    expect(publishSwitch()).toHaveTextContent("Scheduled");
    expect(passedHint()).toBeInTheDocument();
    expect(hint()).not.toBeInTheDocument();
  });

  it("promises nothing when scheduled publishing is switched off on the server", () => {
    render(
      <PostForm mode="create" schedulerEnabled={false} defaultValues={{ title: "T", content: "<p>c</p>" }} />,
    );
    const field = screen.getByLabelText("Schedule Publish");
    const offHint = () => screen.queryByText(/^Scheduled publishing is switched off on this server/);

    expect(offHint()).not.toBeInTheDocument();

    fireEvent.change(field, { target: { value: "2099-12-01T09:00" } });
    expect(publishSwitch()).toHaveTextContent("Scheduled");
    expect(offHint()).toBeInTheDocument();
    expect(hint()).not.toBeInTheDocument();

    fireEvent.change(field, { target: { value: "2020-01-01T09:00" } });
    expect(offHint()).toBeInTheDocument();
    expect(passedHint()).not.toBeInTheDocument();

    // Published now: no schedule is in play, so nothing is said about it.
    fireEvent.click(publishSwitch());
    expect(offHint()).not.toBeInTheDocument();
  });

  it("says Scheduled for an unpublished post with a stored schedule time", async () => {
    render(
      <PostForm
        mode="update"
        postId="p1"
        defaultValues={{ title: "T", content: "<p>c</p>", published: false, scheduledAt: new Date("2099-12-01T14:00:00Z") }}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText("Schedule Publish")).not.toHaveValue(""));

    expect(publishSwitch()).toHaveTextContent("Scheduled");
    expect(submitButton()).toHaveTextContent("Save & Schedule");
    expect(hint()).toBeInTheDocument();
  });

  it("goes from Draft to Scheduled when a time is typed, and back when it is cleared", () => {
    render(<PostForm mode="create" defaultValues={{ title: "T", content: "<p>c</p>" }} />);
    const field = screen.getByLabelText("Schedule Publish");

    fireEvent.change(field, { target: { value: "2099-12-01T09:00" } });
    expect(publishSwitch()).toHaveTextContent("Scheduled");
    expect(submitButton()).toHaveTextContent("Save & Schedule");
    expect(hint()).toBeInTheDocument();

    fireEvent.change(field, { target: { value: "" } });
    expect(publishSwitch()).toHaveTextContent("Draft");
    expect(submitButton()).toHaveTextContent("Save Draft");
    expect(hint()).not.toBeInTheDocument();
  });

  it("says Published, and promises no later publish, when the switch is on", async () => {
    render(
      <PostForm
        mode="update"
        postId="p1"
        defaultValues={{ title: "T", content: "<p>c</p>", published: true, scheduledAt: new Date("2099-12-01T14:00:00Z") }}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText("Schedule Publish")).not.toHaveValue(""));

    expect(publishSwitch()).toHaveTextContent("Published");
    expect(submitButton()).toHaveTextContent("Save & Publish");
    expect(hint()).not.toBeInTheDocument();

    // Switched off with the time still in the field: the form says what a save will do.
    fireEvent.click(publishSwitch());
    expect(publishSwitch()).toHaveTextContent("Scheduled");
    expect(submitButton()).toHaveTextContent("Save & Schedule");
    expect(hint()).toBeInTheDocument();
  });
});
