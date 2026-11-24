export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-neutral uppercase">
        Es Magico
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-near-black sm:text-4xl">
        Student Results Portal
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-charcoal">
        Phase 1 foundation is in place: data contract, Prisma schema, API
        design, grading module, and deployment scaffolding. Import and student
        screens arrive in the next phase.
      </p>
      <div className="mt-8 border border-border bg-white px-4 py-3 text-sm text-charcoal">
        Health check:{" "}
        <code className="font-mono text-near-black">GET /api/health</code>
      </div>
    </main>
  );
}
