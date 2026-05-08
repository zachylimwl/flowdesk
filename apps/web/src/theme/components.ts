export const components = {
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
  },
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        border: '1px solid',
        borderColor: '#E2E8F0',
      },
    },
  },
}