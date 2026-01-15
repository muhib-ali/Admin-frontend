"use client";

import { useState } from "react";

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async (data: any[], filename: string) => {
    setIsExporting(true);
    try {
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, exportToCSV };
}
