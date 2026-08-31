import { TileType, Rect, Position, Entity, Item } from '../types/game';

export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 24;

export function generateDungeon(level: number): {
  grid: TileType[][];
  playerStart: Position;
  monsters: Entity[];
  items: Item[];
} {
  const grid: TileType[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill('WALL')
  );

  const rooms: Rect[] = [];
  const gridRows = 3;
  const gridCols = 3;
  const cellWidth = Math.floor(MAP_WIDTH / gridCols);
  const cellHeight = Math.floor(MAP_HEIGHT / gridRows);

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (Math.random() < 0.1 && rooms.length >= 4) continue;

      const roomW = Math.floor(Math.random() * (cellWidth - 8)) + 5;
      const roomH = Math.floor(Math.random() * (cellHeight - 4)) + 3;
      const roomX = c * cellWidth + Math.floor(Math.random() * (cellWidth - roomW - 2)) + 1;
      const roomY = r * cellHeight + Math.floor(Math.random() * (cellHeight - roomH - 2)) + 1;

      const room: Rect = { x: roomX, y: roomY, width: roomW, height: roomH };
      rooms.push(room);

      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          grid[y][x] = 'FLOOR';
        }
      }
    }
  }

  for (let i = 0; i < rooms.length - 1; i++) {
    const roomA = rooms[i];
    const roomB = rooms[i + 1];

    const startX = Math.floor(roomA.x + roomA.width / 2);
    const startY = Math.floor(roomA.y + roomA.height / 2);
    const endX = Math.floor(roomB.x + roomB.width / 2);
    const endY = Math.floor(roomB.y + roomB.height / 2);

    let currX = startX;
    let currY = startY;

    while (currX !== endX) {
      if (grid[currY][currX] === 'WALL') grid[currY][currX] = 'CORRIDOR';
      currX += currX < endX ? 1 : -1;
    }
    while (currY !== endY) {
      if (grid[currY][currX] === 'WALL') grid[currY][currX] = 'CORRIDOR';
      currY += currY < endY ? 1 : -1;
    }
  }

  const lastRoom = rooms[rooms.length - 1];
  grid[Math.floor(lastRoom.y + lastRoom.height / 2)][Math.floor(lastRoom.x + lastRoom.width / 2)] = 'STAIRS_DOWN';

  const firstRoom = rooms[0];
  const playerStart: Position = {
    x: Math.floor(firstRoom.x + firstRoom.width / 2),
    y: Math.floor(firstRoom.y + firstRoom.height / 2),
  };

  const monsters: Entity[] = [];
  const items: Item[] = [];

  const monsterTypes = [
    { name: 'Kestrel', char: 'K', color: '#ff8787', hp: 7 + level * 2, attack: 3 + level, defense: 1 },
    { name: 'Hobgoblin', char: 'H', color: '#69db7c', hp: 14 + level * 3, attack: 6 + level, defense: 2 },
    { name: 'Dragon', char: 'D', color: '#ffa94d', hp: 28 + level * 5, attack: 10 + level * 2, defense: 4 },
  ];

  const itemTemplates: Omit<Item, 'id' | 'position'>[] = [
    { name: 'Healing Potion', char: '!', color: '#ff6b81', type: 'POTION', value: 15, description: 'Restores 15 HP.' },
    { name: 'Shortsword', char: '/', color: '#70a1ff', type: 'WEAPON', value: 3, description: '+3 Attack power.' },
    { name: 'Leather Armor', char: ']', color: '#eccc68', type: 'ARMOR', value: 2, description: '+2 Defense rating.' },
    { name: 'Scroll of Fireball', char: '?', color: '#ff7675', type: 'SCROLL', value: 20, spell: 'FIREBALL', radius: 2, description: 'Deals 20 damage and Burns targets in a 2-tile radius.' },
    { name: 'Scroll of Frost Nova', char: '?', color: '#74b9ff', type: 'SCROLL', value: 8, spell: 'FROST_NOVA', radius: 3, description: 'Freezes all enemies in a 3-tile radius for 3 turns.' },
    { name: 'Scroll of Confusion', char: '?', color: '#a29bfe', type: 'SCROLL', value: 0, spell: 'CONFUSION', radius: 2, description: 'Confuses targets for 4 turns, causing chaotic movement.' },
  ];

  rooms.slice(1).forEach((room, index) => {
    if (Math.random() < 0.65) {
      const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
      monsters.push({
        id: `monster-${level}-${index}`,
        name: type.name,
        char: type.char,
        color: type.color,
        position: {
          x: room.x + Math.floor(Math.random() * room.width),
          y: room.y + Math.floor(Math.random() * room.height),
        },
        hp: type.hp,
        maxHp: type.hp,
        attack: type.attack,
        defense: type.defense,
        statuses: [],
      });
    }

    if (Math.random() < 0.55) {
      const template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
      items.push({
        ...template,
        id: `item-${level}-${index}-${Date.now()}`,
        position: {
          x: room.x + Math.floor(Math.random() * room.width),
          y: room.y + Math.floor(Math.random() * room.height),
        },
      });
    }
  });

  return { grid, playerStart, monsters, items };
}