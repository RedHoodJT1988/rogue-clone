import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GameState, Position, ActiveStatus, Entity } from '../types/game';
import { generateDungeon, MAP_WIDTH, MAP_HEIGHT } from '../utils/bspGenerator';
import { computeFOV, updateExploredMap } from '../utils/fov';
import { findNextStepAStar } from '../utils/pathfinding';

const FOV_RADIUS = 8;
const MAX_INVENTORY_SIZE = 12;

export const getPlayerStats = (player: GameState['player']) => {
  const weaponBonus = player.equipment.weapon?.value || 0;
  const armorBonus = player.equipment.armor?.value || 0;
  return {
    totalAttack: player.baseAttack + weaponBonus,
    totalDefense: player.baseDefense + armorBonus,
  };
};

const tickStatuses = (entity: Entity, logs: string[]): boolean => {
  let canAct = true;
  const remainingStatuses: ActiveStatus[] = [];

  for (const status of entity.statuses) {
    if (status.type === 'BURNING') {
      const burnDmg = status.potency || 3;
      entity.hp -= burnDmg;
      logs.push(`${entity.name} suffers ${burnDmg} burn damage!`);
    } else if (status.type === 'FROZEN') {
      canAct = false;
      logs.push(`${entity.name} is frozen solid and cannot move!`);
    }

    const nextDuration = status.duration - 1;
    if (nextDuration > 0) {
      remainingStatuses.push({ ...status, duration: nextDuration });
    } else {
      logs.push(`${entity.name} is no longer ${status.type.toLowerCase()}!`);
    }
  }

  entity.statuses = remainingStatuses;
  return canAct;
};

const createInitialState = (): GameState => {
  const dungeon = generateDungeon(1);
  const explored: boolean[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(false)
  );

  const visible = computeFOV(
    dungeon.playerStart,
    FOV_RADIUS,
    dungeon.grid,
    MAP_WIDTH,
    MAP_HEIGHT
  );
  updateExploredMap(explored, visible);

  return {
    dungeonLevel: 1,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    grid: dungeon.grid,
    explored,
    visible,
    fovRadius: FOV_RADIUS,
    player: {
      id: 'player',
      name: 'Rogue',
      char: '@',
      color: '#ffd43b',
      position: dungeon.playerStart,
      hp: 40,
      maxHp: 40,
      baseAttack: 6,
      baseDefense: 1,
      statuses: [],
      inventory: [
        {
          id: 'starter-fireball',
          name: 'Scroll of Fireball',
          char: '?',
          color: '#ff7675',
          type: 'SCROLL',
          value: 20,
          spell: 'FIREBALL',
          radius: 2,
          description: 'Deals 20 damage & burns in a 2-tile radius.',
        },
        {
          id: 'starter-potion',
          name: 'Healing Potion',
          char: '!',
          color: '#ff6b81',
          type: 'POTION',
          value: 15,
          description: 'Restores 15 HP.',
        },
      ],
      equipment: { weapon: null, armor: null },
    },
    monsters: dungeon.monsters,
    items: dungeon.items,
    logs: ['Welcome! Move with WASD/Arrows, Open Inventory with [I].'],
    targeting: {
      active: false,
      scrollId: null,
      cursor: { x: 0, y: 0 },
      radius: 0,
      spell: null,
    },
  };
};

const processMonsterTurns = (state: GameState) => {
  const { totalDefense } = getPlayerStats(state.player);

  state.monsters = state.monsters.filter((m) => m.hp > 0);

  for (const monster of state.monsters) {
    const canAct = tickStatuses(monster, state.logs);
    if (!canAct || monster.hp <= 0) continue;

    const isConfused = monster.statuses.some((s) => s.type === 'CONFUSED');

    if (isConfused) {
      const dirs = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];
      const randDir = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = monster.position.x + randDir.x;
      const ny = monster.position.y + randDir.y;
      const tile = state.grid[ny]?.[nx];
      if (tile === 'FLOOR' || tile === 'CORRIDOR') {
        monster.position = { x: nx, y: ny };
      }
      continue;
    }

    const dist = Math.hypot(
      state.player.position.x - monster.position.x,
      state.player.position.y - monster.position.y
    );

    if (dist <= 1.5) {
      const monsterDmg = Math.max(1, monster.attack - totalDefense);
      state.player.hp = Math.max(0, state.player.hp - monsterDmg);
      state.logs.push(`${monster.name} hits you for ${monsterDmg} damage!`);
    } else if (dist < 10) {
      const nextStep = findNextStepAStar(
        monster.position,
        state.player.position,
        state.grid,
        state.mapWidth,
        state.mapHeight,
        state.monsters,
        monster.id
      );

      if (nextStep && !(nextStep.x === state.player.position.x && nextStep.y === state.player.position.y)) {
        monster.position = nextStep;
      }
    }
  }
  state.monsters = state.monsters.filter((m) => m.hp > 0);
};

