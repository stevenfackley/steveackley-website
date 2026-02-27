import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Masonic square-and-compasses favicon.
 *
 * Layout (24×24 viewBox scaled to 32px):
 *  • Compasses — two legs meeting at a top pivot, spreading downward (/\ shape)
 *  • Square    — vertex at the bottom, arms extending upward (\/ shape)
 *
 * Note: <text> nodes are unsupported in ImageResponse / satori, so the G
 * is omitted from the favicon. It appears in the inline SVG icons on the page.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d1b69 100%)",
          borderRadius: "7px",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Compass (hinge at top, legs pointing down) */}
          <path
            d="M12 2 L3 18 M12 2 L21 18"
            stroke="#d4af37"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="2" r="1.5" fill="#d4af37" />

          {/* Square (vertex at bottom, arms pointing up) */}
          <path
            d="M3 6 L12 22 L21 6"
            stroke="#d4af37"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
