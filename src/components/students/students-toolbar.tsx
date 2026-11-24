"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function StudentsToolbar({
  initialQ,
  initialGradeLevel,
  initialSection,
}: {
  initialQ: string;
  initialGradeLevel: string;
  initialSection: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ);
  const [gradeLevel, setGradeLevel] = useState(initialGradeLevel);
  const [section, setSection] = useState(initialSection);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    if (gradeLevel) params.set("gradeLevel", gradeLevel);
    else params.delete("gradeLevel");
    if (section) params.set("section", section);
    else params.delete("section");
    params.set("page", "1");
    startTransition(() => {
      router.push(`/students?${params.toString()}`);
    });
  }

  function clearFilters() {
    setQ("");
    setGradeLevel("");
    setSection("");
    startTransition(() => {
      router.push("/students");
    });
  }

  return (
    <form
      onSubmit={applyFilters}
      className="mb-6 grid gap-3 rounded border border-border bg-white p-4 md:grid-cols-[1fr_8rem_8rem_auto_auto]"
    >
      <label className="block text-sm">
        <span className="mb-1 block text-neutral">Search</span>
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Name or student ID"
          className="w-full rounded border border-border bg-white px-3 py-2 text-sm text-near-black outline-none focus:border-charcoal"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-neutral">Grade</span>
        <select
          value={gradeLevel}
          onChange={(event) => setGradeLevel(event.target.value)}
          className="w-full rounded border border-border bg-white px-3 py-2 text-sm outline-none focus:border-charcoal"
        >
          <option value="">All</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-neutral">Section</span>
        <select
          value={section}
          onChange={(event) => setSection(event.target.value)}
          className="w-full rounded border border-border bg-white px-3 py-2 text-sm outline-none focus:border-charcoal"
        >
          <option value="">All</option>
          {["A", "B", "C", "D", "E", "F"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Filtering…" : "Apply"}
        </Button>
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          onClick={clearFilters}
          disabled={pending}
          className="w-full"
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
