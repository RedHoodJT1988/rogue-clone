import type { TileType, ItemType } from '../types/game';

export interface SpriteCoord {
  x: number;
  y: number;
}

export const TILE_SPRITES: Record<TileType, SpriteCoord> = {
  FLOOR: { x: 0, y: 0 },
  WALL: { x: 10, y: 17 },
  CORRIDOR: { x: 1, y: 0 },
  DOOR: { x: 9, y: 2 },
  STAIRS_DOWN: { x: 2, y: 6 },
};

export const ITEM_SPRITES: Record<ItemType, SpriteCoord> = {
  POTION: { x: 30, y: 14 },
  WEAPON: { x: 32, y: 8 },
  ARMOR: { x: 32, y: 4 },
  SCROLL: { x: 25, y: 14 },
};

export const ENTITY_SPRITES: Record<string, SpriteCoord> = {
  '@': { x: 25, y: 0 }, // Player
  'K': { x: 29, y: 5 }, // Kestrel / Bird
  'H': { x: 26, y: 2 }, // Hobgoblin
  'D': { x: 29, y: 8 }, // Dragon
};

export const getSpriteStyle = (coord: SpriteCoord, color: string) => ({
  width: '16px',
  height: '16px',
  display: 'inline-block',
  backgroundColor: color, // The color we want to tint the sprite
  WebkitMaskImage: 'url(/spritesheet.png)',
  maskImage: 'url(/spritesheet.png)',
  WebkitMaskPosition: `-${coord.x * 16}px -${coord.y * 16}px`,
  maskPosition: `-${coord.x * 16}px -${coord.y * 16}px`,
  WebkitMaskSize: '784px 352px', // Adjust if your spritesheet dimensions differ from 49x22 tiles
  maskSize: '784px 352px',
});