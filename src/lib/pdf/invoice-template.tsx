import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

// ─── Types ────────────────────────────────────────────────────

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

interface InvoicePDFData {
  number: string
  status: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxTotal: number
  total: number
  currency: string
  notes: string | null
  customer: {
    name: string
    address: string | null
    email: string | null
    vatId: string | null
  }
  tenant: {
    name: string
  }
  items: InvoiceItem[]
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  tenantName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111",
  },
  invoiceLabel: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
  },
  addressBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  addressColumn: {
    width: "48%",
  },
  addressLabel: {
    fontSize: 8,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  addressText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: "1 solid #e5e5e5",
  },
  metaItem: {
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 8,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  // ─── Table ──────────────────────────────────────────────────
  table: {
    marginTop: 8,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottom: "1 solid #e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colDescription: { width: "40%", paddingRight: 8 },
  colQty: { width: "12%", textAlign: "right" },
  colUnitPrice: { width: "18%", textAlign: "right" },
  colTax: { width: "12%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },
  headerCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cell: {
    fontSize: 10,
  },
  // ─── Totals ─────────────────────────────────────────────────
  totalsSection: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  totalsContainer: {
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#666",
  },
  totalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTop: "2 solid #111",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  // ─── Notes ──────────────────────────────────────────────────
  notesSection: {
    marginTop: 30,
    paddingTop: 12,
    borderTop: "1 solid #e5e5e5",
  },
  notesLabel: {
    fontSize: 8,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  // ─── Footer ─────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#aaa",
    borderTop: "1 solid #e5e5e5",
    paddingTop: 8,
  },
})

// ─── Helpers ──────────────────────────────────────────────────

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ─── Component ────────────────────────────────────────────────

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const fmt = (n: number) => fmtCurrency(n, data.currency)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.tenantName}>{data.tenant.name}</Text>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.number}</Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.addressBlock}>
          <View style={styles.addressColumn}>
            <Text style={styles.addressLabel}>Bill to</Text>
            <Text style={[styles.addressText, { fontFamily: "Helvetica-Bold" }]}>
              {data.customer.name}
            </Text>
            {data.customer.address && (
              <Text style={styles.addressText}>{data.customer.address}</Text>
            )}
            {data.customer.email && (
              <Text style={styles.addressText}>{data.customer.email}</Text>
            )}
            {data.customer.vatId && (
              <Text style={[styles.addressText, { marginTop: 4, fontSize: 9, color: "#666" }]}>
                VAT ID: {data.customer.vatId}
              </Text>
            )}
          </View>
        </View>

        {/* Meta (dates, currency, status) */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Issue Date</Text>
            <Text style={styles.metaValue}>{fmtDate(data.issueDate)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Due Date</Text>
            <Text style={styles.metaValue}>{fmtDate(data.dueDate)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Currency</Text>
            <Text style={styles.metaValue}>{data.currency}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{data.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.headerCell}>Description</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.headerCell}>Qty</Text>
            </View>
            <View style={styles.colUnitPrice}>
              <Text style={styles.headerCell}>Unit Price</Text>
            </View>
            <View style={styles.colTax}>
              <Text style={styles.headerCell}>Tax %</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.headerCell}>Total</Text>
            </View>
          </View>

          {data.items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <View style={styles.colDescription}>
                <Text style={styles.cell}>{item.description}</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.cell}>{item.quantity}</Text>
              </View>
              <View style={styles.colUnitPrice}>
                <Text style={styles.cell}>{fmt(item.unitPrice)}</Text>
              </View>
              <View style={styles.colTax}>
                <Text style={styles.cell}>{item.taxRate}%</Text>
              </View>
              <View style={styles.colTotal}>
                <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>
                  {fmt(item.total)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(data.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{fmt(data.taxTotal)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{fmt(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {data.tenant.name} {" | "} Invoice {data.number} {" | "} Generated by miniAMS
        </Text>
      </Page>
    </Document>
  )
}
