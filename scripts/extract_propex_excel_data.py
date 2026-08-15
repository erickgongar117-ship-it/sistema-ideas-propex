"""Extract the local PROpEx SQLite database into an auditable JSON snapshot.

The spreadsheet builder consumes this snapshot so the final workbook does not
need Prisma, SQLite, or the web application at runtime.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    database = args.database.resolve()
    output = args.output.resolve()
    if not database.is_file():
        raise SystemExit(f"Database not found: {database}")

    connection = sqlite3.connect(f"file:{database.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        table_names = [
            row["name"]
            for row in connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name NOT LIKE 'sqlite_%'
                  AND name <> '_prisma_migrations'
                ORDER BY name
                """
            )
        ]
        tables: dict[str, list[dict[str, object]]] = {}
        for table_name in table_names:
            escaped = table_name.replace('"', '""')
            rows = connection.execute(f'SELECT * FROM "{escaped}"').fetchall()
            tables[table_name] = [dict(row) for row in rows]

        snapshot = {
            "meta": {
                "source": str(database),
                "exportedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                "counts": {name: len(rows) for name, rows in tables.items()},
            },
            "tables": tables,
        }
    finally:
        connection.close()

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(snapshot["meta"]["counts"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
