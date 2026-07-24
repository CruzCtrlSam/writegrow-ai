"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/client";
import { appPath } from "@/lib/paths";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = appPath("/login");
        return;
      }
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <div className="bg-grain min-h-screen p-8 text-ink/60">Loading...</div>;
  }

  return (
    <div className="bg-grain min-h-screen">
      <AppNav
        links={[
          { href: "/parent/dashboard", label: "Parent Dashboard" },
          { href: "/parent/settings", label: "Settings" },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
