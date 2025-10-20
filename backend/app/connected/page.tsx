import Link from "next/link";

export default function ConnectedPage({
  searchParams
}: {
  searchParams: { uid?: string; state?: string };
}) {
  return (
    <main
      style={{
        maxWidth: "42rem",
        margin: "4rem auto",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        padding: "0 1.5rem"
      }}
    >
      <h1>Tuya account linked</h1>
      <p>
        Your Tuya account is now connected. You can close this page and return
        to the EcoHome app.
      </p>
      <section
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          borderRadius: "0.5rem",
          border: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(0,0,0,0.03)"
        }}
      >
        <p>
          <strong>UID:</strong> {searchParams.uid ?? "not provided"}
        </p>
        {searchParams.state && (
          <p>
            <strong>State:</strong> {searchParams.state}
          </p>
        )}
      </section>
      <p style={{ marginTop: "1.5rem" }}>
        Need to trigger the flow again?{" "}
        <Link href="/api/tuya/login">Start a new Tuya login</Link>.
      </p>
    </main>
  );
}
