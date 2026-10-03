'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, DeleteOutline, Remove } from '@mui/icons-material'
import { differenceInHours } from 'date-fns'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { relative, shortDate } from '@/lib/format'
import { useResource } from '@/lib/hooks'
import { BLOOD_GROUPS, COMPONENT_LABEL, Component, Inventory } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { EmptyState, LoadingRows, Panel } from '../ui'

const COMPONENTS: Component[] = ['rbc', 'platelets', 'plasma', 'whole_blood']

export default function InventoryPanel({ onChanged }: { onChanged?: () => void }) {
  const inv = useResource(api.inventory.get)
  const [dialog, setDialog] = useState<'add' | 'use' | null>(null)

  const update = (data: Inventory) => {
    inv.setData(data)
    onChanged?.()
  }

  const discard = async (id: string) => {
    try {
      update(await api.inventory.discard(id))
      toast('Lot discarded and logged as wastage')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const data = inv.data
  const used = COMPONENTS.filter((c) => data?.totals.some((x) => x.component === c))
  const cell = (g: string, c: string) => data?.totals.find((x) => x.bloodGroup === g && x.component === c)

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="outlined" startIcon={<Remove />} onClick={() => setDialog('use')}>
          Record usage
        </Button>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog('add')}>
          Add stock
        </Button>
      </Stack>

      {inv.loading ? (
        <LoadingRows rows={2} height={140} />
      ) : !data?.lots.length ? (
        <EmptyState
          title={
            <>
              Your shelf is <em>empty</em>
            </>
          }
          body="Add the units you hold and record what you use each day. A couple of weeks of usage is enough for shortage forecasts to start working."
        />
      ) : (
        <>
          <Panel sx={{ p: 0, overflowX: 'auto' }} data-lenis-prevent>
            <Table size="small" sx={{ minWidth: 640, '& td, & th': { borderColor: t.line } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: t.inkMuted, fontWeight: 600, pl: 3 }}>Units on hand</TableCell>
                  {BLOOD_GROUPS.map((g) => (
                    <TableCell key={g} align="center" sx={{ fontWeight: 700 }}>
                      {g}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {used.map((c) => (
                  <TableRow key={c}>
                    <TableCell sx={{ fontWeight: 600, pl: 3 }}>{COMPONENT_LABEL[c]}</TableCell>
                    {BLOOD_GROUPS.map((g) => {
                      const x = cell(g, c)
                      const soon = x && differenceInHours(new Date(x.earliestExpiry), new Date()) < 48
                      return (
                        <TableCell key={g} align="center" className="tabular" sx={{ color: x ? t.ink : t.inkSubtle, fontWeight: x ? 600 : 400 }}>
                          {x ? (
                            <Tooltip title={`Earliest expiry ${relative(x.earliestExpiry)}`}>
                              <span style={{ borderBottom: soon ? `2px solid ${t.red}` : 'none' }}>{x.units}</span>
                            </Tooltip>
                          ) : (
                            '0'
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant="caption" display="block" px={3} py={1.25}>
              Underlined = some units expire within 48 hours.
            </Typography>
          </Panel>

          <Box>
            <Typography variant="overline" color="text.secondary" display="block" mb={1}>
              Lots · first to expire first
            </Typography>
            <Panel sx={{ p: 0 }}>
              {data.lots.map((l, i) => {
                const hours = differenceInHours(new Date(l.expiresAt), new Date())
                return (
                  <Stack
                    key={l._id}
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ px: 3, py: 1.25, borderTop: i ? `1px solid ${t.line}` : 'none' }}
                  >
                    <Typography fontWeight={700} width={40}>
                      {l.bloodGroup}
                    </Typography>
                    <Typography variant="body2" flex={1}>
                      {l.units} × {COMPONENT_LABEL[l.component]}
                      <Typography component="span" variant="caption" ml={1}>
                        {l.source}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color={hours < 48 ? t.red : 'text.secondary'} fontWeight={hours < 48 ? 600 : 400} className="tabular">
                      {hours < 72 ? `expires ${relative(l.expiresAt)}` : shortDate(l.expiresAt)}
                    </Typography>
                    <Tooltip title="Discard (logs as wastage)">
                      <IconButton size="small" onClick={() => discard(l._id)} aria-label="Discard lot">
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )
              })}
            </Panel>
          </Box>
        </>
      )}

      <StockDialog mode={dialog} onClose={() => setDialog(null)} onDone={update} />
    </Stack>
  )
}

function StockDialog({ mode, onClose, onDone }: { mode: 'add' | 'use' | null; onClose: () => void; onDone: (i: Inventory) => void }) {
  const [group, setGroup] = useState('O+')
  const [component, setComponent] = useState<Component>('rbc')
  const [units, setUnits] = useState(1)
  const [expires, setExpires] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      const body = { bloodGroup: group, component, units }
      const res =
        mode === 'add'
          ? await api.inventory.addLot({ ...body, ...(expires ? { expiresAt: new Date(expires).toISOString() } : {}) })
          : await api.inventory.usage(body)
      onDone(res)
      toast.success(mode === 'add' ? 'Stock added' : 'Usage recorded')
      onClose()
      setExpires('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!mode} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{mode === 'add' ? 'Add stock' : 'Record units used'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mt={0}>
          <Grid item xs={6}>
            <TextField select fullWidth label="Blood group" value={group} onChange={(e) => setGroup(e.target.value)}>
              {BLOOD_GROUPS.map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth type="number" label="Units" value={units} onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))} inputProps={{ min: 1 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label="Component" value={component} onChange={(e) => setComponent(e.target.value as Component)}>
              {COMPONENTS.map((c) => (
                <MenuItem key={c} value={c}>
                  {COMPONENT_LABEL[c]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {mode === 'add' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Expiry date"
                InputLabelProps={{ shrink: true }}
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                helperText="Leave blank to use the standard shelf life from today"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {mode === 'add' ? 'Add' : 'Record'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