export const gameSlice = createSlice({
  name: 'game',
  initialState: createInitialState(),
  reducers: {
    movePlayer: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
      if (state.targeting.active) return;

      const playerCanAct = tickStatuses(state.player, state.logs);
      if (!playerCanAct) {
        processMonsterTurns(state);
        return;
      }

      const { dx, dy } = action.payload;
      const targetPos: Position = {
        x: state.player.position.x + dx,
        y: state.player.position.y + dy,
      };

      const tile = state.grid[targetPos.y]?.[targetPos.x];
      if (!tile || tile === 'WALL') return;

      const monsterIdx = state.monsters.findIndex(
        (m) => m.position.x === targetPos.x && m.position.y === targetPos.y
      );

      const { totalAttack } = getPlayerStats(state.player);

      if (monsterIdx !== -1) {
        const monster = state.monsters[monsterIdx];
        const damage = Math.max(1, totalAttack - monster.defense);
        monster.hp -= damage;
        state.logs.push(`You strike ${monster.name} for ${damage} damage.`);
        if (monster.hp <= 0) {
          state.logs.push(`You defeated ${monster.name}!`);
          state.monsters.splice(monsterIdx, 1);
        }
      } else {
        state.player.position = targetPos;

        const itemIdx = state.items.findIndex(
          (item) => item.position?.x === targetPos.x && item.position?.y === targetPos.y
        );

        if (itemIdx !== -1) {
          const item = state.items[itemIdx];
          if (state.player.inventory.length < MAX_INVENTORY_SIZE) {
            const { position, ...inventoryItem } = item;
            state.player.inventory.push(inventoryItem);
            state.items.splice(itemIdx, 1);
            state.logs.push(`Picked up ${item.name}.`);
          } else {
            state.logs.push(`Inventory full! Cannot carry ${item.name}.`);
          }
        }

        if (tile === 'STAIRS_DOWN') {
          state.dungeonLevel += 1;
          const nextFloor = generateDungeon(state.dungeonLevel);
          state.grid = nextFloor.grid;
          state.player.position = nextFloor.playerStart;
          state.monsters = nextFloor.monsters;
          state.items = nextFloor.items;
          state.explored = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
          state.visible = computeFOV(nextFloor.playerStart, state.fovRadius, state.grid, MAP_WIDTH, MAP_HEIGHT);
          updateExploredMap(state.explored, state.visible);
          state.logs.push(`You descend deeper into Level ${state.dungeonLevel}...`);
          return;
        }
      }

      processMonsterTurns(state);

      state.visible = computeFOV(state.player.position, state.fovRadius, state.grid, MAP_WIDTH, MAP_HEIGHT);
      updateExploredMap(state.explored, state.visible);

      if (state.logs.length > 6) state.logs = state.logs.slice(-6);
    },

    startTargeting: (state, action: PayloadAction<string>) => {
      const item = state.player.inventory.find((i) => i.id === action.payload);
      if (!item || item.type !== 'SCROLL') return;
      state.targeting = {
        active: true,
        scrollId: item.id,
        cursor: { ...state.player.position },
        radius: item.radius || 1,
        spell: item.spell || null,
      };
      state.logs.push(`Targeting mode: Move cursor with WASD/Arrows, [Enter] to Cast, [Esc] to Cancel.`);
    },

    moveTargetCursor: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
      if (!state.targeting.active) return;
      const nextX = Math.max(0, Math.min(state.mapWidth - 1, state.targeting.cursor.x + action.payload.dx));
      const nextY = Math.max(0, Math.min(state.mapHeight - 1, state.targeting.cursor.y + action.payload.dy));
      state.targeting.cursor = { x: nextX, y: nextY };
    },

    cancelTargeting: (state) => {
      state.targeting.active = false;
      state.targeting.scrollId = null;
      state.logs.push('Cancelled spell casting.');
    },

    castScroll: (state) => {
      if (!state.targeting.active || !state.targeting.scrollId) return;

      const scrollIdx = state.player.inventory.findIndex((i) => i.id === state.targeting.scrollId);
      if (scrollIdx === -1) return;

      const scroll = state.player.inventory[scrollIdx];
      const origin = state.targeting.cursor;
      const radius = state.targeting.radius;

      state.logs.push(`Cast ${scroll.name}!`);

      state.monsters.forEach((monster) => {
        const dist = Math.hypot(monster.position.x - origin.x, monster.position.y - origin.y);
        if (dist <= radius) {
          if (scroll.spell === 'FIREBALL') {
            monster.hp -= scroll.value;
            monster.statuses.push({ type: 'BURNING', duration: 3, potency: 4 });
            state.logs.push(`${monster.name} is engulfed in flames for ${scroll.value} dmg!`);
          } else if (scroll.spell === 'FROST_NOVA') {
            monster.hp -= scroll.value;
            monster.statuses.push({ type: 'FROZEN', duration: 3 });
            state.logs.push(`${monster.name} is frozen for 3 turns!`);
          } else if (scroll.spell === 'CONFUSION') {
            monster.statuses.push({ type: 'CONFUSED', duration: 4 });
            state.logs.push(`${monster.name} becomes confused!`);
          }
        }
      });

      const playerDist = Math.hypot(state.player.position.x - origin.x, state.player.position.y - origin.y);
      if (playerDist <= radius && scroll.spell === 'FIREBALL') {
        state.player.hp -= Math.floor(scroll.value / 2);
        state.logs.push(`You were caught in your own fireball blast!`);
      }

      state.player.inventory.splice(scrollIdx, 1);
      state.targeting.active = false;
      state.targeting.scrollId = null;

      processMonsterTurns(state);

      state.visible = computeFOV(state.player.position, state.fovRadius, state.grid, MAP_WIDTH, MAP_HEIGHT);
      updateExploredMap(state.explored, state.visible);
    },

    useItem: (state, action: PayloadAction<string>) => {
      const itemIndex = state.player.inventory.findIndex((i) => i.id === action.payload);
      if (itemIndex === -1) return;

      const item = state.player.inventory[itemIndex];
      if (item.type === 'POTION') {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + item.value);
        state.logs.push(`Used ${item.name}. Restored ${item.value} HP.`);
        state.player.inventory.splice(itemIndex, 1);
      }
    },

    equipItem: (state, action: PayloadAction<string>) => {
      const itemIndex = state.player.inventory.findIndex((i) => i.id === action.payload);
      if (itemIndex === -1) return;

      const item = state.player.inventory[itemIndex];

      if (item.type === 'WEAPON') {
        const currentWeapon = state.player.equipment.weapon;
        state.player.inventory.splice(itemIndex, 1);
        if (currentWeapon) state.player.inventory.push(currentWeapon);
        state.player.equipment.weapon = item;
        state.logs.push(`Equipped weapon: ${item.name}.`);
      } else if (item.type === 'ARMOR') {
        const currentArmor = state.player.equipment.armor;
        state.player.inventory.splice(itemIndex, 1);
        if (currentArmor) state.player.inventory.push(currentArmor);
        state.player.equipment.armor = item;
        state.logs.push(`Equipped armor: ${item.name}.`);
      }
    },

    unequipItem: (state, action: PayloadAction<'weapon' | 'armor'>) => {
      const slot = action.payload;
      const equippedItem = state.player.equipment[slot];

      if (!equippedItem) return;
      if (state.player.inventory.length >= MAX_INVENTORY_SIZE) {
        state.logs.push('Inventory is full! Cannot unequip.');
        return;
      }

      state.player.inventory.push(equippedItem);
      state.player.equipment[slot] = null;
      state.logs.push(`Unequipped ${equippedItem.name}.`);
    },

    dropItem: (state, action: PayloadAction<string>) => {
      const itemIndex = state.player.inventory.findIndex((i) => i.id === action.payload);
      if (itemIndex === -1) return;

      const item = state.player.inventory[itemIndex];
      state.player.inventory.splice(itemIndex, 1);
      state.items.push({ ...item, position: { ...state.player.position } });
      state.logs.push(`Dropped ${item.name} on the floor.`);
    },

    resetGame: () => createInitialState(),
  },
});

export const {
  movePlayer, startTargeting, moveTargetCursor, cancelTargeting, castScroll,
  useItem, equipItem, unequipItem, dropItem, resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;