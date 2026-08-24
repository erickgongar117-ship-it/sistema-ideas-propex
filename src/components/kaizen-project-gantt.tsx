import type { WorkItemStatus } from "@prisma/client";
import { workItemStatusLabels } from "@/lib/domain";

type Activity = {
  id: string;
  number: number;
  action: string;
  status: WorkItemStatus;
  startDate: Date | null;
  dueDate: Date | null;
  owner: { name: string } | null;
};

export type KaizenProjectGanttProps = {
  startDate: Date;
  endDate: Date;
  /** Cierre comprometido antes de reagendar. Nulo cuando el proyecto nunca se recorrio. */
  originalEndDate: Date | null;
  activities: Activity[];
};

const DIA = 86_400_000;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Los estados cerrados no compiten por atencion: van en gris, los vivos en color. */
const TONO: Record<WorkItemStatus, string> = {
  PENDIENTE: "is-pendiente",
  EN_PROCESO: "is-proceso",
  BLOQUEADA: "is-bloqueada",
  COMPLETADA: "is-completada",
  CANCELADA: "is-cancelada",
  COMBINADA: "is-cancelada"
};

const fecha = (value: Date) => value.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

/**
 * Calendario del proyecto, con su plan de actividades sobre la misma linea de tiempo.
 *
 * Por que existe: el detalle del Kaizen solo enlazaba al Gantt general, donde el proyecto
 * es un renglon entre cuarenta y sus actividades no se ven. Para saber si un proyecto va
 * tarde habia que abrir otra pantalla, ubicar la fila y aun asi no se veia que actividad
 * lo estaba deteniendo.
 *
 * La barra del proyecto se parte en dos: hasta el cierre comprometido y, si hubo
 * reagenda, el tramo recorrido en un tono distinto. Esa separacion es la unica forma de
 * distinguir un proyecto que siempre duro mucho de uno que se recorrio, porque `endDate`
 * ya trae la fecha nueva y por si sola no delata el cambio.
 */
export function KaizenProjectGantt({ startDate, endDate, originalEndDate, activities }: KaizenProjectGanttProps) {
  const conFecha = activities.filter((activity) => activity.dueDate);
  const limites = [
    startDate.getTime(),
    endDate.getTime(),
    ...(originalEndDate ? [originalEndDate.getTime()] : []),
    ...conFecha.flatMap((activity) => [activity.startDate?.getTime(), activity.dueDate?.getTime()].filter((value): value is number => typeof value === "number"))
  ];
  const inicio = Math.min(...limites);
  const fin = Math.max(...limites);
  // Un proyecto de un solo dia dividiria entre cero; se le da una semana de ancho minimo.
  const span = Math.max(fin - inicio, 7 * DIA);
  const pct = (value: number) => ((value - inicio) / span) * 100;

  // Marcas de mes: una por cada primero de mes dentro de la ventana.
  const marcas: Array<{ etiqueta: string; izquierda: number }> = [];
  const cursor = new Date(inicio);
  cursor.setUTCDate(1);
  cursor.setUTCHours(12, 0, 0, 0);
  while (cursor.getTime() <= fin) {
    if (cursor.getTime() >= inicio) marcas.push({ etiqueta: MESES[cursor.getUTCMonth()], izquierda: pct(cursor.getTime()) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const retrasoDias = originalEndDate ? Math.round((endDate.getTime() - originalEndDate.getTime()) / DIA) : 0;
  const hoy = Date.now();
  const hoyDentro = hoy >= inicio && hoy <= fin;

  return (
    <div className="kgantt">
      <div className="kgantt-scroll">
        <div className="kgantt-canvas">
          <div className="kgantt-months" aria-hidden>
            {marcas.map((marca) => (
              <span key={marca.etiqueta + marca.izquierda} style={{ left: `${marca.izquierda}%` }}>{marca.etiqueta}</span>
            ))}
          </div>

          <div className="kgantt-row is-project">
            <span className="kgantt-label">Proyecto</span>
            <span className="kgantt-track">
              {hoyDentro ? <i className="kgantt-today" style={{ left: `${pct(hoy)}%` }} aria-hidden /> : null}
              <b
                className="kgantt-bar is-plan"
                style={{ left: `${pct(startDate.getTime())}%`, width: `${pct((originalEndDate ?? endDate).getTime()) - pct(startDate.getTime())}%` }}
              >
                <span>{fecha(startDate)} – {fecha(originalEndDate ?? endDate)}</span>
              </b>
              {originalEndDate ? (
                <b
                  className="kgantt-bar is-reagenda"
                  style={{ left: `${pct(originalEndDate.getTime())}%`, width: `${pct(endDate.getTime()) - pct(originalEndDate.getTime())}%` }}
                >
                  <span>+{retrasoDias} d</span>
                </b>
              ) : null}
            </span>
          </div>

          {conFecha.map((activity) => {
            const vence = activity.dueDate!.getTime();
            const arranca = activity.startDate ? activity.startDate.getTime() : null;
            const izquierda = pct(arranca ?? vence);
            const ancho = arranca ? Math.max(pct(vence) - izquierda, 0.8) : 0;
            return (
              <div className="kgantt-row" key={activity.id}>
                <span className="kgantt-label" title={activity.action}>{activity.number}. {activity.action}</span>
                <span className="kgantt-track">
                  {hoyDentro ? <i className="kgantt-today" style={{ left: `${pct(hoy)}%` }} aria-hidden /> : null}
                  {arranca ? (
                    <b className={`kgantt-bar ${TONO[activity.status]}`} style={{ left: `${izquierda}%`, width: `${ancho}%` }} />
                  ) : (
                    <i className={`kgantt-dot ${TONO[activity.status]}`} style={{ left: `${izquierda}%` }} />
                  )}
                  <span className="sr-only">{workItemStatusLabels[activity.status]} · vence {fecha(activity.dueDate!)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {conFecha.length < activities.length ? (
        <p className="kgantt-nota">{activities.length - conFecha.length} de {activities.length} actividades no tienen fecha compromiso y no pueden dibujarse aquí.</p>
      ) : null}
    </div>
  );
}
