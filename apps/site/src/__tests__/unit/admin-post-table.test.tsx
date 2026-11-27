// @vitest-environment jsdom
/**
 * Unit tests for src/components/admin/AdminPostTable.tsx
 *
 * Rendered in jsdom. `astro:actions` is a virtual module and is mocked.
 * The table renders both a mobile card list and a desktop table, so each
 * control appears twice; the tests use the first.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { PostSummary } from "@/types";

const h = vi.hoisted(() => ({
  togglePublished: vi.fn(),
  deletePost: vi.fn(),
}));

vi.mock("astro:actions", () => ({
  actions: { togglePublished: h.togglePublished, deletePost: h.deletePost },
}));

import { AdminPostTable } from "@/components/admin/AdminPostTable";

const post: PostSummary = {
  id: "p1",
  title: "First Post",
  slug: "first-post",
  excerpt: null,
  coverImage: null,
  published: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
};

const failure = { data: undefined, error: { message: "Unauthorized" } };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("AdminPostTable status badge", () => {
  // Each post is rendered twice: the mobile card and the desktop table row.
  it("shows Published or Draft from the published flag in both layouts", () => {
    render(
      <AdminPostTable
        posts={[
          { ...post, id: "d", title: "A Draft", slug: "a-draft", published: false },
          { ...post, id: "p", title: "A Live One", slug: "a-live-one", published: true },
        ]}
      />,
    );

    const drafts = screen.getAllByText("Draft", { exact: true });
    const live = screen.getAllByText("Published", { exact: true });
    expect(drafts).toHaveLength(2);
    expect(live).toHaveLength(2);
    for (const badge of drafts) expect(badge).toHaveClass("bg-secondary");
    for (const badge of live) expect(badge).toHaveClass("bg-primary");
  });

  it("shows a post waiting for its scheduled time as Scheduled in both layouts", () => {
    const scheduled = { ...post, published: false, scheduledAt: new Date("2099-01-01T09:00:00Z") };
    render(<AdminPostTable posts={[scheduled]} />);

    const badges = screen.getAllByText("Scheduled", { exact: true });
    expect(badges).toHaveLength(2);
    for (const badge of badges) {
      expect(badge).toHaveClass("text-foreground");
      expect(badge).not.toHaveClass("bg-secondary");
      expect(badge).not.toHaveClass("bg-primary");
    }
    expect(screen.queryByText("Draft", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Published", { exact: true })).not.toBeInTheDocument();
  });

  it("still says Scheduled when the time has passed and the cron has not run yet", () => {
    const due = { ...post, published: false, scheduledAt: new Date("2020-01-01T09:00:00Z") };
    render(<AdminPostTable posts={[due]} />);

    expect(screen.getAllByText("Scheduled", { exact: true })).toHaveLength(2);
    expect(screen.queryByText("Draft", { exact: true })).not.toBeInTheDocument();
  });

  it("shows a published post as Published whatever its schedule time", () => {
    render(
      <AdminPostTable
        posts={[
          { ...post, id: "a", title: "Was Scheduled", slug: "was-scheduled", published: true, scheduledAt: new Date("2020-01-01T09:00:00Z") },
          { ...post, id: "b", title: "Published Early", slug: "published-early", published: true, scheduledAt: new Date("2099-01-01T09:00:00Z") },
        ]}
      />,
    );

    expect(screen.getAllByText("Published", { exact: true })).toHaveLength(4);
    expect(screen.queryByText("Scheduled", { exact: true })).not.toBeInTheDocument();
  });

  it("shows an unpublished post with no schedule time as Draft", () => {
    render(<AdminPostTable posts={[{ ...post, published: false, scheduledAt: null }]} />);

    expect(screen.getAllByText("Draft", { exact: true })).toHaveLength(2);
    expect(screen.queryByText("Scheduled", { exact: true })).not.toBeInTheDocument();
  });
});

describe("AdminPostTable action errors", () => {
  it("shows the error when publishing fails", async () => {
    h.togglePublished.mockResolvedValue(failure);
    render(<AdminPostTable posts={[post]} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Publish post: First Post" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorized");
    expect(h.togglePublished).toHaveBeenCalledWith({ id: "p1", published: true });
  });

  it("shows the error when deleting fails", async () => {
    h.deletePost.mockResolvedValue(failure);
    render(<AdminPostTable posts={[post]} />);

    const del = screen.getAllByRole("button", { name: "Delete post: First Post" })[0];
    fireEvent.click(del); // arms the confirm
    fireEvent.click(del); // confirms

    expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorized");
    expect(h.deletePost).toHaveBeenCalledWith({ id: "p1" });
  });
});
