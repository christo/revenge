import {Detail} from "@common/Detail.ts";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React from 'react'


export function ControlPanel({detail}: { detail: Detail }) {

  return <Box>
      <Typography>{detail.detailConfig?.getTitle()} {detail.detailConfig?.getName()}</Typography>
      <Typography>{detail.detailConfig?.getDescription()}</Typography>
    </Box>
}