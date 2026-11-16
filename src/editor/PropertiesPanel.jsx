import { Alert, Box, Button, Chip, Divider, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Link as RouterLink } from 'react-router-dom';
import { CATEGORIES, NODE_KINDS } from './nodeCatalog.js';
import WebhookAddress from './WebhookAddress.jsx';
import { MAX_SWITCH_CASES, NODE_FIELDS, fieldError, paramsOf, visibleFields } from '../../shared/nodeFields.js';

export const NAME_MAX = 40;

// 숫자칸: 숫자로 읽히면 숫자로, 아니면 글자 그대로 둬서 오류 문구가 보이게 한다
function toNumberOrText(v) {
  if (v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

// Switch 갈래 편집: 이름(선에 표시)과 일치 값
function CasesEditor({ cases, onChange, onBlur, error, readOnly }) {
  function patch(i, change) {
    onChange(cases.map((c, j) => (j === i ? { ...c, ...change } : c)));
  }
  function add() {
    const used = cases.map((c) => Number(c.id.replace('case_', ''))).filter(Number.isFinite);
    const n = Math.max(0, ...used) + 1;
    onChange([...cases, { id: `case_${n}`, label: String(cases.length + 1), match: '' }]);
  }
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        갈래 ({cases.length}개 + 기본)
      </Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {cases.map((c, i) => (
          <Box key={c.id} sx={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              label="이름"
              value={c.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              onBlur={onBlur}
              disabled={readOnly}
              inputProps={{ maxLength: 12 }}
              error={!String(c.label).trim()}
            />
            <TextField
              size="small"
              label="일치 값"
              value={c.match}
              onChange={(e) => patch(i, { match: e.target.value })}
              onBlur={onBlur}
              disabled={readOnly}
            />
            <IconButton
              aria-label={`갈래 ${c.label} 삭제`}
              onClick={() => onChange(cases.filter((_, j) => j !== i))}
              disabled={readOnly || cases.length <= 1}
            >
              <RemoveCircleOutlineIcon />
            </IconButton>
          </Box>
        ))}
      </Box>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      <Button size="small" startIcon={<AddIcon />} onClick={add} disabled={readOnly || cases.length >= MAX_SWITCH_CASES} sx={{ mt: 1 }}>
        갈래 추가
      </Button>
      <Typography variant="caption" color="text.secondary" component="div">
        갈래를 지우면 그 갈래에 이어진 선도 함께 지워집니다.
      </Typography>
    </Box>
  );
}

// 인증정보 고르기 (9단계). 비밀값은 여기에 없고 이름만 고른다.
function CredentialSelect({ field, value, common, credentials, onChange }) {
  const options = (credentials || []).filter((c) => c.type === field.credType);
  const missing = value && !options.some((c) => c.id === value);
  return (
    <TextField
      select
      {...common}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      helperText={
        common.error ? (
          <>
            {common.helperText}
            {options.length === 0 && (
              <>
                {' · '}먼저 <RouterLink to="/credentials">인증정보 메뉴</RouterLink>에서 등록하세요.
              </>
            )}
          </>
        ) : options.length === 0 ? (
          <>
            등록된 인증정보가 없습니다. <RouterLink to="/credentials">인증정보 메뉴</RouterLink>에서 먼저 등록하세요.
          </>
        ) : missing ? (
          '고른 인증정보를 찾을 수 없습니다(삭제됐거나 다른 그룹 것). 다시 고르세요.'
        ) : (
          ' '
        )
      }
      error={common.error || !!missing}
    >
      {!field.required && <MenuItem value="">(사용 안 함)</MenuItem>}
      {missing && (
        <MenuItem value={value} disabled>
          (찾을 수 없음)
        </MenuItem>
      )}
      {options.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name} {c.hint}
        </MenuItem>
      ))}
    </TextField>
  );
}

