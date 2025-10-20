export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        EcoHome Tuya Integration API
      </h1>
      <p style={{ maxWidth: "40rem", textAlign: "center", lineHeight: 1.5 }}>
        This Next.js application exposes Tuya integration endpoints under{" "}
        <code>/api/tuya/*</code>. Deploy on Vercel and configure the environment
        variables listed in the README to enable OAuth login, device listing,
        energy readings, and command control.
      </p>
    </main>
  );
}
