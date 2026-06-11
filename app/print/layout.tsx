import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Impressão",
}

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @page { margin: 4mm; }
        body {
          margin: 0;
          padding: 0;
          font-family: "Courier New", monospace;
          font-size: 11px;
          background: #fff;
        }
        .print-receipt {
          width: 80mm;
          margin: 0 auto;
          padding: 4px;
        }
        .print-receipt * {
          box-sizing: border-box;
        }
        .print-receipt .center { text-align: center; }
        .print-receipt .bold { font-weight: bold; }
        .print-receipt .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .print-receipt .row { display: flex; justify-content: space-between; margin: 1px 0; }
        .print-receipt .title { font-size: 14px; font-weight: bold; }
        .print-receipt .order-num { font-size: 22px; font-weight: bold; }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="print-receipt">{children}</div>
    </>
  )
}
