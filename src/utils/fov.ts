import type { Position, TileType } from '../types/game';

export function computeFOV(
  origin: Position,
  radius: number,
  grid: TileType[][],
  mapWidth: number,
  mapHeight: number
): boolean[][] {
  const visible: boolean[][] = Array.from({ length: mapHeight }, () =>
    Array(mapWidth).fill(false)
  );

  visible[origin.y][origin.x] = true;

  const numRays = 360;
  const stepSize = 0.5;

  for (let i = 0; i < numRays; i++) {
    const rad = (i * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let currX = origin.x + 0.5;
    let currY = origin.y + 0.5;

    for (let d = 0; d < radius; d += stepSize) {
      currX += cos * stepSize;
      currY += sin * stepSize;

      const mapX = Math.floor(currX);
      const mapY = Math.floor(currY);

      if (mapX < 0 || mapX >= mapWidth || mapY < 0 || mapY >= mapHeight) {
        break;
      }

      visible[mapY][mapX] = true;

      if (grid[mapY][mapX] === 'WALL') {
        break;
      }
    }
  }

  return visible;
}

export function updateExploredMap(explored: boolean[][], visible: boolean[][]): void {
  for (let y = 0; y < explored.length; y++) {
    for (let x = 0; x < explored[y].length; x++) {
      if (visible[y][x]) {
        explored[y][x] = true;
      }
    }
  }
}