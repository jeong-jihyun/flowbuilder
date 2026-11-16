import { useState } from 'react';
import { Box, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { CATEGORIES, NODE_KINDS } from './nodeCatalog.js';

export const DRAG_TYPE = 'application/flowbuilder-node';

// 노드 목록(설계 3.3: 노드 검색 및 추가).
// 누르면 화면 가운데에 추가되고, PC에서는 캔버스로 끌어다 놓을 수도 있다.
export default function NodePalette({ onPick }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const kinds = Object.entries(NODE_KINDS).filter(
    ([, def]) => !q || def.label.toLowerCase().includes(q) || def.help.includes(q)
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ p: 1.5, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="노드 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <List dense sx={{ overflowY: 'auto', flexGrow: 1, pt: 0 }}>
        {Object.entries(CATEGORIES).map(([category, cat]) => {
          const items = kinds.filter(([, def]) => def.category === category);
          if (items.length === 0) return null;
          return (
            <li key={category}>
              <ul style={{ padding: 0 }}>
                <ListSubheader sx={{ lineHeight: '32px', color: cat.color, fontWeight: 700 }}>{cat.label}</ListSubheader>
                {items.map(([kind, def]) => {
                  const Icon = def.icon;
                  return (
                    <ListItemButton
                      key={kind}
                      onClick={() => onPick(kind)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_TYPE, kind);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      sx={{ mx: 1, borderRadius: 1, minHeight: 44 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: cat.color }}>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={def.label} secondary={def.help} />
                    </ListItemButton>
                  );
                })}
              </ul>
            </li>
          );
        })}
        {kinds.length === 0 && (
          <ListItemText sx={{ px: 2, color: 'text.secondary' }} primary="찾는 노드가 없습니다." />
        )}
      </List>
    </Box>
  );
}
