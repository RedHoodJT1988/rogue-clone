import type { TileType, Rect, Position, Entity, Item } from '../types/game';

export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 24;

const MIN_LEAF_SIZE = 8;
const MAX_LEAF_SIZE = 20;

class BSPLeaf {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public leftChild: BSPLeaf | null = null;
  public rightChild: BSPLeaf | null = null;
  public room: Rect | null = null;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public split(): boolean {
    if (this.leftChild !== null || this.rightChild !== null) return false;

    let splitH: boolean;
    if (this.width / this.height >= 1.25) {
      splitH = false; 
    } else if (this.height / this.width >= 1.25) {
      splitH = true; 
    } else {
      splitH = Math.random() > 0.5;
    }

    const max = (splitH ? this.height : this.width) - MIN_LEAF_SIZE;
    if (max <= MIN_LEAF_SIZE) return false; 

    const splitPoint = Math.floor(Math.random() * (max - MIN_LEAF_SIZE)) + MIN_LEAF_SIZE;

    if (splitH) {
      this.leftChild = new BSPLeaf(this.x, this.y, this.width, splitPoint);
      this.rightChild = new BSPLeaf(this.x, this.y + splitPoint, this.width, this.height - splitPoint);
    } else {
      this.leftChild = new BSPLeaf(this.x, this.y, splitPoint, this.height);
      this.rightChild = new BSPLeaf(this.x + splitPoint, this.y, this.width - splitPoint, this.height);
    }

    return true;
  }

  public createRooms(allRooms: Rect[], grid: TileType[][]): void {
    if (this.leftChild || this.rightChild) {
      if (this.leftChild) this.leftChild.createRooms(allRooms, grid);
      if (this.rightChild) this.rightChild.createRooms(allRooms, grid);
      return;
    }

    const roomWidth = Math.floor(Math.random() * (this.width - 4)) + 4;
    const roomHeight = Math.floor(Math.random() * (this.height - 4)) + 3;
    const roomX = this.x + Math.floor(Math.random() * (this.width - roomWidth - 1)) + 1;
    const roomY = this.y + Math.floor(Math.random() * (this.height - roomHeight - 1)) + 1;

    this.room = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
    allRooms.push(this.room);

    for (let y = this.room.y; y < this.room.y + this.room.height; y++) {
      for (let x = this.room.x; x < this.room.x + this.room.width; x++) {
        grid[y][x] = 'FLOOR';
      }
    }
  }

  public getRoom(): Rect | null {
    if (this.room) return this.room;
    let lRoom: Rect | null = null;
    let rRoom: Rect | null = null;
    if (this.leftChild) lRoom = this.leftChild.getRoom();
    if (this.rightChild) rRoom = this.rightChild.getRoom();

    if (!lRoom && !rRoom) return null;
    if (!lRoom) return rRoom;
    if (!rRoom) return lRoom;
    return Math.random() > 0.5 ? lRoom : rRoom;
  }
}

function carveHCorridor(grid: TileType[][], x1: number, x2: number, y: number) {
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  for (let x = startX; x <= endX; x++) {
    if (grid[y][x] === 'WALL') grid[y][x] = 'CORRIDOR';
  }
}

function carveVCorridor(grid: TileType[][], y1: number, y2: number, x: number) {
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);
  for (let y = startY; y <= endY; y++) {
    if (grid[y][x] === 'WALL') grid[y][x] = 'CORRIDOR';
  }
}

function connectLeaves(leaf: BSPLeaf, grid: TileType[][]) {
  if (!leaf.leftChild || !leaf.rightChild) return;

  connectLeaves(leaf.leftChild, grid);
  connectLeaves(leaf.rightChild, grid);

  const leftRoom = leaf.leftChild.getRoom();
  const rightRoom = leaf.rightChild.getRoom();

  if (leftRoom && rightRoom) {
    const point1: Position = {
      x: Math.floor(leftRoom.x + leftRoom.width / 2),
      y: Math.floor(leftRoom.y + leftRoom.height / 2),
    };
    const point2: Position = {
      x: Math.floor(rightRoom.x + rightRoom.width / 2),
      y: Math.floor(rightRoom.y + rightRoom.height / 2),
    };

    if (Math.random() > 0.5) {
      carveHCorridor(grid, point1.x, point2.x, point1.y);
      carveVCorridor(grid, point1.y, point2.y, point2.x);
    } else {
      carveVCorridor(grid, point1.y, point2.y, point1.x);
      carveHCorridor(grid, point1.x, point2.x, point2.y);
    }
  }
}

export function generateDungeon(level: number): {
  grid: TileType[][];
  playerStart: Position;
  monsters: Entity[];
  items: Item[];
} {
  const grid: TileType[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill('WALL')
  );

  const rootLeaf = new BSPLeaf(0, 0, MAP_WIDTH, MAP_HEIGHT);
  const leafs: BSPLeaf[] = [rootLeaf];

  let didSplit = true;
  while (didSplit) {
    didSplit = false;
    for (let i = 0; i < leafs.length; i++) {
      const leaf = leafs[i];
      if (!leaf.leftChild && !leaf.rightChild) {
        if (leaf.width > MAX_LEAF_SIZE || leaf.height > MAX_LEAF_SIZE || Math.random() > 0.25) {
          if (leaf.split()) {
            leafs.push(leaf.leftChild!);
            leafs.push(leaf.rightChild!);
            didSplit = true;
          }
        }
      }
    }
  }

  const rooms: Rect[] = [];
  rootLeaf.createRooms(rooms, grid);
  connectLeaves(rootLeaf, grid);

  const firstRoom = rooms[0];
  const lastRoom = rooms[rooms.length - 1];

  const playerStart: Position = {
    x: Math.floor(firstRoom.x + firstRoom.width / 2),
    y: Math.floor(firstRoom.y + firstRoom.height / 2),
  };

  const stairsX = Math.floor(lastRoom.x + lastRoom.width / 2);
  const stairsY = Math.floor(lastRoom.y + lastRoom.height / 2);
  grid[stairsY][stairsX] = 'STAIRS_DOWN';

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
    { name: 'Scroll of Fireball', char: '?', color: '#ff7675', type: 'SCROLL', value: 20, spell: 'FIREBALL', radius: 2, description: 'Deals 20 damage & burns in a 2-tile radius.' },
    { name: 'Scroll of Frost Nova', char: '?', color: '#74b9ff', type: 'SCROLL', value: 8, spell: 'FROST_NOVA', radius: 3, description: 'Freezes all enemies in a 3-tile radius for 3 turns.' },
    { name: 'Scroll of Confusion', char: '?', color: '#a29bfe', type: 'SCROLL', value: 0, spell: 'CONFUSION', radius: 2, description: 'Confuses targets for 4 turns.' },
  ];

  rooms.slice(1).forEach((room, index) => {
    const roomArea = room.width * room.height;
    const monsterChance = roomArea > 40 ? 0.8 : 0.5;

    if (Math.random() < monsterChance) {
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

    if (Math.random() < 0.5) {
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