"use client";

import { ToastProvider } from "@sfood/ui";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
