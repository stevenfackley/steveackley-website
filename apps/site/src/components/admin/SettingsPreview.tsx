"use client";
import { useState, useEffect } from "react";

interface SettingsPreviewProps {
  settings: Record<string, string>;
}

export function SettingsPreview({ settings }: SettingsPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-[var(--surface-hover)] rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-[var(--surface-hover)] rounded w-3/4"></div>
          <div className="h-4 bg-[var(--surface-hover)] rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const getSetting = (key: string) => settings[key] || '';

  return (
    <div className="space-y-6">
      {/* Site Preview */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Site Preview</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">How your site appears to visitors</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {getSetting('site_title') || 'Your Site Title'}
            </h4>
            <p className="text-sm text-[var(--text-secondary)]">
              {getSetting('site_description') || 'Your site description'}
            </p>
          </div>
          
          {getSetting('site_keywords') && (
            <div className="flex flex-wrap gap-2">
              {getSetting('site_keywords').split(',').map((keyword, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-[var(--surface-hover)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                >
                  {keyword.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Social Preview */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Social Media Preview</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">How links appear when shared</p>
        </div>
        <div className="p-6">
          <div className="border border-[var(--border)] rounded-xl overflow-hidden max-w-md">
            {getSetting('og_image') && (
              <div className="aspect-[1.91/1] bg-[var(--surface-hover)]">
                <img
                  src={getSetting('og_image')}
                  alt="Open Graph"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4 bg-[var(--background)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">
                {getSetting('site_url')?.replace(/^https?:\/\//, '') || 'yoursite.com'}
              </p>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                {getSetting('og_title') || getSetting('site_title') || 'Page Title'}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {getSetting('og_description') || getSetting('site_description') || 'Page description'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Preview */}
      {(getSetting('contact_email') || getSetting('contact_phone')) && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contact Information</h3>
          </div>
          <div className="p-6 space-y-3">
            {getSetting('contact_email') && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Email</p>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{getSetting('contact_email')}</p>
                </div>
              </div>
            )}
            {getSetting('contact_phone') && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Phone</p>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{getSetting('contact_phone')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Preview */}
      {(getSetting('google_analytics_id') || getSetting('google_tag_manager_id')) && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Analytics & Tracking</h3>
          </div>
          <div className="p-6 space-y-3">
            {getSetting('google_analytics_id') && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.84 2.998v18.004c0 .55-.446.996-.996.996h-4.992a.996.996 0 01-.996-.996V2.998c0-.55.446-.996.996-.996h4.992c.55 0 .996.446.996.996zm-9.984 9.002v9.002c0 .55-.446.996-.996.996H6.868a.996.996 0 01-.996-.996V12c0-.55.446-.996.996-.996h4.992c.55 0 .996.446.996.996zM2.872 16.5v4.502c0 .55-.446.996-.996.996H.996A.996.996 0 010 21.002V16.5c0-.55.446-.996.996-.996h.88c.55 0 .996.446.996.996z" />
                </svg>
                <span className="text-sm text-[var(--text-secondary)]">Google Analytics: <code className="text-xs bg-[var(--surface-hover)] px-1.5 py-0.5 rounded">{getSetting('google_analytics_id')}</code></span>
              </div>
            )}
            {getSetting('google_tag_manager_id') && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L1.5 6v12l10.5 6 10.5-6V6L12 0zm0 2.268l8.5 4.866v9.732L12 21.732l-8.5-4.866V7.134L12 2.268z" />
                </svg>
                <span className="text-sm text-[var(--text-secondary)]">Google Tag Manager: <code className="text-xs bg-[var(--surface-hover)] px-1.5 py-0.5 rounded">{getSetting('google_tag_manager_id')}</code></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
