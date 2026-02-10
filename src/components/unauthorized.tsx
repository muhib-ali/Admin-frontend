"use client";

export default function Unauthorized({
  msg = "You don't have access to this page.",
}: {
  msg?: string;
}) {
  return (
    <div className="ml-6 mt-6 inline-flex h-9 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-100 px-3 text-xs font-medium text-emerald-700 shadow-sm transition duration-150 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-200 active:translate-y-px">
      {msg}
    </div>
  );
}
