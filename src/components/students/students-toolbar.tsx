"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";

const SEARCH_DEBOUNCE_MS = 350;

export function StudentsToolbar({
  initialQ,
  initialGradeLevel,
  initialSection,
}: {
  initialQ: string;
  initialGradeLevel: string;
  initialSection: string;
  total?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ);
  const [gradeLevel, setGradeLevel] = useState(initialGradeLevel);
  const [section, setSection] = useState(initialSection);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipDebounce = useRef(true);

  function pushFilters(next: {
    q: string;
    gradeLevel: string;
    section: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q.trim()) params.set("q", next.q.trim());
    else params.delete("q");
    if (next.gradeLevel) params.set("gradeLevel", next.gradeLevel);
    else params.delete("gradeLevel");
    if (next.section) params.set("section", next.section);
    else params.delete("section");
    params.set("page", "1");
    startTransition(() => {
      router.push(`/students?${params.toString()}`);
    });
  }

  useEffect(() => {
    skipDebounce.current = true;
    setQ(initialQ);
    setGradeLevel(initialGradeLevel);
    setSection(initialSection);
  }, [initialQ, initialGradeLevel, initialSection]);

  useEffect(() => {
    if (skipDebounce.current) {
      skipDebounce.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushFilters({ q, gradeLevel, section });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Debounce search text only; filters apply on change/submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [q]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushFilters({ q, gradeLevel, section });
  }

  function clearFilters() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
      className="surface mb-6 grid gap-3 p-4 md:grid-cols-[1fr_8rem_8rem_auto_auto]"
    >
      <label className="block text-sm">
        <span className="mb-1 block text-neutral">Search</span>
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Name or student ID"
          className="w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-near-black outline-none transition-colors focus:border-charcoal"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-neutral">Grade</span>
        <select
          value={gradeLevel}
          onChange={(event) => {
            const value = event.target.value;
            setGradeLevel(value);
            pushFilters({ q, gradeLevel: value, section });
          }}
          className="w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-charcoal"
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
          onChange={(event) => {
            const value = event.target.value;
            setSection(value);
            pushFilters({ q, gradeLevel, section: value });
          }}
          className="w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-charcoal"
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
          {pending ? "Updating…" : "Apply"}
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
