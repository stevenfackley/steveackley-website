<!--
Admin form fields:
  Title:    Kinsketch: a free genogram editor that saves to a file you keep
  Slug:     introducing-kinsketch (auto-derived)
  Excerpt:  Kinsketch went live on 2026-11-25. It draws genograms in the browser and saves each one as a file on your own device. It has no account, the page can't contact a server, and it is free.
  Category: Release
  Tags:     kinsketch, release, genogram, react, typescript, privacy
  Cover:    (none)
  Body:     everything below this comment
-->

Kinsketch went live on 2026-11-25 at [kinsketch.qavrensolutions.com](https://kinsketch.qavrensolutions.com). It is a genogram editor that runs in your browser and saves each drawing as a file on your own device. I built it under Qavren Solutions LLC.

A genogram is the family diagram a therapist draws with a client. Squares and circles stand for people. Lines show marriages, children and the quality of relationships.

## Why I built it

Browser genogram tools tend to keep the drawing only in the page's memory. Close the tab or let the session reset, and the drawing is gone. In therapy you usually build a genogram over several sessions, so the drawing has to survive closing the tab.

I built Kinsketch after using one of those tools. It was good software with that one flaw, and I wanted an editor without it.

## Save writes a file

When you press Save, Kinsketch writes a `.genogram.json` file to your device. At the next session you open that file and carry on where you stopped.

In Chromium browsers, Save (or Ctrl+S) writes straight back to the same file. Other browsers download a fresh copy each time you save.

## Nothing is stored anywhere else

Kinsketch has no account and no upload, and it keeps nothing in browser storage. The built page ships a Content Security Policy with `connect-src 'none'`, so your browser itself forbids the page from contacting any server. The web server that hands you the page keeps no access log.

That makes the saved file the only copy. If you delete it, the genogram is gone, and I have nothing to restore it from.

## Hard to lose by accident

If you try to leave the page with unsaved changes, the browser shows its leave-page prompt. Kinsketch shows a dialog before anything replaces the drawing on screen. The Save button turns yellow while you have unsaved changes.

## The file format

The file is the one place your work lives, so I treat its format as a contract. Every saved file carries a format version, and a published JSON Schema describes each version. When you open an older file, Kinsketch migrates it forward to the current format.

## Symbols

Kinsketch draws the standard McGoldrick and Gerson symbol set:

- men, women, nonbinary and unknown
- deceased, and the index person
- pregnancy, miscarriage, abortion and stillbirth
- twins
- adoption, fostering, donor and surrogate
- marriage, separation and divorce
- relationship lines such as close, conflicted and cut off
- households
- pets

## Pictures

You can export a genogram as SVG or PNG, or print it. Exported pictures contain no hidden data. The `.genogram.json` file stays the only thing that holds the editable family.

## Free

Kinsketch is free, and I've decided it stays that way. It has no account, no trial, no paid tier and no ads.

## The stack

The app is React 19 and TypeScript, built with Vite. I draw the diagram in plain SVG with no diagram library, and the app has three runtime dependencies. It ships as a static site with no backend, served from behind a Cloudflare Tunnel.

To try it, open [kinsketch.qavrensolutions.com](https://kinsketch.qavrensolutions.com). It needs no install and no sign-up.
