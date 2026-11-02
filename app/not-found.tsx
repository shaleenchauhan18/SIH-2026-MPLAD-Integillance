import Link from "next/link";
export default function NotFound() {
  return (
    <div className="text-center py-20">
      <div className="text-4xl font-semibold">404</div>
      <div className="text-muted mt-2">Requested resource was not found in the MPLAD dataset.</div>
      <Link href="/" className="inline-block mt-4 text-accent hover:underline">← Back to dashboard</Link>
    </div>
  );
}
