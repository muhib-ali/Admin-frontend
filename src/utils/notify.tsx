"use client";

import { toast } from "sonner";

type NotifyPayload = {
  title: string;
  description?: string;
};

export function notifySuccess(title: string, description?: string) {
  toast.success(title, {
    description,
  });
}

export function notifyError(title: string, description?: string) {
  toast.error(title, {
    description,
    style: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#991b1b",
    },
  });
}

export function notifyInfo(title: string, description?: string) {
  toast.info(title, {
    description,
  });
}
