"use client";

import { useLanguage } from "@/lib/language-context";
import { formatTikTokNumber } from "@/lib/tiktok-catalog";
import {
  getTikTokHistoryServerSnapshot,
  getTikTokHistorySnapshot,
  parseTikTokHistory,
  subscribeTikTokHistory,
} from "@/lib/tiktok-history";
import { TIKTOK_PROVIDER_NAMES, type TikTokOrder } from "@/lib/tiktok-payment";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, History, ReceiptText, X } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import "./tiktok-history.css";

export function TikTokHistory() {
  const { language } = useLanguage();
  const fr = language === "fr";
  const snapshot = useSyncExternalStore(
    subscribeTikTokHistory,
    getTikTokHistorySnapshot,
    getTikTokHistoryServerSnapshot,
  );
  const orders = useMemo(() => parseTikTokHistory(snapshot), [snapshot]);
  const [selected, setSelected] = useState<TikTokOrder | null>(null);
  const number = (value: number) => formatTikTokNumber(value, language);
  const date = (value: number) =>
    new Intl.DateTimeFormat(fr ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  const status = (order: TikTokOrder) =>
    order.status === "paid"
      ? fr
        ? "Réussie"
        : "Successful"
      : ["failed", "cancelled", "expired"].includes(order.status)
        ? fr
          ? "Échouée"
          : "Failed"
        : fr
          ? "En attente"
          : "Pending";
  const purchased = orders
    .filter((order) => order.status === "paid")
    .reduce((total, order) => total + order.coins + order.bonus, 0);
  return (
    <section className="tiktok-history">
      <div className="tiktok-history-heading">
        <h2>
          <History size={19} aria-hidden="true" />
          {fr ? "Historique des commandes" : "Order history"}
          <span>{orders.length}</span>
        </h2>
        <p>
          {number(purchased)} {fr ? "pièces achetées" : "coins purchased"}
        </p>
      </div>
      {orders.length ? (
        <div className="tiktok-orders">
          {orders.map((order) => (
            <button
              type="button"
              className="tiktok-order"
              key={order.orderId}
              onClick={() => setSelected(order)}
              aria-label={`${fr ? "Ouvrir la transaction" : "Open transaction"} ${order.orderId}`}
            >
              <ReceiptText size={22} aria-hidden="true" />
              <span>
                <strong>
                  {number(order.coins + order.bonus)} {fr ? "pièces" : "coins"}
                </strong>
                <small>{order.orderId}</small>
                <small>
                  {TIKTOK_PROVIDER_NAMES[order.provider]} ·{" "}
                  {date(order.createdAt)}
                </small>
              </span>
              <span>
                <strong>
                  {number(order.amount)} {order.currency}
                </strong>
                <small>{status(order)}</small>
              </span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <div className="tiktok-empty-history">
          <ReceiptText size={28} aria-hidden="true" />
          <strong>
            {fr ? "Aucune commande pour le moment" : "No orders yet"}
          </strong>
          <span>
            {fr
              ? "Vos transactions apparaîtront ici après votre première tentative de paiement."
              : "Your transactions will appear here after your first payment attempt."}
          </span>
        </div>
      )}
      <Dialog.Root
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="tiktok-history-overlay" />
          <Dialog.Content className="tiktok-history-dialog">
            <Dialog.Title>
              {fr ? "Détail de la commande" : "Order details"}
            </Dialog.Title>
            <Dialog.Description>
              {fr
                ? "Copie de votre historique sur cet appareil. Ce document ne constitue pas une nouvelle vérification du paiement."
                : "Saved history on this device. This record is not a new payment verification."}
            </Dialog.Description>
            <Dialog.Close
              className="tiktok-history-close"
              aria-label={fr ? "Fermer" : "Close"}
            >
              <X size={20} />
            </Dialog.Close>
            {selected && (
              <dl>
                <dt>{fr ? "Référence" : "Reference"}</dt>
                <dd>{selected.orderId}</dd>
                <dt>{fr ? "Recharge" : "Recharge"}</dt>
                <dd>
                  {number(selected.coins + selected.bonus)}{" "}
                  {fr ? "pièces" : "coins"}
                </dd>
                <dt>{fr ? "Paiement" : "Payment"}</dt>
                <dd>{TIKTOK_PROVIDER_NAMES[selected.provider]}</dd>
                <dt>{fr ? "Date" : "Date"}</dt>
                <dd>{date(selected.createdAt)}</dd>
                <dt>{fr ? "Total" : "Total"}</dt>
                <dd>
                  {number(selected.amount)} {selected.currency}
                </dd>
                <dt>{fr ? "Statut enregistré" : "Saved status"}</dt>
                <dd>{status(selected)}</dd>
              </dl>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
