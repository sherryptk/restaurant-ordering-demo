import { useEffect, useState } from 'react'
import { Box, Typography, Card, Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack } from '@mui/material'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminMenuApi } from '../../api'

function SortableCategoryRow({ category }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    boxShadow: isDragging ? '0 4px 14px rgba(0, 0, 0, 0.2)' : 'none',
    scale: isDragging ? 1.02 : 1,
    zIndex: isDragging ? 1 : 'auto',
  }

  return (
    <Card ref={setNodeRef} style={style} variant="outlined" sx={{ mb: 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', height: 48, px: 1.5 }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', touchAction: 'none' }}
        >
          <DragIndicatorIcon fontSize="small" color="action" />
        </Box>
        <Typography sx={{ flex: 1 }}>{category.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('adminMenu.itemCount', { count: category.item_count })}
        </Typography>
      </Stack>
    </Card>
  )
}

function ReorderCategoriesDialog({ open, categories, onClose, onSaved }) {
  const { t } = useTranslation()
  const [items, setItems] = useState(categories)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (open) setItems(categories)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((c) => c.id === active.id)
    const newIndex = items.findIndex((c) => c.id === over.id)
    setItems((prev) => arrayMove(prev, oldIndex, newIndex))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminMenuApi.reorderCategories(items.map((c) => c.id))
      toast.success(t('adminMenu.categoryOrderSaved'))
      onClose()
      onSaved()
    } catch {
      toast.error(t('adminMenu.failedToSaveCategoryOrder'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('adminMenu.reorderCategories')}</DialogTitle>
      <DialogContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <Box sx={{ mt: 1 }}>
              {items.map((category) => (
                <SortableCategoryRow key={category.id} category={category} />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('account.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {t('adminMenu.saveOrder')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReorderCategoriesDialog
