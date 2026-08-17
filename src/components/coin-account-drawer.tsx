"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CircleDollarSign, X } from "lucide-react";
import { ProbocaCoin } from "@/components/proboca-coin";
import { createCoinTransactionAction } from "@/app/(app)/probocacoins/actions";

export type CoinAccountMovement = {
  id: string;
  amount: number;
  description: string;
  occurredAt: string;
  sourceLabel: string;
};

export type CoinAccountDrawerProps = {
  participant: { id: string; name: string; employeeNumber: string | null; email: string | null; active: boolean };
  balance: number;
  awarded: number;
  redeemed: number;
  adjustments: number;
  movements: CoinAccountMovement[];
  closeHref: string;
  /** UUID emitido por el servidor en cada render: hace idempotente el alta ante doble clic. */
  requestId: string;
  today: string;
  canManage: boolean;
  openForm: boolean;
};

const money = (value: number) => value.toLocaleString("es-MX");

/**
 * Cuenta de una persona en un panel lateral, no al final de un scroll.
 *
 * Antes habia que bajar por toda la pantalla para ver el saldo, y el formulario para
 * registrar un movimiento sencillamente no existia: `createCoinTransactionAction` se
 * importaba y ningun formulario la invocaba, asi que Finanzas no podia canjear ni ajustar
 * y el saldo solo podia crecer. Aqui viven las dos cosas.
 *
 * Reutiliza las clases `workboard-drawer`, que ya traen capa, foco atrapado y cierre.
 */
export function CoinAccountDrawer({
  participant,
  balance,
  awarded,
  redeemed,
  adjustments,
  movements,
  closeHref,
  requestId,
  today,
  canManage,
  openForm
}: CoinAccountDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (openForm ? drawer?.querySelector<HTMLElement>("input[name='amount']") : closeRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeRef.current?.click(); return; }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [openForm]);

  return (
    <div className="workboard-drawer-layer" role="presentation">
      <Link aria-label="Cerrar la cuenta" className="workboard-drawer-backdrop" href={closeHref} />
      <aside aria-label={`Cuenta de ${participant.name}`} aria-modal="true" className="workboard-drawer coin-drawer" ref={drawerRef} role="dialog">
        <header>
          <div>
            <span>{participant.employeeNumber ? `Empleado ${participant.employeeNumber}` : "Sin numero de empleado"}</span>
            <h2>{participant.name}</h2>
          </div>
          <Link aria-label="Cerrar" className="icon-button" href={closeHref} ref={closeRef}><X className="h-4 w-4" aria-hidden /></Link>
        </header>

        <div className="workboard-drawer-body">
          <div className="coin-drawer-balance">
            <span>Saldo disponible</span>
            <strong><ProbocaCoin size="sm" />{money(balance)}</strong>
            {!participant.active ? <small>Persona retirada: solo consulta.</small> : null}
          </div>

          <dl className="coin-drawer-totals">
            <div><dt>Otorgadas</dt><dd>{money(awarded)}</dd></div>
            <div><dt>Canjeadas</dt><dd>{money(redeemed)}</dd></div>
            <div><dt>Ajustes</dt><dd>{money(adjustments)}</dd></div>
          </dl>

          <section>
            <span>Ultimos movimientos</span>
            {movements.length ? (
              <ul className="coin-drawer-movements">
                {movements.map((movement) => (
                  <li key={movement.id}>
                    <strong className={movement.amount < 0 ? "is-negative" : ""}>
                      {movement.amount > 0 ? "+" : ""}{money(movement.amount)}
                    </strong>
                    <span>{movement.description}</span>
                    <small>{movement.occurredAt} · {movement.sourceLabel}</small>
                  </li>
                ))}
              </ul>
            ) : <p className="coin-drawer-empty">Esta persona todavia no tiene movimientos.</p>}
          </section>

          {canManage && participant.active ? (
            <section className="coin-drawer-form">
              <span>Registrar movimiento</span>
              <form action={createCoinTransactionAction}>
                <input name="participantId" type="hidden" value={participant.id} />
                {/* El requestId viaja en el formulario: si alguien pulsa dos veces, la accion
                    reconoce la misma referencia y no crea un segundo movimiento. */}
                <input name="requestId" type="hidden" value={requestId} />
                <label>
                  <span className="label">Tipo</span>
                  <select className="field" defaultValue="REDEMPTION" name="type">
                    <option value="REDEMPTION">Canje o gasto</option>
                    <option value="AWARD">Premio manual</option>
                    <option value="ADJUSTMENT">Ajuste (puede ser negativo)</option>
                  </select>
                </label>
                <div className="coin-drawer-form-row">
                  <label>
                    <span className="label">Cantidad</span>
                    <input className="field" inputMode="numeric" name="amount" placeholder="150" step={1} type="number" />
                  </label>
                  <label>
                    <span className="label">Fecha</span>
                    <input className="field" defaultValue={today} name="occurredAt" type="date" />
                  </label>
                </div>
                <label>
                  <span className="label">Motivo</span>
                  <input className="field" maxLength={160} name="description" placeholder="Canje por playera institucional" type="text" />
                  <span className="helper-text">Queda en el libro mayor y en la auditoria. Se explicito.</span>
                </label>
                <button className="btn btn-primary w-full" type="submit">
                  <CircleDollarSign className="h-4 w-4" aria-hidden />Guardar movimiento
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
