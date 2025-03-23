import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import {Detail} from "./Detail.ts";
import {SmolPanel} from "./SmolPanel.tsx";

const STYLE = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  w: "100%",
  mb: 2,
};

export function InfoPanel({detail}: { detail: Detail }) {
  return <Box sx={STYLE}>
    <SmolPanel heading="Options">
      <Typography>Control panel will go here...</Typography>
    </SmolPanel>
    <SmolPanel heading={detail.name}>
      {detail.stats.map(([key, value], i) =>
          <Box key={`sp_${i}`} className="stat">
            <Typography display="inline" sx={{opacity: 0.7, mr: 1}}>{key}</Typography>
            <Typography display="inline" sx={{color: "#e3e0bd", fontWeight: "bold"}}>{value}</Typography>
          </Box>
      )}
    </SmolPanel>
  </Box>;
}