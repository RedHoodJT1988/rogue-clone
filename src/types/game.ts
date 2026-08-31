export type TileType = 'WALL' | 'FLOOR' | 'DOOR' | 'CORRIDOR' | 'STAIRS_DOWN';

export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type StatusType = 'FROZEN' | 'BURNING' | 'CONFUSED';

export interface ActiveStatus {
  type: StatusType;
  duration: number; // Turns remaining
  potency?: number; // e.g., burn damage per turn
}

export type ScrollSpell = 'FIREBALL' | 'FROST_NOVA' | 'LIGHTNING' | 'CONFUSION';

export type ItemType = 'POTION' | 'WEAPON' | 'ARMOR' | 'SCROLL';

export interface Item {
  id: string;
  name: string;
  char: string;
  color: string;
  type: ItemType;
  value: number; // Potion heal, weapon ATK, armor DEF, scroll power/damage
  description: string;
  position?: Position;
  spell?: ScrollSpell;
  radius?: number; // AoE radius
}

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
}

export interface Entity {
  id: string;
  name: string;
  char: string;
  color: string;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  statuses: ActiveStatus[];
}

export interface Player extends Entity {
  baseAttack: number;
  baseDefense: number;
  inventory: Item[];
  equipment: Equipment;
}

export interface TargetingState {
  active: boolean;
  scrollId: string | null;
  cursor: Position;
  radius: number;
  spell: ScrollSpell | null;
}

export interface GameState {
  dungeonLevel: number;
  mapWidth: number;
  mapHeight: number;
  grid: TileType[][];
  explored: boolean[][];
  visible: boolean[][];
  fovRadius: number;
  player: Player;
  monsters: Entity[];
  items: Item[];
  logs: string[];
  targeting: TargetingState;
}