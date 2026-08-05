import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  currentPage: number;
  pageSize: number;
  path: string;
  query?: Record<string, string | undefined>;
  totalItems: number;
  totalPages: number;
  pageParam?: string;
};

function pageHref(
  path: string,
  query: Record<string, string | undefined>,
  pageParam: string,
  page: number
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set(pageParam, String(page));
  return params.size ? `${path}?${params.toString()}` : path;
}

export function Pagination({
  currentPage,
  pageSize,
  path,
  query = {},
  totalItems,
  totalPages,
  pageParam = "page"
}: PaginationProps) {
  if (!totalItems) return null;
  const first = (currentPage - 1) * pageSize + 1;
  const last = Math.min(totalItems, currentPage * pageSize);

  return (
    <nav aria-label="Paginacion" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <p className="text-xs font-bold text-slate-500">
        Mostrando {first.toLocaleString("es-MX")}-{last.toLocaleString("es-MX")} de {totalItems.toLocaleString("es-MX")}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {currentPage > 1 ? (
            <Link className="btn btn-secondary" href={pageHref(path, query, pageParam, currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden />Anterior
            </Link>
          ) : null}
          <span className="min-w-24 text-center text-xs font-extrabold text-slate-600">
            Pagina {currentPage} de {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link className="btn btn-secondary" href={pageHref(path, query, pageParam, currentPage + 1)}>
              Siguiente<ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
