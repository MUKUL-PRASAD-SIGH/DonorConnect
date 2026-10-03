'use client'

import { Box, Button, Stack, Typography } from '@mui/material'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import RequireRole from '@/components/RequireRole'
import { LoadingRows, Panel, Pill } from '@/components/ui'
import { api } from '@/lib/api'
import { useResource } from '@/lib/hooks'
import { tokens as t } from '@/theme/tokens'

function AdminPage() {
  const list = useResource(api.hospitals.review)

  const set = async (id: string, verified: boolean) => {
    try {
      await api.hospitals.setVerified(id, verified)
      list.refresh()
      toast.success(verified ? 'Hospital verified' : 'Verification removed')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Box pt={{ xs: 4, md: 6 }}>
      <Typography variant="h2" component="h1" mb={1}>
        Hospital <em>verification</em>
      </Typography>
      <Typography color="text.secondary" mb={4} maxWidth={620}>
        Verified hospitals get a badge on every public request link, which is how donors tell real requests from scams. Check the license
        with the state blood transfusion council before verifying.
      </Typography>
      {list.loading ? (
        <LoadingRows rows={3} height={80} />
      ) : (
        <Panel sx={{ p: 0 }}>
          {(list.data || []).map((h, i) => (
            <Stack
              key={h.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
              sx={{ px: 3, py: 2, borderTop: i ? `1px solid ${t.line}` : 'none' }}
            >
              <Box flex={1}>
                <Typography fontWeight={600}>{h.hospitalName}</Typography>
                <Typography variant="caption">
                  License {h.licenseNumber} · {h.contact?.email} · {h.contact?.phone}
                </Typography>
              </Box>
              <Pill tone={h.isVerified ? 'green' : 'amber'}>{h.isVerified ? 'Verified' : 'Pending'}</Pill>
              <Button size="small" variant={h.isVerified ? 'outlined' : 'contained'} onClick={() => set(h.id, !h.isVerified)}>
                {h.isVerified ? 'Revoke' : 'Verify'}
              </Button>
            </Stack>
          ))}
        </Panel>
      )}
    </Box>
  )
}

export default function Page() {
  return (
    <AppShell>
      <RequireRole role="admin">
        <AdminPage />
      </RequireRole>
    </AppShell>
  )
}
