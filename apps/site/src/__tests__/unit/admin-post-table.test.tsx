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
