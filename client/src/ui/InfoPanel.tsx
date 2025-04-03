import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import {Detail} from "./Detail.ts";

const STYLE = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  w: "100%",
  mb: 2,
  gap: 4
};

const SUBDUED = {opacity: 0.7, mr: 1};

const PRONOUNCED = {color: "#e3e0bd", fontWeight: "bold"};

export function InfoPanel({detail}: { detail: Detail }) {
  return <Box sx={STYLE}>
    <Box>
      {detail.stats.map(([key, value], i) =>
          <Box key={`sp_${i}`} className="stat">
            <Typography display="inline" sx={SUBDUED}>{key}</Typography>
            <Typography display="inline" sx={PRONOUNCED}>{value}</Typography>
          </Box>
      )}
    </Box>
    <Box>
      <Typography sx={SUBDUED}>Control panel will go here...</Typography>
    </Box>
  </Box>;
}