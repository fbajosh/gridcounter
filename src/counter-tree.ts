import type { CounterNode, CounterRow, FlattenedCounter } from "./app-types";

function createEntityId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createCounterNode(): CounterNode {
  return {
    id: createEntityId("counter"),
    title: "",
    count: 0,
    childRow: null,
    createdAt: Date.now(),
  };
}

export function createCounterRow(): CounterRow {
  return {
    id: createEntityId("row"),
    title: "",
    nodes: [createCounterNode()],
    createdAt: Date.now(),
  };
}

export function createInitialCounterRow(): CounterRow {
  return createCounterRow();
}

export function aggregateCounterCount(node: CounterNode): number {
  return node.count + (node.childRow ? sumCounts(node.childRow) : 0);
}

export function flattenCounters(row: CounterRow, prefix: number[] = []): FlattenedCounter[] {
  return row.nodes.flatMap((node, index) => {
    const nextPrefix = [...prefix, index + 1];
    return [
      {
        id: node.id,
        title: node.title,
        path: nextPrefix.join("."),
        depth: nextPrefix.length - 1,
        count: aggregateCounterCount(node),
        childCount: node.childRow?.nodes.length ?? 0,
      },
      ...(node.childRow ? flattenCounters(node.childRow, nextPrefix) : []),
    ];
  });
}

export function countCounters(row: CounterRow): number {
  return flattenCounters(row).length;
}

export function sumCounts(row: CounterRow): number {
  return row.nodes.reduce((total, node) => {
    return total + node.count + (node.childRow ? sumCounts(node.childRow) : 0);
  }, 0);
}

export function measureCounterNodeHeight(node: CounterNode): number {
  return node.childRow ? measureCounterRowHeight(node.childRow) : 1;
}

export function measureCounterRowHeight(row: CounterRow): number {
  return row.nodes.reduce((total, node) => total + measureCounterNodeHeight(node), 0);
}

export function updateCounterCount(
  row: CounterRow,
  nodeId: string,
  delta: number,
): { row: CounterRow; countAfter: number | null } {
  let countAfter: number | null = null;

  const nodes = row.nodes.map((node) => {
    if (node.id === nodeId) {
      countAfter = node.count + delta;
      return { ...node, count: countAfter };
    }

    if (!node.childRow) {
      return node;
    }

    const childResult = updateCounterCount(node.childRow, nodeId, delta);
    if (childResult.countAfter === null) {
      return node;
    }

    countAfter = childResult.countAfter;
    return { ...node, childRow: childResult.row };
  });

  return { row: { ...row, nodes }, countAfter };
}

export function resetCounterById(
  row: CounterRow,
  nodeId: string,
): { row: CounterRow; countAfter: number | null } {
  let countAfter: number | null = null;

  const nodes = row.nodes.map((node) => {
    if (node.id === nodeId) {
      countAfter = 0;
      return { ...node, count: 0 };
    }

    if (!node.childRow) {
      return node;
    }

    const childResult = resetCounterById(node.childRow, nodeId);
    if (childResult.countAfter === null) {
      return node;
    }

    countAfter = childResult.countAfter;
    return { ...node, childRow: childResult.row };
  });

  return { row: { ...row, nodes }, countAfter };
}

export function resetAllCounters(row: CounterRow): CounterRow {
  return {
    ...row,
    nodes: row.nodes.map((node) => ({
      ...node,
      count: 0,
      childRow: node.childRow ? resetAllCounters(node.childRow) : null,
    })),
  };
}

export function appendChildCounter(
  row: CounterRow,
  nodeId: string,
): { row: CounterRow; newNode: CounterNode | null } {
  let newNode: CounterNode | null = null;

  const nodes = row.nodes.map((node) => {
    if (node.id === nodeId) {
      const createdNode = createCounterNode();
      newNode = createdNode;

      const childRow = node.childRow
        ? { ...node.childRow, nodes: [...node.childRow.nodes, createdNode] }
        : {
            id: createEntityId("row"),
            title: "",
            nodes: [createdNode],
            createdAt: Date.now(),
          };

      return { ...node, childRow };
    }

    if (!node.childRow) {
      return node;
    }

    const childResult = appendChildCounter(node.childRow, nodeId);
    if (!childResult.newNode) {
      return node;
    }

    newNode = childResult.newNode;
    return { ...node, childRow: childResult.row };
  });

  return { row: { ...row, nodes }, newNode };
}

export function insertSiblingCounter(
  row: CounterRow,
  nodeId: string,
): { row: CounterRow; newNode: CounterNode | null } {
  for (let index = 0; index < row.nodes.length; index += 1) {
    const node = row.nodes[index];
    if (node.id === nodeId) {
      const newNode = createCounterNode();
      return {
        row: {
          ...row,
          nodes: [...row.nodes.slice(0, index + 1), newNode, ...row.nodes.slice(index + 1)],
        },
        newNode,
      };
    }

    if (!node.childRow) {
      continue;
    }

    const childResult = insertSiblingCounter(node.childRow, nodeId);
    if (childResult.newNode) {
      return {
        row: {
          ...row,
          nodes: [
            ...row.nodes.slice(0, index),
            { ...node, childRow: childResult.row },
            ...row.nodes.slice(index + 1),
          ],
        },
        newNode: childResult.newNode,
      };
    }
  }

  return { row, newNode: null };
}

export function removeCounterById(
  row: CounterRow,
  nodeId: string,
  isRoot = true,
): { row: CounterRow; removed: boolean } {
  let removed = false;
  const nextNodes: CounterNode[] = [];

  for (const node of row.nodes) {
    if (node.id === nodeId) {
      removed = true;
      continue;
    }

    if (!node.childRow) {
      nextNodes.push(node);
      continue;
    }

    const childResult = removeCounterById(node.childRow, nodeId, false);
    if (!childResult.removed) {
      nextNodes.push(node);
      continue;
    }

    removed = true;
    nextNodes.push({
      ...node,
      childRow: childResult.row.nodes.length > 0 ? childResult.row : null,
    });
  }

  if (!removed) {
    return { row, removed: false };
  }

  if (nextNodes.length === 0 && isRoot) {
    return {
      row: {
        ...row,
        nodes: [createCounterNode()],
      },
      removed: true,
    };
  }

  return {
    row: {
      ...row,
      nodes: nextNodes,
    },
    removed: true,
  };
}

export function renameCounterNode(
  row: CounterRow,
  nodeId: string,
  title: string,
): { row: CounterRow; renamed: boolean } {
  let renamed = false;

  const nodes = row.nodes.map((node) => {
    if (node.id === nodeId) {
      renamed = true;
      return { ...node, title };
    }

    if (!node.childRow) {
      return node;
    }

    const childResult = renameCounterNode(node.childRow, nodeId, title);
    if (!childResult.renamed) {
      return node;
    }

    renamed = true;
    return { ...node, childRow: childResult.row };
  });

  return { row: renamed ? { ...row, nodes } : row, renamed };
}
