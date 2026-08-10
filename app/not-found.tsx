import Link from "next/link";

export const metadata = {
  title: "404 | CR-CIPI",
};

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <div style={{ textAlign: "center", maxWidth: "40ch" }}>
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.9rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#a7302f",
          }}
        >
          404
        </p>
        <h1
          style={{
            margin: "0 0 1rem",
            fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#101010",
          }}
        >
          Page not found
        </h1>
        <p style={{ margin: "0 0 1.5rem", color: "#7e7e7e" }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/en"
          style={{
            display: "inline-block",
            padding: "0.8rem 1.6rem",
            borderRadius: "999px",
            background: "#a7302f",
            color: "#ffffff",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go to Home
        </Link>
      </div>
    </main>
  );
}