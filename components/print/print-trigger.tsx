"use client"

export function PrintTrigger() {
  return (
    <button
      type="button"
      className="no-print"
      style={{
        marginTop: "12px",
        width: "100%",
        padding: "8px",
        cursor: "pointer",
      }}
      onClick={() => window.print()}
    >
      Imprimir
    </button>
  )
}
