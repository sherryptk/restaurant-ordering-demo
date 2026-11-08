import { memo, useMemo, useRef } from 'react'
import { Typography, Stack, Card, CardContent, TextField, Switch, FormControlLabel, IconButton, Button, Divider, InputAdornment } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useTranslation } from 'react-i18next'

let tempIdSeq = 0
function nextTempId() {
  tempIdSeq -= 1
  return tempIdSeq
}

const EMPTY_OPTION = () => ({
  id: nextTempId(),
  name: '',
  name_ar: '',
  required: false,
  multi_select: false,
  max_selections: null,
  choices: [],
})
const EMPTY_CHOICE = () => ({ id: nextTempId(), label: '', label_ar: '', price_delta: 0, available: true })

// One option group. Memoized so typing in one field re-renders only its own group — with a big tree
// (8 groups x 10 choices) re-rendering all of them per keystroke cost ~140ms.
const OptionCard = memo(function OptionCard({ option, index, showErrors, actions }) {
  const { t } = useTranslation()
  return (
    <Card variant="outlined">
    <CardContent>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DragIndicatorIcon color="disabled" />
        <TextField
          label={t('itemOptions.optionGroupName')}
          error={showErrors && !option.name.trim()}
          slotProps={{ htmlInput: { 'data-invalid': showErrors && !option.name.trim() ? 'true' : undefined } }}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          value={option.name}
          onChange={(e) => actions.updateOption(index, { name: e.target.value })}
        />
        <TextField
          label={t('itemOptions.optionGroupNameArabic')}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          value={option.name_ar || ''}
          onChange={(e) => actions.updateOption(index, { name_ar: e.target.value })}
          slotProps={{ htmlInput: { dir: 'rtl' } }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={option.required}
              onChange={(e) => actions.updateOption(index, { required: e.target.checked })}
            />
          }
          label={t('itemOptions.required')}
          sx={{ whiteSpace: 'nowrap', ml: 0 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={option.multi_select}
              onChange={(e) => actions.updateOption(index, { multi_select: e.target.checked })}
            />
          }
          label={t('itemOptions.multiSelect')}
          sx={{ whiteSpace: 'nowrap', ml: 0 }}
        />
        {option.multi_select && (
          <TextField
            label={t('itemOptions.maxSelections')}
            size="small"
            type="number"
            placeholder={t('itemOptions.unlimited')}
            sx={{ width: 150 }}
            slotProps={{ htmlInput: { min: 1 } }}
            value={option.max_selections ?? ''}
            onChange={(e) =>
              actions.updateOption(index, {
                max_selections: e.target.value === '' ? null : parseInt(e.target.value, 10),
              })
            }
          />
        )}
        <IconButton color="error" onClick={() => actions.removeOption(index)} title={t('itemOptions.deleteOptionGroup')}>
          <DeleteIcon />
        </IconButton>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1.5}>
        {option.choices.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('itemOptions.noChoicesYet')}
          </Typography>
        )}
        {option.choices.map((choice, choiceIndex) => (
          <Stack key={choice.id} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label={t('itemOptions.choiceLabel')}
              error={showErrors && !choice.label.trim()}
              slotProps={{ htmlInput: { 'data-invalid': showErrors && !choice.label.trim() ? 'true' : undefined } }}
              size="small"
              sx={{ flex: 1, minWidth: 180 }}
              value={choice.label}
              onChange={(e) => actions.updateChoice(index, choiceIndex, { label: e.target.value })}
            />
            <TextField
              label={t('itemOptions.choiceLabelArabic')}
              size="small"
              sx={{ flex: 1, minWidth: 180 }}
              value={choice.label_ar || ''}
              onChange={(e) => actions.updateChoice(index, choiceIndex, { label_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              label={t('adminMenu.price')}
              size="small"
              type="number"
              sx={{ width: 150 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">EGP</InputAdornment> } }}
              value={choice.price_delta}
              onChange={(e) => actions.updateChoice(index, choiceIndex, { price_delta: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={choice.available}
                  onChange={(e) => actions.updateChoice(index, choiceIndex, { available: e.target.checked })}
                />
              }
              label={t('adminMenu.available')}
              sx={{ whiteSpace: 'nowrap', ml: 0 }}
            />
            <IconButton
              size="small"
              color="error"
              onClick={() => actions.removeChoice(index, choiceIndex)}
              title={t('itemOptions.deleteChoice')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button size="small" sx={{ mt: 2 }} onClick={() => actions.addChoice(index)}>
        {t('itemOptions.addChoice')}
      </Button>
    </CardContent>
  </Card>
  )
})

// Controlled editor for an item's option groups and choices.
function OptionsFields({ options, onChange, showErrors = false }) {
  const { t } = useTranslation()

  // `actions` must keep the same identity across renders or the memoized groups re-render anyway,
  // so the handlers read the latest options/onChange from refs.
  const optionsRef = useRef(options)
  const onChangeRef = useRef(onChange)
  optionsRef.current = options
  onChangeRef.current = onChange

  const actions = useMemo(() => {
    const apply = (fn) => onChangeRef.current(fn(optionsRef.current))
    return {
      updateOption: (index, patch) => apply((opts) => opts.map((opt, i) => (i === index ? { ...opt, ...patch } : opt))),
      removeOption: (index) => apply((opts) => opts.filter((_, i) => i !== index)),
      updateChoice: (optIndex, choiceIndex, patch) =>
        apply((opts) =>
          opts.map((opt, i) =>
            i === optIndex
              ? { ...opt, choices: opt.choices.map((c, j) => (j === choiceIndex ? { ...c, ...patch } : c)) }
              : opt
          )
        ),
      removeChoice: (optIndex, choiceIndex) =>
        apply((opts) =>
          opts.map((opt, i) =>
            i === optIndex ? { ...opt, choices: opt.choices.filter((_, j) => j !== choiceIndex) } : opt
          )
        ),
      addChoice: (optIndex) =>
        apply((opts) => opts.map((opt, i) => (i === optIndex ? { ...opt, choices: [...opt.choices, EMPTY_CHOICE()] } : opt))),
    }
  }, [])
  const addOption = () => onChange([...options, EMPTY_OPTION()])

  return (
    <>
      <Stack spacing={2}>
        {options.map((option, optIndex) => (
          <OptionCard key={option.id} option={option} index={optIndex} showErrors={showErrors} actions={actions} />
        ))}
      </Stack>

      <Button variant="outlined" sx={{ mt: 2 }} onClick={addOption}>
        {t('itemOptions.addOptionGroup')}
      </Button>
    </>
  )
}

export default OptionsFields
