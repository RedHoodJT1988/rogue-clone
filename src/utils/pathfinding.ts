import type { Position, TileType, Entity } from '../types/game';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

const manhattanDistance = (a: Position, b: Position): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

export function findNextStepAStar(
  start: Position,
  target: Position,
  grid: TileType[][],
  mapWidth: number,
  mapHeight: number,
  monsters: Entity[],
  currentMonsterId: string
): Position | null {
  if (start.x === target.x && start.y === target.y) return null;

  const openList: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: manhattanDistance(start, target),
    f: manhattanDistance(start, target),
    parent: null,
  };

  openList.push(startNode);

  const occupiedTiles = new Set<string>();
  for (const m of monsters) {
    if (m.id !== currentMonsterId) {
      occupiedTiles.add(`${m.position.x},${m.position.y}`);
    }
  }

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  let iterations = 0;
  const maxIterations = 300; 

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    let lowestIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (
        openList[i].f < openList[lowestIndex].f ||
        (openList[i].f === openList[lowestIndex].f && openList[i].h < openList[lowestIndex].h)
      ) {
        lowestIndex = i;
      }
    }

    const current = openList.splice(lowestIndex, 1)[0];
    const currentKey = `${current.x},${current.y}`;
    closedSet.add(currentKey);

    if (current.x === target.x && current.y === target.y) {
      let curr: PathNode | null = current;
      while (curr && curr.parent && (curr.parent.x !== start.x || curr.parent.y !== start.y)) {
        curr = curr.parent;
      }
      return curr ? { x: curr.x, y: curr.y } : null;
    }

    for (const dir of directions) {
      const neighborX = current.x + dir.x;
      const neighborY = current.y + dir.y;
      const neighborKey = `${neighborX},${neighborY}`;

      if (neighborX < 0 || neighborX >= mapWidth || neighborY < 0 || neighborY >= mapHeight) continue;

      const tile = grid[neighborY]?.[neighborX];
      const isWalkable = tile === 'FLOOR' || tile === 'CORRIDOR' || tile === 'DOOR' || tile === 'STAIRS_DOWN';

      if (!isWalkable) continue;
      if (closedSet.has(neighborKey)) continue;

      const isTarget = neighborX === target.x && neighborY === target.y;
      if (!isTarget && occupiedTiles.has(neighborKey)) continue;

      const gScore = current.g + 1;
      const existingOpen = openList.find((n) => n.x === neighborX && n.y === neighborY);

      if (!existingOpen) {
        const hScore = manhattanDistance({ x: neighborX, y: neighborY }, target);
        openList.push({
          x: neighborX,
          y: neighborY,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        });
      } else if (gScore < existingOpen.g) {
        existingOpen.g = gScore;
        existingOpen.f = gScore + existingOpen.h;
        existingOpen.parent = current;
      }
    }
  }

  return null;
}