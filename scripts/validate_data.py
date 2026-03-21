"""
数据验证和清洗脚本
比对现有知识图谱数据，排除错误和重复信息
"""
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import defaultdict


def load_all_kg_data(kg_dir: Path) -> Tuple[Dict[str, dict], List[dict]]:
    """加载所有知识图谱数据"""
    all_nodes = {}
    all_edges = []

    json_files = [f for f in kg_dir.glob("*.json") if f.name != "schema.yaml"]

    for json_file in json_files:
        print(f"加载文件: {json_file.name}")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

            for node in data.get("nodes", []):
                node_id = node["id"]
                if node_id in all_nodes:
                    # 检查重复节点
                    existing = all_nodes[node_id]
                    if existing != node:
                        print(f"  ⚠️  重复节点 ID: {node_id}")
                        print(f"      现有: {existing['label']}")
                        print(f"      新的: {node['label']}")
                else:
                    all_nodes[node_id] = node

            all_edges.extend(data.get("edges", []))

    return all_nodes, all_edges


def validate_nodes(nodes: Dict[str, dict]) -> List[str]:
    """验证节点数据质量"""
    issues = []

    for node_id, node in nodes.items():
        # 检查必需字段
        if not node.get("label"):
            issues.append(f"节点 {node_id} 缺少 label")

        if not node.get("type"):
            issues.append(f"节点 {node_id} 缺少 type")

        # 检查艺术家节点
        if node["type"] == "Artist":
            props = node.get("properties", {})

            # 检查生卒年格式
            birth_year = props.get("birth_year")
            death_year = props.get("death_year")

            if birth_year:
                try:
                    year = int(birth_year)
                    if year < 1800 or year > 2100:
                        issues.append(f"艺术家 {node['label']} 的出生年份异常: {birth_year}")
                except ValueError:
                    issues.append(f"艺术家 {node['label']} 的出生年份格式错误: {birth_year}")

            if death_year:
                try:
                    year = int(death_year)
                    if year < 1800 or year > 2100:
                        issues.append(f"艺术家 {node['label']} 的去世年份异常: {death_year}")
                except ValueError:
                    issues.append(f"艺术家 {node['label']} 的去世年份格式错误: {death_year}")

            # 检查生卒年逻辑
            if birth_year and death_year:
                try:
                    if int(death_year) < int(birth_year):
                        issues.append(f"艺术家 {node['label']} 的生卒年逻辑错误: {birth_year}-{death_year}")
                except ValueError:
                    pass

        # 检查作品节点
        if node["type"] == "Work":
            props = node.get("properties", {})
            creation_date = props.get("creation_date")

            if creation_date:
                try:
                    year = int(creation_date)
                    if year < 1800 or year > 2100:
                        issues.append(f"作品 {node['label']} 的创作年份异常: {creation_date}")
                except ValueError:
                    # 可能是年代范围，如 "1940-1950"
                    pass

    return issues


def validate_edges(edges: List[dict], nodes: Dict[str, dict]) -> List[str]:
    """验证关系数据"""
    issues = []

    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        relation = edge.get("relation")

        # 检查必需字段
        if not source:
            issues.append(f"关系缺少 source")
        if not target:
            issues.append(f"关系缺少 target")
        if not relation:
            issues.append(f"关系缺少 relation")

        # 检查节点是否存在
        if source and source not in nodes:
            issues.append(f"关系的 source 节点不存在: {source}")

        if target and target not in nodes:
            issues.append(f"关系的 target 节点不存在: {target}")

        # 检查关系类型的合理性
        if source and target and relation:
            source_node = nodes.get(source)
            target_node = nodes.get(target)

            if source_node and target_node:
                # CREATED_BY: Work -> Artist
                if relation == "CREATED_BY":
                    if source_node["type"] != "Work":
                        issues.append(f"CREATED_BY 关系的 source 应该是 Work: {source}")
                    if target_node["type"] != "Artist":
                        issues.append(f"CREATED_BY 关系的 target 应该是 Artist: {target}")

                # belongs_to: Artist -> Period
                if relation == "belongs_to":
                    if source_node["type"] != "Artist":
                        issues.append(f"belongs_to 关系的 source 应该是 Artist: {source}")
                    if target_node["type"] != "Period":
                        issues.append(f"belongs_to 关系的 target 应该是 Period: {target}")

    return issues


def find_duplicates(nodes: Dict[str, dict]) -> List[Tuple[str, str]]:
    """查找可能重复的节点（基于 label）"""
    label_to_ids = defaultdict(list)

    for node_id, node in nodes.items():
        label = node["label"].strip().lower()
        label_to_ids[label].append(node_id)

    duplicates = []
    for label, ids in label_to_ids.items():
        if len(ids) > 1:
            duplicates.append((label, ids))

    return duplicates


