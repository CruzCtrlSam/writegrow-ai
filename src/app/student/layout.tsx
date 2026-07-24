"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/client";
import { appPath } from "@/lib/paths";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="bg-grain min-h-screen p-8 text-ink/60">Loading...</div>}>
      <StudentLayoutInner>{children}</StudentLayoutInner>
    </Suspense>
  );
}

function StudentLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");
  const [studentName, setStudentName] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = appPath("/login");
        return;
      }
      if (studentId) {
        const { data } = await supabase
          .from("students")
          .select("name")
          .eq("id", studentId)
          .maybeSingle();
        setStudentName(data?.name);
      }
      setReady(true);
    }
    load();
  }, [studentId]);

  const query = studentId ? `?studentId=${studentId}` : "";

  if (!ready) {
    return <div className="bg-grain min-h-screen p-8 text-ink/60">Loading...</div>;
  }

  return (
    <div className="bg-grain min-h-screen">
      <AppNav
        studentName={studentName}
        links={[
          { href: `/student/dashboard${query}`, label: "Student Dashboard" },
          { href: `/student/write${query}`, label: "Write Today" },
          { href: `/student/history${query}`, label: "Writing History" },
          { href: `/student/progress${query}`, label: "Progress" },
        ]}
      />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Link
          href="/parent/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-ink/55 hover:text-ink"
        >
          ← All students
        </Link>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
