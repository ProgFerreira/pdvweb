"use client"

import type { ReactNode } from "react"
import type { ToastProps } from "@/components/ui/toast"
import { confirmDialog, showToast, type SwalToastVariant } from "@/lib/swal"

type ToastInput = {
  title?: ReactNode
  description?: ReactNode
  variant?: ToastProps["variant"] | SwalToastVariant
}

function nodeToText(value?: ReactNode): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === "string" || typeof value === "number") return String(value)
  return undefined
}

function toast({ title, description, variant }: ToastInput) {
  const titleText = nodeToText(title) ?? ""
  const descriptionText = nodeToText(description)

  void showToast({
    title: titleText,
    text: descriptionText,
    variant: (variant as SwalToastVariant) ?? "default",
  })

  return {
    id: "swal",
    dismiss: () => {},
    update: () => {},
  }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: () => {},
  }
}

export { useToast, toast, confirmDialog }
