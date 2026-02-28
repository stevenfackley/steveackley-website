"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { markMessageRead, markAllRead, deleteMessage, sendMessageToClient } from "./actions";

interface ReceivedMessage {
  id: string;
  subject: string;
  body: string;
  type: "GENERAL" | "PROJECT_REQUEST";
  read: boolean;
  createdAt: Date;
  fromUser: { id: string; name: string | null; email: string };
}

interface SentMessage {
  id: string;
  subject: string;
  body: string;
  type: "GENERAL" | "PROJECT_REQUEST";
  createdAt: Date;
  toUser: { id: string; name: string | null; email: string };
}

interface Client {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  initialReceived: ReceivedMessage[];
  initialSent: SentMessage[];
  clients: Client[];
}

function formatDate(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminMessagesClient({ initialReceived, initialSent, clients }: Props) {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [received, setReceived] = useState(initialReceived);
  const [selected, setSelected] = useState<ReceivedMessage | null>(null);
  const [selectedSent, setSelectedSent] = useState<SentMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeResult, setComposeResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
      active
        ? "bg-[var(--accent)] text-white"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
    }`;

  const unreadCount = received.filter((m) => !m.read).length;

  function handleSelect(msg: ReceivedMessage) {
    setSelected(msg);
    setSelectedSent(null);
    if (!msg.read) {
      startTransition(async () => {
        await markMessageRead(msg.id);
        setReceived((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: true } : m));
      });
    }
  }

  function handleSelectSent(msg: SentMessage) {
    setSelectedSent(msg);
    setSelected(null);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllRead();
      setReceived((prev) => prev.map((m) => ({ ...m, read: true })));
    });
  }

  function handleDelete(msgId: string) {
    setDeletingId(msgId);
    startTransition(async () => {
      const r = await deleteMessage(msgId);
      if (r.success) {
        setReceived((prev) => prev.filter((m) => m.id !== msgId));
        if (selected?.id === msgId) setSelected(null);
      }
      setDeletingId(null);
    });
  }

  function handleCompose(e: React.FormEvent) {
    e.preventDefault();
    setComposeResult(null);
    startTransition(async () => {
      const r = await sendMessageToClient(toUserId, subject, body);
      setComposeResult(r);
      if (r.success) {
        setToUserId("");
        setSubject("");
        setBody("");
        setShowCompose(false);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {unreadCount > 0 ? (
              <span className="text-[var(--accent)] font-medium">{unreadCount} unread</span>
            ) : (
              "All caught up"
            )}
            {" · "}{received.length} received · {initialSent.length} sent
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && tab === "inbox" && (
            <Button type="button" variant="ghost" size="sm" isLoading={isPending} onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
          <Button type="button" variant="primary" size="sm" onClick={() => setShowCompose(true)}>
            + Compose
          </Button>
        </div>
      </div>

      {/* Compose form */}
      {showCompose && (
        <form
          onSubmit={handleCompose}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New Message</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">To *</label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Subject *</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className={inputCls} placeholder="Subject" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Message *</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} className={inputCls + " resize-y"} placeholder="Write your message…" />
          </div>
          {composeResult && !composeResult.success && (
            <p className="text-sm text-red-600">{composeResult.error}</p>
          )}
          {composeResult?.success && (
            <p className="text-sm text-emerald-600">Message sent!</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>Send</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCompose(false); setComposeResult(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button type="button" className={tabCls(tab === "inbox")} onClick={() => { setTab("inbox"); setSelectedSent(null); }}>
          Inbox
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-white/25 text-[10px] font-bold px-1">
              {unreadCount}
            </span>
          )}
        </button>
        <button type="button" className={tabCls(tab === "sent")} onClick={() => { setTab("sent"); setSelected(null); }}>
          Sent ({initialSent.length})
        </button>
      </div>

      {/* ── Inbox Tab ── */}
      {tab === "inbox" && (
        received.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
            <p className="text-3xl mb-3">📬</p>
            <p className="text-[var(--text-primary)] font-medium">No messages yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Messages from clients will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Message list */}
            <div className="lg:col-span-2 space-y-2">
              {received.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 ${
                    selected?.id === msg.id
                      ? "border-[var(--accent)] bg-[var(--surface)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!msg.read && (
                          <span className="h-2 w-2 rounded-full bg-[var(--accent)] shrink-0" />
                        )}
                        {msg.type === "PROJECT_REQUEST" && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 text-[10px] font-medium shrink-0">
                            Project Request
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 truncate ${!msg.read ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                        {msg.subject}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {msg.fromUser.name ?? msg.fromUser.email}
                      </p>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] shrink-0 mt-1">
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Message detail */}
            <div className="lg:col-span-3">
              {selected ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">{selected.subject}</h2>
                        {selected.type === "PROJECT_REQUEST" && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 text-xs font-medium">
                            Project Request
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        From: <span className="font-medium">{selected.fromUser.name ?? selected.fromUser.email}</span>
                        {" · "}{formatDate(selected.createdAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isLoading={deletingId === selected.id}
                      onClick={() => handleDelete(selected.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selected.body}</p>
                  </div>
                  {/* Quick reply */}
                  <div className="border-t border-[var(--border)] pt-4">
                    <QuickReply toUserId={selected.fromUser.id} toName={selected.fromUser.name ?? selected.fromUser.email} />
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
                  <p className="text-3xl mb-2">👈</p>
                  <p className="text-sm text-[var(--text-muted)]">Select a message to read it</p>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── Sent Tab ── */}
      {tab === "sent" && (
        initialSent.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
            <p className="text-3xl mb-3">📤</p>
            <p className="text-[var(--text-primary)] font-medium">No sent messages</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Messages you send to clients will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Sent list */}
            <div className="lg:col-span-2 space-y-2">
              {initialSent.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => handleSelectSent(msg)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 ${
                    selectedSent?.id === msg.id
                      ? "border-[var(--accent)] bg-[var(--surface)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {msg.type === "PROJECT_REQUEST" && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 text-[10px] font-medium shrink-0">
                            Project Request
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1 truncate text-[var(--text-secondary)] font-medium">
                        {msg.subject}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        To: {msg.toUser.name ?? msg.toUser.email}
                      </p>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] shrink-0 mt-1">
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Sent detail */}
            <div className="lg:col-span-3">
              {selectedSent ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-[var(--text-primary)]">{selectedSent.subject}</h2>
                      {selectedSent.type === "PROJECT_REQUEST" && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 text-xs font-medium">
                          Project Request
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      To: <span className="font-medium">{selectedSent.toUser.name ?? selectedSent.toUser.email}</span>
                      {" · "}{formatDate(selectedSent.createdAt)}
                    </p>
                  </div>
                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selectedSent.body}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
                  <p className="text-3xl mb-2">👈</p>
                  <p className="text-sm text-[var(--text-muted)]">Select a sent message to view it</p>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function QuickReply({ toUserId, toName }: { toUserId: string; toName: string }) {
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const r = await sendMessageToClient(toUserId, "Re: Your message", body);
      setResult(r);
      if (r.success) setBody("");
    });
  }

  return (
    <form onSubmit={handleReply} className="space-y-2">
      <p className="text-xs font-medium text-[var(--text-muted)]">Reply to {toName}</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
        className={inputCls + " resize-y"}
        placeholder="Write a reply…"
      />
      {result && (
        result.success
          ? <p className="text-xs text-emerald-600">Reply sent!</p>
          : <p className="text-xs text-red-600">{result.error}</p>
      )}
      <Button type="submit" variant="primary" size="sm" isLoading={isPending}>Send Reply</Button>
    </form>
  );
}
