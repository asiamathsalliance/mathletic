/**
 * Static decorative background shapes — flat single-color fills at low
 * opacity, fixed behind all content. No motion, no gradients.
 */
export function BackgroundShapes() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Large circle — top right corner */}
      <svg
        className="absolute -top-24 -right-28"
        width="320"
        height="320"
        viewBox="0 0 320 320"
      >
        <circle cx="160" cy="160" r="160" fill="#B8D444" opacity="0.08" />
      </svg>

      {/* Soft blob — bottom left */}
      <svg
        className="absolute -bottom-20 -left-24"
        width="360"
        height="300"
        viewBox="0 0 360 300"
        style={{ transform: "rotate(-12deg)" }}
      >
        <path
          d="M188 8c62 6 130 30 156 82 26 51 2 126-48 164s-124 40-186 16C48 246 2 196 0 142 -2 88 44 42 96 20 122 10 156 5 188 8Z"
          fill="#8FA82F"
          opacity="0.07"
        />
      </svg>

      {/* Rounded triangle — mid left gutter */}
      <svg
        className="absolute top-1/3 -left-10"
        width="150"
        height="150"
        viewBox="0 0 150 150"
        style={{ transform: "rotate(18deg)" }}
      >
        <path
          d="M75 12c6 0 11 3 14 8l52 90c3 5 3 12 0 17s-8 8-14 8H23c-6 0-11-3-14-8s-3-12 0-17l52-90c3-5 8-8 14-8Z"
          fill="#B8D444"
          opacity="0.07"
        />
      </svg>

      {/* Small circle — upper left */}
      <svg
        className="absolute top-24 left-[8%]"
        width="90"
        height="90"
        viewBox="0 0 90 90"
      >
        <circle cx="45" cy="45" r="45" fill="#8FA82F" opacity="0.06" />
      </svg>

      {/* Hexagon — bottom right gutter */}
      <svg
        className="absolute bottom-28 -right-12"
        width="170"
        height="170"
        viewBox="0 0 170 170"
        style={{ transform: "rotate(-8deg)" }}
      >
        <path
          d="M85 5l65 37.5v75L85 155 20 117.5v-75L85 5Z"
          fill="#B8D444"
          opacity="0.06"
        />
      </svg>

      {/* Small rounded square — mid right */}
      <svg
        className="absolute top-1/2 right-[4%]"
        width="70"
        height="70"
        viewBox="0 0 70 70"
        style={{ transform: "rotate(22deg)" }}
      >
        <rect width="70" height="70" rx="18" fill="#8FA82F" opacity="0.05" />
      </svg>
    </div>
  );
}
