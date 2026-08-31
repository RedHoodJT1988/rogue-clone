import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, Card, CardContent, CardActions, Chip, Divider,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store';
import { useItem, equipItem, unequipItem, dropItem, startTargeting } from '../store/gameSlice';
import type { Item } from '../types/game';

interface InventoryModalProps {
  open: boolean;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const player = useAppSelector((state) => state.game.player);

  const handleAction = (item: Item) => {
    if (item.type === 'POTION') {
      dispatch(useItem(item.id));
    } else if (item.type === 'WEAPON' || item.type === 'ARMOR') {
      dispatch(equipItem(item.id));
    } else if (item.type === 'SCROLL') {
      onClose();
      dispatch(startTargeting(item.id));
    }
  };

  const getActionLabel = (type: Item['type']) => {
    switch (type) {
      case 'POTION': return 'Drink';
      case 'SCROLL': return 'Read';
      default: return 'Equip';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: { sx: { bgcolor: '#161b22', color: '#c9d1d9', border: '1px solid #30363d', fontFamily: 'monospace' } }
      }}
    >
      <DialogTitle sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#58a6ff' }}>
        EQUIPMENT & INVENTORY ({player.inventory.length}/12)
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#30363d' }}>
        <Typography variant="subtitle1" sx={{ color: '#8b949e', mb: 1, fontFamily: 'monospace' }}>
          EQUIPPED GEAR
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card sx={{ flex: 1, bgcolor: '#0d1117', border: '1px solid #30363d' }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="caption" sx={{ color: '#8b949e', fontFamily: 'monospace' }}>MAIN HAND WEAPON</Typography>
              <Typography variant="h6" sx={{ color: player.equipment.weapon ? '#70a1ff' : '#484f58', fontFamily: 'monospace' }}>
                {player.equipment.weapon ? player.equipment.weapon.name : 'Empty'}
              </Typography>
              {player.equipment.weapon && (
                <Typography variant="body2" sx={{ color: '#3fb950', fontFamily: 'monospace' }}>+{player.equipment.weapon.value} Attack Power</Typography>
              )}
            </CardContent>
            {player.equipment.weapon && (
              <CardActions>
                <Button size="small" color="warning" onClick={() => dispatch(unequipItem('weapon'))}>Unequip</Button>
              </CardActions>
            )}
          </Card>

          <Card sx={{ flex: 1, bgcolor: '#0d1117', border: '1px solid #30363d' }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="caption" sx={{ color: '#8b949e', fontFamily: 'monospace' }}>BODY ARMOR</Typography>
              <Typography variant="h6" sx={{ color: player.equipment.armor ? '#eccc68' : '#484f58', fontFamily: 'monospace' }}>
                {player.equipment.armor ? player.equipment.armor.name : 'Empty'}
              </Typography>
              {player.equipment.armor && (
                <Typography variant="body2" sx={{ color: '#3fb950', fontFamily: 'monospace' }}>+{player.equipment.armor.value} Defense Rating</Typography>
              )}
            </CardContent>
            {player.equipment.armor && (
              <CardActions>
                <Button size="small" color="warning" onClick={() => dispatch(unequipItem('armor'))}>Unequip</Button>
              </CardActions>
            )}
          </Card>
        </Box>

        <Divider sx={{ my: 2, borderColor: '#30363d' }} />
        <Typography variant="subtitle1" sx={{ color: '#8b949e', mb: 1, fontFamily: 'monospace' }}>BACKPACK</Typography>

        {player.inventory.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#6e7681', fontStyle: 'italic', fontFamily: 'monospace', py: 2 }}>Backpack is empty.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {player.inventory.map((item) => (
              <Box key={item.id}>
                <Card sx={{ bgcolor: '#0d1117', border: '1px solid #30363d' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ color: item.color, fontWeight: 'bold', fontFamily: 'monospace' }}>{item.name}</Typography>
                      <Chip label={item.type} size="small" sx={{ bgcolor: '#21262d', color: '#c9d1d9', fontSize: '10px' }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#8b949e', mt: 0.5, fontSize: '12px', fontFamily: 'monospace' }}>{item.description}</Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                    <Button size="small" color="error" onClick={() => dispatch(dropItem(item.id))}>Drop</Button>
                    <Button size="small" variant="outlined" color="primary" onClick={() => handleAction(item)}>
                      {getActionLabel(item.type)}
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="inherit" sx={{ bgcolor: '#21262d', color: '#fff' }}>Close (Esc / I)</Button>
      </DialogActions>
    </Dialog>
  );
};