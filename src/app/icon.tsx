import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Geometric favicon — a hexagon with a blue-to-purple gradient and an inner
 * diamond accent, matching the site's gradient-start / gradient-end palette.
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
          background: "transparent",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Hexagon background */}
          <path
            d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
            fill="url(#g1)"
          />

          {/* Inner diamond accent */}
          <path
            d="M16 8 L22 16 L16 24 L10 16 Z"
            fill="url(#g2)"
            opacity="0.35"
          />

          {/* Center dot */}
          <circle cx="16" cy="16" r="3.5" fill="url(#g2)" />

          {/* Subtle corner triangles for depth */}
          <path
            d="M16 2 L22 9 L16 9 Z"
            fill="white"
            opacity="0.12"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
