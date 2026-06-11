import Swal from "sweetalert2"

export type SwalToastVariant = "default" | "destructive" | "success"

const PRIMARY_COLOR = "#ea580c"
const DANGER_COLOR = "#dc2626"

const toastMixin = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  },
})

function variantToIcon(variant?: SwalToastVariant): "success" | "error" | "info" {
  if (variant === "destructive") return "error"
  if (variant === "success") return "success"
  return "success"
}

export function showToast(options: {
  title: string
  text?: string
  variant?: SwalToastVariant
}) {
  return toastMixin.fire({
    icon: variantToIcon(options.variant),
    title: options.title,
    text: options.text,
  })
}

export async function confirmDialog(options: {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: "warning" | "question" | "error" | "info"
  danger?: boolean
}): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Confirmar",
    cancelButtonText: options.cancelText ?? "Cancelar",
    confirmButtonColor: options.danger ? DANGER_COLOR : PRIMARY_COLOR,
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}

export async function alertDialog(options: {
  title: string
  text?: string
  icon?: "success" | "error" | "warning" | "info"
  confirmText?: string
}) {
  await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? "info",
    confirmButtonText: options.confirmText ?? "OK",
    confirmButtonColor: PRIMARY_COLOR,
  })
}
