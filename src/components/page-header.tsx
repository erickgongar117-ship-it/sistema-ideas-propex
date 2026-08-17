export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /**
   * Ya no se dibuja. El "eyebrow" gastaba una banda completa para repetir el modulo, que
   * la barra lateral ya indica. Medido en el tablero de Ideas: entre eyebrow, titulo,
   * subtitulo, acciones, pestanas y buscador se consumia el 57% del alto util antes del
   * primer registro. Monday, Jira y Linear abren con el titulo, no con un rotulo.
   * Se conserva la prop para no romper las llamadas existentes.
   */
  eyebrow?: string;
}) {
  return (
    <header className="page-header">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-header-title">{title}</h1>
          {description ? <p className="page-header-description">{description}</p> : null}
        </div>
        {actions ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
