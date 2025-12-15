"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NextAuthProvider from "@/components/providers/NextAuthProvider";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <NextAuthProvider>
        <UnsavedChangesProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
          </ThemeProvider>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </UnsavedChangesProvider>
      </NextAuthProvider>
    </ReactQueryProvider>
  );
}