function FieldInput({ field, value, params, onChange, onBlur, readOnly, credentials }) {
  const error = fieldError(field, value, params);

  if (field.type === 'cases') {
    return <CasesEditor cases={value} onChange={onChange} onBlur={onBlur} error={error} readOnly={readOnly} />;
  }

  const common = {
    label: field.label,
    size: 'small',
    fullWidth: true,
    required: field.required,
    placeholder: field.placeholder,
    error: !!error,
    helperText: error || ' ',
    onBlur,
    disabled: readOnly,
  };

  if (field.type === 'credential') {
    return <CredentialSelect field={field} value={value} common={common} credentials={credentials} onChange={onChange} />;
  }
  if (field.type === 'select') {
    return (
      <TextField select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  if (field.type === 'number') {
    return (
      <TextField
        {...common}
        type="number"
        value={value}
        onChange={(e) => onChange(toNumberOrText(e.target.value))}
        inputProps={{ min: field.min, max: field.max, inputMode: 'numeric' }}
      />
    );
  }
  if (field.type === 'time') {
    return <TextField {...common} type="time" value={value} onChange={(e) => onChange(e.target.value)} InputLabelProps={{ shrink: true }} />;
  }
  if (field.type === 'textarea' || field.type === 'json') {
    return (
      <TextField
        {...common}
        multiline
        minRows={field.type === 'json' ? 3 : 2}
        maxRows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputProps={{ sx: { fontFamily: field.type === 'json' ? 'monospace' : undefined, fontSize: 13 } }}
      />
    );
  }
  return <TextField {...common} value={value} onChange={(e) => onChange(e.target.value)} />;
}

// 오른쪽(휴대폰에서는 아래쪽) 속성 패널. 설계 3.2: Node Name, Parameters, Input, Output, Test Node.
// onEdit(field, change): 값이 바뀔 때. onEndEdit(): 입력칸에서 빠져나갈 때(실행 취소 묶음 끊기).
// readOnly: 보기 전용(Viewer). 값은 보이지만 바꿀 수 없다.
export default function PropertiesPanel({ node, onEdit, onEndEdit, onDelete, onClose, readOnly = false, credentials, automation }) {
  if (!node) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Properties
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {readOnly ? '노드를 하나 누르면 설정을 볼 수 있습니다.' : '노드를 하나 누르면 이름과 설정을 바꿀 수 있습니다.'}
        </Typography>
      </Box>
    );
  }

  const def = NODE_KINDS[node.data.kind];
  const category = CATEGORIES[def.category];
  const params = paramsOf(node);
  const fields = visibleFields(node.data.kind, params);
  const nameError = !node.data.label.trim() ? '이름을 넣어 주세요' : '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pt: 1.5, pb: 1 }}>
        <Chip size="small" label={category.label} sx={{ bgcolor: category.color, color: '#fff', fontWeight: 700 }} />
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, flexGrow: 1 }}>
          {def.label}
        </Typography>
        {onClose && (
          <IconButton aria-label="속성 닫기" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ overflowY: 'auto', flexGrow: 1, px: 2, pb: 2 }}>
        <TextField
          label="노드 이름"
          size="small"
          fullWidth
          required
          value={node.data.label}
          onChange={(e) => onEdit('label', { label: e.target.value })}
          onBlur={onEndEdit}
          disabled={readOnly}
          inputProps={{ maxLength: NAME_MAX }}
          error={!!nameError}
          helperText={nameError || ' '}
          sx={{ mt: 1 }}
        />

        <Alert severity="info" sx={{ mb: 2, py: 0, fontSize: 13 }}>
          {NODE_FIELDS[node.data.kind].help}
        </Alert>

        {fields.length > 0 && (
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            Parameters
          </Typography>
        )}
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          {fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={params[f.key]}
              params={params}
              onChange={(v) => onEdit(f.key, { params: { ...params, [f.key]: v } })}
              onBlur={onEndEdit}
              readOnly={readOnly}
              credentials={credentials}
            />
          ))}
        </Box>

        {node.data.kind === 'webhook' && automation && !readOnly && (
          <>
            <Divider sx={{ my: 2 }} />
            <WebhookAddress workflowId={automation.workflowId} nodeId={node.id} method={params.method} active={automation.active} />
          </>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Input · Output · Test Node
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          들어온 값·나간 값 보기와 이 노드만 시험 실행하기는 실행 엔진(8단계) 이후에 생깁니다.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
            노드 ID: {node.id}
          </Typography>
          {!readOnly && (
            <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={onDelete}>
              노드 삭제
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
