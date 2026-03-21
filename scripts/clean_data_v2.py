"""
数据清洗脚本 V2
只合并艺术家节点，不合并作品节点（因为不同艺术家可以有同名作品）
"""
import json
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict


def merge_duplicate_artists(nodes: Dict[str, dict]) -> tuple[Dict[str, dict], Dict[str, str]]:
    """只合并重复的艺术家节点"""
    # 分离艺术家和其他节点
    artist_nodes = {}
    other_nodes = {}

    for node_id, node in nodes.items():
        if node.get("type") == "Artist":
            artist_nodes[node_id] = node
        else:
            other_nodes[node_id] = node

    # 按 label 分组艺术家
    label_to_artists = defaultdict(list)
    for node_id, node in artist_nodes.items():
        label = node["label"].strip()
        label_to_artists[label].append((node_id, node))

    merged_artists = {}
    id_mapping = {}

    for label, artist_list in label_to_artists.items():
        if len(artist_list) == 1:
            # 没有重复
            node_id, node = artist_list[0]
            merged_artists[node_id] = node
            id_mapping[node_id] = node_id
        else:
            # 有重复艺术家
            print(f"合并重复艺术家: {label} ({len(artist_list)} 个)")

            # 选择最佳版本
            best_node = None
            best_id = None
            best_score = -1

            for node_id, node in artist_list:
                score = 0

                # verified 或 comprehensive_database 来源优先
                source = node.get("properties", {}).get("source", "")
                if source in ["verified", "comprehensive_database"]:
                    score += 100

                # 属性数量加分
                props = node.get("properties", {})
                score += len(props) * 10

                # ID 长度减分（越短越好）
                score -= len(node_id)

                if score > best_score:
                    best_score = score
                    best_node = node
                    best_id = node_id

            # 合并所有节点的属性
            merged_props = {}
            for node_id, node in artist_list:
                props = node.get("properties", {})
                for key, value in props.items():
                    if key not in merged_props or not merged_props[key]:
                        merged_props[key] = value

            best_node["properties"] = merged_props
            merged_artists[best_id] = best_node

            # 记录所有旧ID到新ID的映射
            for node_id, _ in artist_list:
                id_mapping[node_id] = best_id

            print(f"  保留: {best_id}")
            print(f"  移除: {[nid for nid, _ in artist_list if nid != best_id]}")

    # 合并艺术家和其他节点
    all_merged = {**merged_artists, **other_nodes}

    # 其他节点的ID映射（映射到自己）
    for node_id in other_nodes:
        id_mapping[node_id] = node_id

    return all_merged, id_mapping


def update_edges_with_mapping(edges: List[dict], id_mapping: Dict[str, str]) -> List[dict]:
    """使用ID映射更新关系"""
    updated_edges = []
    seen_edges = set()

    for edge in edges:
        source = id_mapping.get(edge["source"], edge["source"])
        target = id_mapping.get(edge["target"], edge["target"])
        relation = edge["relation"]

        # 去重
        edge_key = (source, target, relation)
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            updated_edge = {
                "source": source,
                "target": target,
                "relation": relation
            }
            if "properties" in edge:
                updated_edge["properties"] = edge["properties"]
            updated_edges.append(updated_edge)

    return updated_edges


def fix_year_format(year_str: str) -> str:
    """修正年份格式"""
    if not year_str:
        return year_str

    # 处理 "约1085" 这样的格式
    if year_str.startswith("约"):
        return year_str[1:]

    return year_str


def clean_nodes(nodes: Dict[str, dict]) -> Dict[str, dict]:
    """清洗节点数据"""
    cleaned = {}

    for node_id, node in nodes.items():
        cleaned_node = node.copy()
        props = node.get("properties", {}).copy()

        # 修正年份格式
        if "birth_year" in props:
            props["birth_year"] = fix_year_format(props["birth_year"])

        if "death_year" in props:
            props["death_year"] = fix_year_format(props["death_year"])

        if "creation_date" in props:
            props["creation_date"] = fix_year_format(props["creation_date"])

        cleaned_node["properties"] = props
        cleaned[node_id] = cleaned_node

    return cleaned


def main():
    """主函数"""
    print("=" * 60)
    print("VeriArt 知识图谱数据清洗 V2")
    print("只合并重复艺术家，保留所有作品")
    print("=" * 60)

    kg_dir = Path(__file__).parent.parent / "kg"
    kg_file = kg_dir / "cleaned_kg.json"

    # 1. 加载数据
    print("\n1. 加载数据...")
    with open(kg_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes_list = data["nodes"]
    edges_list = data["edges"]

    print(f"   原始节点数: {len(nodes_list)}")
    print(f"   原始关系数: {len(edges_list)}")

    # 转换为字典格式
    nodes_dict = {node["id"]: node for node in nodes_list}

    # 2. 清洗节点数据
    print("\n2. 清洗节点数据...")
    nodes_dict = clean_nodes(nodes_dict)
    print("   ✓ 节点数据已清洗")

    # 3. 只合并重复艺术家
    print("\n3. 合并重复艺术家...")
    merged_nodes, id_mapping = merge_duplicate_artists(nodes_dict)
    print(f"   合并后节点数: {len(merged_nodes)}")
    print(f"   减少了 {len(nodes_dict) - len(merged_nodes)} 个重复艺术家")

    # 4. 更新关系
    print("\n4. 更新关系...")
    updated_edges = update_edges_with_mapping(edges_list, id_mapping)
    print(f"   更新后关系数: {len(updated_edges)}")
    print(f"   去重了 {len(edges_list) - len(updated_edges)} 条关系")

    # 5. 保存
    print("\n5. 保存清洗后的数据...")

    # 备份
    import shutil, time
    backup_dir = kg_dir / "backup"
    backup_dir.mkdir(exist_ok=True)
    shutil.copy(kg_file, backup_dir / f"before_clean_v2_{int(time.time())}.json")

    result = {
        "nodes": list(merged_nodes.values()),
        "edges": updated_edges,
        "metadata": {
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_nodes": len(merged_nodes),
            "total_edges": len(updated_edges),
            "description": "清洗后的知识图谱数据（只合并重复艺术家）"
        }
    }

    with open(kg_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"   ✓ 数据已保存到: {kg_file}")

    # 6. 统计
    print("\n6. 清洗后统计:")
    node_types = {}
    for node in merged_nodes.values():
        node_type = node["type"]
        node_types[node_type] = node_types.get(node_type, 0) + 1

    for node_type, count in sorted(node_types.items()):
        print(f"   {node_type}: {count}")

    print("\n" + "=" * 60)
    print("✓ 数据清洗完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
