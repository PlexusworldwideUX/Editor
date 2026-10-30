import { createTheme } from '@mui/material/styles'
import { BREAKPOINT_REM } from './model/types'

/** All spacing in rem, 1 unit = 0.5rem. Breakpoints in rem. */
export const theme = createTheme({
  spacing: (f: number) => `${f * 0.5}rem`,
  breakpoints: {
    unit: 'rem',
    values: { xs: BREAKPOINT_REM.mobile, sm: BREAKPOINT_REM.tablet, md: BREAKPOINT_REM.desktop, lg: 1e4, xl: 1e5 },
  },
})
