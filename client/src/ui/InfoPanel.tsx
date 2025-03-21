import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import {Detail} from "./Detail.ts";
import {SmolPanel} from "./SmolPanel.tsx";
import './InfoPanel.css';

export function InfoPanel({detail}: { detail: Detail }) {
  return <Box className="infopanel">
    <SmolPanel heading="Options">
      <Typography>Options control panel will go here...</Typography>
    </SmolPanel>
    <SmolPanel heading={detail.name}>
      {detail.stats.map(([key, value], i) =>
          <Box key={`sp_${i}`} className="stat">
            <Typography display="inline" sx={{opacity: 0.7}}>{key}</Typography>
            <Typography display="inline" sx={{color: "#9bd2cd"}}>{value}</Typography>
          </Box>
      )}
    </SmolPanel>
  </Box>;
}