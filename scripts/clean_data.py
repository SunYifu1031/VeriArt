"""
数据清洗脚本
处理重复节点、修正错误数据
"""
import json
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict


def merge_duplicate_nodes(nodes: Dict[str, dict]) -> Dict[str, dict]:
    """合并重复节点，保留信息最完整的版本"""
    # 按 label 分组
    label_to_nodes = defaultdict(list)
    for node_id, node in nodes.items():
        label = node["label"].strip()
        label_to_nodes[label].append((node_id, node))

    merged_nodes = {}
    id_mapping = {}  # 旧ID -> 新ID的映射

    for label, node_list in label_to_nodes.items():
        if len(node_list) == 1:
            # 没有重复，直接保留
            node_id, node = node_list[0]
            merged_nodes[node_id] = node
            id_mapping[node_id] = node_id
        else:
            # 有重复，选择最佳版本
            print(f"合并重复节点: {label} ({len(node_list)} 个)")

            # 选择策略：
            # 1. 优先选择 source=verified 的
            # 2. 其次选择属性最多的
            # 3. 最后选择 ID 最短的（通常是手动创建的）

            best_node = None
            best_id = None
            best_score = -1

            for node_id, node in node_list:
                score = 0

                # verified 加分
                if node.get("properties", {}).get("source") == "verified":
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
            for node_id, node in node_list:
                props = node.get("properties", {})
                for key, value in props.items():
                    if key not in merged_props or not merged_props[key]:
                        merged_props[key] = value

            best_node["properties"] = merged_props
            merged_nodes[best_id] = best_node

            # 记录所有旧ID到新ID的映射
            for node_id, _ in node_list:
                id_mapping[node_id] = best_id

            print(f"  保留: {best_id}")
            print(f"  移除: {[nid for nid, _ in node_list if nid != best_id]}")

    return merged_nodes, id_mapping


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
    print("VeriArt 知识图谱数据清洗")
    print("=" * 60)

    kg_dir = Path(__file__).parent.parent / "kg"

    # 加载所有数据
    print("\n1. 加载数据...")
    all_nodes = {}
    all_edges = []

    json_files = [f for f in kg_dir.glob("*.json") if f.name not in ["schema.yaml", "validation_report.json"]]

    for json_file in json_files:
        print(f"   加载: {json_file.name}")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for node in data.get("nodes", []):
                all_nodes[node["id"]] = node
            all_edges.extend(data.get("edges", []))

    print(f"   原始节点数: {len(all_nodes)}")
    print(f"   原始关系数: {len(all_edges)}")

    # 清洗节点数据
    print("\n2. 清洗节点数据...")
    cleaned_nodes = clean_nodes(all_nodes)
    print(f"   ✓ 节点数据已清洗")

    # 合并重复节点
    print("\n3. 合并重复节点...")
    merged_nodes, id_mapping = merge_duplicate_nodes(cleaned_nodes)
    print(f"   合并后节点数: {len(merged_nodes)}")
    print(f"   减少了 {len(all_nodes) - len(merged_nodes)} 个重复节点")

    # 更新关系
    print("\n4. 更新关系...")
    updated_edges = update_edges_with_mapping(all_edges, id_mapping)
    print(f"   更新后关系数: {len(updated_edges)}")
    print(f"   去重了 {len(all_edges) - len(updated_edges)} 条关系")

    # 保存清洗后的数据
    print("\n5. 保存清洗后的数据...")
    output_data = {
        "nodes": list(merged_nodes.values()),
        "edges": updated_edges,
        "metadata": {
            "description": "清洗和去重后的完整知识图谱数据",
            "original_nodes": len(all_nodes),
            "cleaned_nodes": len(merged_nodes),
            "original_edges": len(all_edges),
            "cleaned_edges": len(updated_edges)
        }
    }

    output_file = kg_dir / "cleaned_kg.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"   ✓ 数据已保存到: {output_file}")

    # 统计
    print("\n6. 清洗后统计:")
    node_types = defaultdict(int)
    for node in merged_nodes.values():
        node_types[node["type"]] += 1

    for node_type, count in sorted(node_types.items()):
        print(f"   {node_type}: {count}")

    print("\n" + "=" * 60)
    print("✓ 数据清洗完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
