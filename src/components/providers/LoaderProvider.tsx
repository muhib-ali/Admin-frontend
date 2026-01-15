"use client";

import { ReactNode } from "react";

export default function LoaderProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
