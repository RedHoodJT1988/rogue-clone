import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Container, Paper, List, ListItem, LinearProgress, Button, Chip } from '@mui/material';
import { useAppDispatch, useAppSelector } from './store';
import { movePlayer, moveTargetCursor, castScroll, cancelTargeting, resetGame, getPlayerStats } from './store/gameSlice';
import { InventoryModal } from './components/InventoryModal';

const getLogColor = (log: string) => {
  const lowerLog = log.toLowerCase();
  if (lowerLog.includes('damage') || lowerLog.includes('hits you') || lowerLog.includes('suffers')) return '#ff5555'; 
  if (lowerLog.includes('defeated')) return '#ff79c6'; 
  if (lowerLog.includes('restored') || lowerLog.includes('picked up')) return '#50fa7b'; 
  if (lowerLog.includes('equipped') || lowerLog.includes('dropped')) return '#8be9fd'; 
  if (lowerLog.includes('cast') || lowerLog.includes('targeting') || lowerLog.includes('confused')) return '#bd93f9'; 
  if (lowerLog.includes('descend') || lowerLog.includes('inventory full')) return '#f1fa8c'; 
  return '#f8f8f2'; 
};

export default function App() {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { dungeonLevel, grid, explored, visible, player, monsters, items, logs, targeting } = useAppSelector(
    (state) => state.game
  );

  const isDead = player.hp <= 0;
  const { totalAttack, totalDefense } = getPlayerStats(player);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (targeting.active) {
        switch (e.key) {
          case 'ArrowUp': case 'w': case 'W': dispatch(moveTargetCursor({ dx: 0, dy: -1 })); break;
          case 'ArrowDown': case 's': case 'S': dispatch(moveTargetCursor({ dx: 0, dy: 1 })); break;
          case 'ArrowLeft': case 'a': case 'A': dispatch(moveTargetCursor({ dx: -1, dy: 0 })); break;
          case 'ArrowRight': case 'd': case 'D': dispatch(moveTargetCursor({ dx: 1, dy: 0 })); break;
          case 'Enter': dispatch(castScroll()); break;
          case 'Escape': dispatch(cancelTargeting()); break;
        }
        return;
      }

      if (e.key === 'i' || e.key === 'I') {
        setInventoryOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape' && inventoryOpen) {
        setInventoryOpen(false);
        return;
      }

      if (isDead || inventoryOpen) return;

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': dispatch(movePlayer({ dx: 0, dy: -1 })); break;
        case 'ArrowDown': case 's': case 'S': dispatch(movePlayer({ dx: 0, dy: 1 })); break;
        case 'ArrowLeft': case 'a': case 'A': dispatch(movePlayer({ dx: -1, dy: 0 })); break;
        case 'ArrowRight': case 'd': case 'D': dispatch(movePlayer({ dx: 1, dy: 0 })); break;
      }
    },
    [dispatch, isDead, inventoryOpen, targeting.active]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderCell = (x: number, y: number) => {
    if (targeting.active) {
      if (targeting.cursor.x === x && targeting.cursor.y === y) {
        return <span style={{ color: '#ff3838', fontWeight: 'bold', backgroundColor: '#4b1e1e' }}>X</span>;
      }
      const distFromTarget = Math.hypot(x - targeting.cursor.x, y - targeting.cursor.y);
      if (distFromTarget <= targeting.radius) {
        return <span style={{ color: '#fffa65', backgroundColor: '#3d3a1a' }}>*</span>;
      }
    }

    const isExplored = explored[y]?.[x];
    const isVisible = visible[y]?.[x];

    if (!isExplored) return ' ';

    if (isVisible) {
      if (player.position.x === x && player.position.y === y) {
        return <span style={{ color: player.color, fontWeight: 'bold' }}>{player.char}</span>;
      }

      const monster = monsters.find((m) => m.position.x === x && m.position.y === y);
      if (monster) {
        let monsterColor = monster.color;
        if (monster.statuses.some((s) => s.type === 'FROZEN')) monsterColor = '#74b9ff';
        if (monster.statuses.some((s) => s.type === 'BURNING')) monsterColor = '#ff7675';
        if (monster.statuses.some((s) => s.type === 'CONFUSED')) monsterColor = '#a29bfe';
        return <span style={{ color: monsterColor, fontWeight: 'bold' }}>{monster.char}</span>;
      }

      const item = items.find((i) => i.position?.x === x && i.position?.y === y);
      if (item) {
        return <span style={{ color: item.color, fontWeight: 'bold' }}>{item.char}</span>;
      }
    }

    const tile = grid[y][x];
    const wallColor = isVisible ? '#8b949e' : '#30363d';
    const floorColor = isVisible ? '#484f58' : '#21262d';
    const stairsColor = isVisible ? '#51cf66' : '#238636';

    switch (tile) {
      case 'WALL': return <span style={{ color: wallColor }}>#</span>;
      case 'FLOOR': return <span style={{ color: floorColor }}>.</span>;
      case 'CORRIDOR': return <span style={{ color: wallColor }}>#</span>;
      case 'STAIRS_DOWN': return <span style={{ color: stairsColor, fontWeight: 'bold' }}>&gt;</span>;
      default: return ' ';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, bgcolor: '#0d1117', minHeight: '100vh', color: '#c9d1d9' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#58a6ff' }}>
          ROGUE CLONE — LEVEL {dungeonLevel}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="primary" onClick={() => setInventoryOpen(true)} disabled={targeting.active}>
            Inventory [I] ({player.inventory.length}/12)
          </Button>
          {isDead && (
            <Button variant="contained" color="error" onClick={() => dispatch(resetGame())}>
              Respawn
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            HP: {player.hp} / {player.maxHp}
          </Typography>
          <Chip label={`ATK: ${totalAttack} (${player.baseAttack} + ${player.equipment.weapon?.value || 0})`} size="small" sx={{ bgcolor: '#21262d', color: '#70a1ff' }} />
          <Chip label={`DEF: ${totalDefense} (${player.baseDefense} + ${player.equipment.armor?.value || 0})`} size="small" sx={{ bgcolor: '#21262d', color: '#eccc68' }} />
          
          {player.statuses.map((s, idx) => (
            <Chip key={idx} label={`${s.type} (${s.duration}t)`} size="small" color={s.type === 'BURNING' ? 'error' : 'info'} />
          ))}

          {targeting.active && (
            <Chip label="TARGETING MODE: [ENTER] CAST | [ESC] CANCEL" size="small" sx={{ bgcolor: '#d63031', color: '#fff', fontWeight: 'bold' }} />
          )}
        </Box>
        <LinearProgress
          variant="determinate"
          value={(player.hp / player.maxHp) * 100}
          sx={{ height: 10, borderRadius: 1, bgcolor: '#21262d', '& .MuiLinearProgress-bar': { bgcolor: player.hp < 10 ? '#f85149' : '#238636' } }}
        />
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 2, 
          bgcolor: '#000', 
          fontFamily: '"Courier New", Courier, monospace', 
          fontSize: '15px',
          lineHeight: '15px', 
          letterSpacing: '3px', 
          overflowX: 'auto', 
          userSelect: 'none',
          border: targeting.active ? '1px solid #d63031' : '1px solid #30363d',
        }}
      >
        {grid.map((row, y) => (
          <div key={y} style={{ whiteSpace: 'pre' }}>
            {row.map((_, x) => (
              <React.Fragment key={`${x}-${y}`}>{renderCell(x, y)}</React.Fragment>
            ))}
          </div>
        ))}
      </Paper>

      <Paper sx={{ mt: 2, p: 2, bgcolor: '#282a36', border: '1px solid #44475a' }}>
        <Typography variant="subtitle2" sx={{ color: '#bd93f9', fontFamily: 'monospace', mb: 1, fontWeight: 'bold' }}>
          Action Log:
        </Typography>
        <List dense disablePadding>
          {logs.map((log, idx) => (
            <ListItem key={idx} disablePadding sx={{ alignItems: 'flex-start', mb: 0.5 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '14px', color: '#6272a4', mr: 1, fontWeight: 'bold' }}>
                {'>'}
              </Typography>
              <Typography 
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '14px', 
                  color: getLogColor(log),
                  fontWeight: '500' 
                }}
              >
                {log}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Paper>

      <InventoryModal open={inventoryOpen} onClose={() => setInventoryOpen(false)} />
    </Container>
  );
}