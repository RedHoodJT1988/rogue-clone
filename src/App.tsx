import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Container, Paper, List, ListItem, LinearProgress, Button, Chip } from '@mui/material';
import { useAppDispatch, useAppSelector } from './store';
import { 
  movePlayer, moveTargetCursor, castScroll, cancelTargeting, resetGame, getPlayerStats,
  showMenu, startGame 
} from './store/gameSlice';
import { InventoryModal } from './components/InventoryModal';
import { TILE_SPRITES, ITEM_SPRITES, ENTITY_SPRITES, getSpriteStyle } from './utils/sprites';

// Google Font injection for Title Screen
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Helper to apply Dracula Theme colors based on log content
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
  const { 
    screen, graphicsMode, dungeonLevel, grid, explored, visible, 
    player, monsters, items, logs, targeting 
  } = useAppSelector((state) => state.game);

  const isDead = player.hp <= 0;
  const { totalAttack, totalDefense } = getPlayerStats(player);

  // --- REUSABLE CONTROL LOGIC (Works for Keyboard AND Touch) ---
  const handleDirectionInput = useCallback((dx: number, dy: number) => {
    if (isDead || inventoryOpen) return;
    if (targeting.active) {
      dispatch(moveTargetCursor({ dx, dy }));
    } else {
      dispatch(movePlayer({ dx, dy }));
    }
  }, [dispatch, isDead, inventoryOpen, targeting.active]);

  const handleActionInput = useCallback((action: 'INVENTORY' | 'CAST' | 'CANCEL') => {
    if (isDead) return;
    if (action === 'INVENTORY') setInventoryOpen((prev) => !prev);
    if (action === 'CAST') dispatch(castScroll());
    if (action === 'CANCEL') dispatch(cancelTargeting());
  }, [dispatch, isDead]);


  // --- KEYBOARD LISTENER ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (screen === 'TITLE') {
        if (e.key === 'Enter') dispatch(showMenu());
        return;
      }
      if (screen === 'MENU') return; 

      if (targeting.active) {
        switch (e.key) {
          case 'ArrowUp': case 'w': case 'W': handleDirectionInput(0, -1); break;
          case 'ArrowDown': case 's': case 'S': handleDirectionInput(0, 1); break;
          case 'ArrowLeft': case 'a': case 'A': handleDirectionInput(-1, 0); break;
          case 'ArrowRight': case 'd': case 'D': handleDirectionInput(1, 0); break;
          case 'Enter': handleActionInput('CAST'); break;
          case 'Escape': handleActionInput('CANCEL'); break;
        }
        return;
      }

      if (e.key === 'i' || e.key === 'I') {
        handleActionInput('INVENTORY');
        return;
      }
      if (e.key === 'Escape' && inventoryOpen) {
        setInventoryOpen(false);
        return;
      }

      if (isDead || inventoryOpen) return;

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': handleDirectionInput(0, -1); break;
        case 'ArrowDown': case 's': case 'S': handleDirectionInput(0, 1); break;
        case 'ArrowLeft': case 'a': case 'A': handleDirectionInput(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D': handleDirectionInput(1, 0); break;
      }
    },
    [screen, dispatch, isDead, inventoryOpen, targeting.active, handleDirectionInput, handleActionInput]
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

    if (!isExplored) return graphicsMode === '1BIT' ? <span style={{ display: 'inline-block', width: 16, height: 16 }} /> : ' ';

    if (isVisible) {
      if (player.position.x === x && player.position.y === y) {
        return graphicsMode === '1BIT' 
          ? <div style={getSpriteStyle(ENTITY_SPRITES['@'], player.color)} />
          : <span style={{ color: player.color, fontWeight: 'bold' }}>{player.char}</span>;
      }

      const monster = monsters.find((m) => m.position.x === x && m.position.y === y);
      if (monster) {
        let monsterColor = monster.color;
        if (monster.statuses.some((s) => s.type === 'FROZEN')) monsterColor = '#74b9ff';
        if (monster.statuses.some((s) => s.type === 'BURNING')) monsterColor = '#ff7675';
        if (monster.statuses.some((s) => s.type === 'CONFUSED')) monsterColor = '#a29bfe';
        
        return graphicsMode === '1BIT'
          ? <div style={getSpriteStyle(ENTITY_SPRITES[monster.char] || ENTITY_SPRITES['H'], monsterColor)} />
          : <span style={{ color: monsterColor, fontWeight: 'bold' }}>{monster.char}</span>;
      }

      const item = items.find((i) => i.position?.x === x && i.position?.y === y);
      if (item) {
        return graphicsMode === '1BIT'
          ? <div style={getSpriteStyle(ITEM_SPRITES[item.type], item.color)} />
          : <span style={{ color: item.color, fontWeight: 'bold' }}>{item.char}</span>;
      }
    }

    const tile = grid[y][x];
    const wallColor = isVisible ? '#8b949e' : '#30363d';
    const floorColor = isVisible ? '#484f58' : '#21262d';
    const stairsColor = isVisible ? '#51cf66' : '#238636';

    if (graphicsMode === '1BIT') {
      const tileColor = tile === 'WALL' || tile === 'CORRIDOR' ? wallColor : tile === 'STAIRS_DOWN' ? stairsColor : floorColor;
      return <div style={getSpriteStyle(TILE_SPRITES[tile], tileColor)} />;
    }

    switch (tile) {
      case 'WALL': return <span style={{ color: wallColor }}>#</span>;
      case 'FLOOR': return <span style={{ color: floorColor }}>.</span>;
      case 'CORRIDOR': return <span style={{ color: wallColor }}>#</span>;
      case 'STAIRS_DOWN': return <span style={{ color: stairsColor, fontWeight: 'bold' }}>&gt;</span>;
      default: return ' ';
    }
  };


  // --- UI SCREENS ---
  if (screen === 'TITLE') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0d1117', color: '#fff', px: 2 }}>
        <Typography sx={{ fontFamily: '"Press Start 2P", monospace', fontSize: { xs: '1.5rem', md: '4rem' }, color: '#58a6ff', mb: 8, textAlign: 'center', textShadow: '2px 2px 4px rgba(88,166,255,0.4)' }}>
          DUNGEONS OF DOOM
        </Typography>
        <Typography sx={{ fontFamily: '"Press Start 2P", monospace', fontSize: { xs: '0.8rem', md: '1rem' }, color: '#50fa7b', animation: 'blink 1.5s infinite', textAlign: 'center' }}>
          PRESS ENTER (OR TAP) TO START
        </Typography>
        <Box onClick={() => dispatch(showMenu())} sx={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />
        <style>
          {`@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }`}
        </style>
      </Box>
    );
  }

  if (screen === 'MENU') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0d1117', color: '#fff', px: 2 }}>
        <Typography sx={{ fontFamily: '"Press Start 2P", monospace', fontSize: { xs: '1.2rem', md: '2rem' }, color: '#bd93f9', mb: 6, textAlign: 'center' }}>
          CHOOSE YOUR STYLE
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          <Paper onClick={() => dispatch(startGame('ASCII'))} sx={{ p: 4, bgcolor: '#161b22', border: '2px solid #30363d', cursor: 'pointer', '&:hover': { borderColor: '#58a6ff', bgcolor: '#21262d' } }}>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', color: '#58a6ff', mb: 2, textAlign: 'center', fontWeight: 'bold' }}>CLASSIC ASCII</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#8b949e', textAlign: 'center', maxWidth: 200 }}>
              The authentic 1980s terminal experience. Pure text, pure imagination.
            </Typography>
          </Paper>
          <Paper onClick={() => dispatch(startGame('1BIT'))} sx={{ p: 4, bgcolor: '#161b22', border: '2px solid #30363d', cursor: 'pointer', '&:hover': { borderColor: '#50fa7b', bgcolor: '#21262d' } }}>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', color: '#50fa7b', mb: 2, textAlign: 'center', fontWeight: 'bold' }}>MODERN 1-BIT</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#8b949e', textAlign: 'center', maxWidth: 200 }}>
              Pixel-perfect graphical tiles powered by the Kenney.nl asset pack.
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2, bgcolor: '#0d1117', minHeight: '100vh', color: '#c9d1d9', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top HUD */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#58a6ff' }}>
          Lvl {dungeonLevel}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isDead && (
            <Button variant="contained" color="error" size="small" onClick={() => dispatch(resetGame())}>
              Respawn
            </Button>
          )}
        </Box>
      </Box>

      {/* Stats Bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            HP: {player.hp}/{player.maxHp}
          </Typography>
          <Chip label={`ATK: ${totalAttack}`} size="small" sx={{ bgcolor: '#21262d', color: '#70a1ff', fontSize: '0.75rem' }} />
          <Chip label={`DEF: ${totalDefense}`} size="small" sx={{ bgcolor: '#21262d', color: '#eccc68', fontSize: '0.75rem' }} />
          {player.statuses.map((s, idx) => (
            <Chip key={idx} label={`${s.type}`} size="small" color={s.type === 'BURNING' ? 'error' : 'info'} sx={{ fontSize: '0.75rem' }}/>
          ))}
          {targeting.active && (
            <Chip label="TARGETING" size="small" sx={{ bgcolor: '#d63031', color: '#fff', fontWeight: 'bold', fontSize: '0.75rem' }} />
          )}
        </Box>
        <LinearProgress
          variant="determinate"
          value={(player.hp / player.maxHp) * 100}
          sx={{ height: 8, borderRadius: 1, bgcolor: '#21262d', '& .MuiLinearProgress-bar': { bgcolor: player.hp < 10 ? '#f85149' : '#238636' } }}
        />
      </Box>

      {/* Viewport */}
      <Paper
        elevation={3}
        sx={{
          p: 2, 
          bgcolor: '#000', 
          fontFamily: '"Courier New", Courier, monospace', 
          fontSize: '15px',
          lineHeight: graphicsMode === '1BIT' ? '0' : '15px',
          letterSpacing: graphicsMode === '1BIT' ? '0' : '3px', 
          overflowX: 'auto', 
          userSelect: 'none',
          border: targeting.active ? '2px solid #d63031' : '1px solid #30363d',
          flexGrow: 1,
          mb: 2
        }}
      >
        {grid.map((row, y) => (
          <div key={y} style={{ whiteSpace: 'pre', height: graphicsMode === '1BIT' ? '16px' : 'auto' }}>
            {row.map((_, x) => (
              <React.Fragment key={`${x}-${y}`}>{renderCell(x, y)}</React.Fragment>
            ))}
          </div>
        ))}
      </Paper>

      {/* MOBILE CONTROLS (Always visible on touch, hides on large screens if desired, but good to keep for mouse play too!) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#161b22', borderRadius: 2, border: '1px solid #30363d', mb: 2 }}>
        
        {/* D-Pad */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gap: 1 }}>
          <Box />
          <Button variant="contained" sx={{ minWidth: 0, height: 48, p: 0, bgcolor: '#21262d', color: '#c9d1d9' }} onClick={() => handleDirectionInput(0, -1)}>W</Button>
          <Box />
          <Button variant="contained" sx={{ minWidth: 0, height: 48, p: 0, bgcolor: '#21262d', color: '#c9d1d9' }} onClick={() => handleDirectionInput(-1, 0)}>A</Button>
          <Button variant="contained" sx={{ minWidth: 0, height: 48, p: 0, bgcolor: '#21262d', color: '#c9d1d9' }} onClick={() => handleDirectionInput(0, 1)}>S</Button>
          <Button variant="contained" sx={{ minWidth: 0, height: 48, p: 0, bgcolor: '#21262d', color: '#c9d1d9' }} onClick={() => handleDirectionInput(1, 0)}>D</Button>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: '100px' }}>
          {targeting.active ? (
            <>
              <Button variant="contained" color="error" fullWidth onClick={() => handleActionInput('CAST')} sx={{ fontWeight: 'bold' }}>
                CAST
              </Button>
              <Button variant="outlined" color="inherit" fullWidth onClick={() => handleActionInput('CANCEL')} sx={{ borderColor: '#44475a' }}>
                CANCEL
              </Button>
            </>
          ) : (
            <Button variant="contained" fullWidth onClick={() => handleActionInput('INVENTORY')} sx={{ bgcolor: '#bd93f9', color: '#282a36', fontWeight: 'bold', height: 60, '&:hover': { bgcolor: '#ff79c6' } }}>
              BAG ({player.inventory.length})
            </Button>
          )}
        </Box>
      </Box>

      {/* Action Log */}
      <Paper sx={{ p: 2, bgcolor: '#282a36', border: '1px solid #44475a', maxHeight: '150px', overflowY: 'auto' }}>
        <List dense disablePadding>
          {logs.map((log, idx) => (
            <ListItem key={idx} disablePadding sx={{ alignItems: 'flex-start', mb: 0.5 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '13px', color: '#6272a4', mr: 1, fontWeight: 'bold' }}>
                {'>'}
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '13px', color: getLogColor(log), fontWeight: '500' }}>
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