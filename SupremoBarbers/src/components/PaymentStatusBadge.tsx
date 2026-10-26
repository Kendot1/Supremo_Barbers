import React from "react";
import { Badge } from "./ui/badge";

type PaymentStatus = "pending" | "confirmed" | "rejected" | "paid";

function getPaymentStatusConfig(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return { label: "Payment Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    case "confirmed":
      return { label: "Payment Confirmed", className: "bg-blue-100 text-blue-700 border-blue-200" };
    case "paid":
      return { label: "Paid", className: "bg-green-100 text-green-700 border-green-200" };
    case "rejected":
      return { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" };
    default:
      return { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" };
  }
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = getPaymentStatusConfig(status);
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

