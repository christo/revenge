import { Box, Typography } from "@mui/material";
import { ReactNode } from "react";


export function SmolPanel({heading, children}: { heading: string, children: ReactNode }) {
  return <Box className="smolpanel">
    <Typography variant="h6">{heading}</Typography>
    {children}
  </Box>;
}