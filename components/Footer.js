export default function Footer() {
  return (
    <footer className="border-t mt-16" style={{ borderColor: "var(--border-soft)" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
        <span>&copy; {new Date().getFullYear()} TEEM SHE LMS</span>
        <span>Multi-tenant learning platform</span>
      </div>
    </footer>
  );
}