def generate_statistics(nodes: Dict[str, dict], edges: List[dict]) -> dict:
    """生成数据统计"""
    stats = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "nodes_by_type": defaultdict(int),
        "edges_by_relation": defaultdict(int),
        "artists_by_century": defaultdict(int),
        "works_by_century": defaultdict(int)
    }

    for node in nodes.values():
        stats["nodes_by_type"][node["type"]] += 1

        # 统计艺术家的世纪分布
        if node["type"] == "Artist":
            birth_year = node.get("properties", {}).get("birth_year")
            if birth_year:
                try:
                    century = (int(birth_year) // 100) + 1
                    stats["artists_by_century"][f"{century}世纪"] += 1
                except ValueError:
                    pass

        # 统计作品的世纪分布
        if node["type"] == "Work":
            creation_date = node.get("properties", {}).get("creation_date")
            if creation_date:
                try:
                    century = (int(creation_date) // 100) + 1
                    stats["works_by_century"][f"{century}世纪"] += 1
                except ValueError:
                    pass

    for edge in edges:
        stats["edges_by_relation"][edge["relation"]] += 1

    return stats


def main():
    """主函数"""
    print("=" * 60)
    print("VeriArt 知识图谱数据验证")
    print("=" * 60)

    kg_dir = Path(__file__).parent.parent / "kg"

    # 加载所有数据
    print("\n1. 加载数据...")
    nodes, edges = load_all_kg_data(kg_dir)
    print(f"   总节点数: {len(nodes)}")
    print(f"   总关系数: {len(edges)}")

    # 验证节点
    print("\n2. 验证节点数据...")
    node_issues = validate_nodes(nodes)
    if node_issues:
        print(f"   发现 {len(node_issues)} 个问题:")
        for issue in node_issues[:10]:  # 只显示前10个
            print(f"   - {issue}")
        if len(node_issues) > 10:
            print(f"   ... 还有 {len(node_issues) - 10} 个问题")
    else:
        print("   ✓ 节点数据验证通过")

    # 验证关系
    print("\n3. 验证关系数据...")
    edge_issues = validate_edges(edges, nodes)
    if edge_issues:
        print(f"   发现 {len(edge_issues)} 个问题:")
        for issue in edge_issues[:10]:
            print(f"   - {issue}")
        if len(edge_issues) > 10:
            print(f"   ... 还有 {len(edge_issues) - 10} 个问题")
    else:
        print("   ✓ 关系数据验证通过")

    # 查找重复
    print("\n4. 查找重复节点...")
    duplicates = find_duplicates(nodes)
    if duplicates:
        print(f"   发现 {len(duplicates)} 组可能重复的节点:")
        for label, ids in duplicates[:5]:
            print(f"   - {label}: {ids}")
        if len(duplicates) > 5:
            print(f"   ... 还有 {len(duplicates) - 5} 组")
    else:
        print("   ✓ 未发现重复节点")

    # 生成统计
    print("\n5. 数据统计...")
    stats = generate_statistics(nodes, edges)

    print(f"\n   节点类型分布:")
    for node_type, count in sorted(stats["nodes_by_type"].items()):
        print(f"     {node_type}: {count}")

    print(f"\n   关系类型分布:")
    for relation, count in sorted(stats["edges_by_relation"].items()):
        print(f"     {relation}: {count}")

    print(f"\n   艺术家世纪分布:")
    for century, count in sorted(stats["artists_by_century"].items()):
        print(f"     {century}: {count}")

    print(f"\n   作品世纪分布:")
    for century, count in sorted(stats["works_by_century"].items()):
        print(f"     {century}: {count}")

    # 保存验证报告
    report = {
        "timestamp": Path(__file__).stat().st_mtime,
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "node_issues": node_issues,
        "edge_issues": edge_issues,
        "duplicates": [{"label": label, "ids": ids} for label, ids in duplicates],
        "statistics": {
            "nodes_by_type": dict(stats["nodes_by_type"]),
            "edges_by_relation": dict(stats["edges_by_relation"]),
            "artists_by_century": dict(stats["artists_by_century"]),
            "works_by_century": dict(stats["works_by_century"])
        }
    }

    report_file = kg_dir / "validation_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n验证报告已保存到: {report_file}")
    print("\n" + "=" * 60)

    # 返回状态
    total_issues = len(node_issues) + len(edge_issues)
    if total_issues == 0:
        print("✓ 数据验证通过，未发现问题")
        return 0
    else:
        print(f"⚠️  发现 {total_issues} 个问题，请检查")
        return 1


if __name__ == "__main__":
    exit(main())
