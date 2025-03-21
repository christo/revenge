import Box from "@mui/material/Box";

import {Detail} from "./Detail.ts";
import {SmolPanel} from "./SmolPanel.tsx";
import Typography from "@mui/material/Typography";
import './InfoPanel.css';

export function InfoPanel({detail}: { detail: Detail }) {
  return <Box className="infopanel">
    <SmolPanel heading="Options">
      <Typography>Options control panel will go here...</Typography>
    </SmolPanel>
    <SmolPanel heading={`${detail.name} Stats`}>
      {detail.stats.map(([key, value], i) =>
          <Box key={`sp_${i}`} className="stat">
            <span className="skey">{key}</span> <span className="sval">{value}</span>
          </Box>
      )}
    </SmolPanel>
  </Box>;
}