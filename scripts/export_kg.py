#!/usr/bin/env python3
"""
Export VeriArt kg/seed.json to Neo4j Cypher or CSV.
Compatible with kg-extractor output format (nodes + edges).
Usage:
  python scripts/export_kg.py --format neo4j --output kg/export.cypher
  python scripts/export_kg.py --format csv --output kg/export
"""
import argparse
import json
from pathlib import Path


def esc(s: str) -> str:
    return str(s).replace("\\", "\\\\").replace("'", "\\'")


def load_kg(kg_path: Path) -> tuple[list, list]:
    with open(kg_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("nodes", []), data.get("edges", [])


def export_neo4j(nodes: list, edges: list, out_path: Path) -> None:
    lines = ["// VeriArt KG export", ""]
    for n in nodes:
        nid = esc(n.get("id", ""))
        label = esc(n.get("label", ""))
        ntype = n.get("type", "Node")
        props = n.get("properties") or {}
        props_str = ", ".join(f"{k}: '{esc(str(v))}'" for k, v in props.items() if v is not None)
        if props_str:
            lines.append(f"CREATE (n:{ntype} {{ id: '{nid}', label: '{label}', {props_str} }});")
        else:
            lines.append(f"CREATE (n:{ntype} {{ id: '{nid}', label: '{label}' }});")
    lines.append("")
    for e in edges:
        s, t, r = e.get("source"), e.get("target"), e.get("relation", "RELATES_TO")
        lines.append(f"MATCH (a {{ id: '{s}' }}), (b {{ id: '{t}' }}) CREATE (a)-[:{r}]->(b);")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def export_csv(nodes: list, edges: list, out_base: Path) -> None:
    import csv
    nodes_path = out_base.with_name(out_base.name + "_nodes.csv")
    edges_path = out_base.with_name(out_base.name + "_edges.csv")
    if nodes:
        keys = set()
        for n in nodes:
            keys.update(n.get("properties") or {})
        fieldnames = ["id", "label", "type"] + sorted(keys)
        with open(nodes_path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            w.writeheader()
            for n in nodes:
                row = {"id": n.get("id"), "label": n.get("label"), "type": n.get("type")}
                row.update(n.get("properties") or {})
                w.writerow(row)
    if edges:
        with open(edges_path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["source", "target", "relation"])
            w.writeheader()
            for e in edges:
                w.writerow({"source": e.get("source"), "target": e.get("target"), "relation": e.get("relation", "")})


def main():
    root = Path(__file__).resolve().parent.parent
    kg_path = root / "kg" / "seed.json"
    ap = argparse.ArgumentParser()
    ap.add_argument("--format", choices=["neo4j", "csv"], default="neo4j")
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--input", type=Path, default=kg_path)
    args = ap.parse_args()
    nodes, edges = load_kg(args.input)
    if args.format == "neo4j":
        export_neo4j(nodes, edges, args.output)
    else:
        export_csv(nodes, edges, args.output)
    print(f"Exported {len(nodes)} nodes, {len(edges)} edges to {args.output}")


if __name__ == "__main__":
    main()
