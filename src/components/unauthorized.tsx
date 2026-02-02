"use client";

export default function Unauthorized({
  msg = "You don't have access to this page.",
}: {
  msg?: string;
}) {
  return (
    <div className="ml-6 mt-6 inline-block rounded-md border border-red-300 bg-red-100 p-4 text-sm text-red-600">
      {msg}
    </div>
  );
}
