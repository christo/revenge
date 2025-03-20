import Box from "@mui/material/Box";
import {TabPanel} from "../App.tsx";
import {TypeActions} from "../machine/api.ts";
import {FileBlob} from "../machine/FileBlob.ts";
import {sniff} from "../machine/revenge.ts";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {DetailRenderer} from "./DetailRenderer.tsx";
import Chip from "@mui/material/Chip";

function HashChip({tag}: { tag: string }) {
  return <Chip label={tag} size="small" sx={{marginRight: 1}} variant="outlined" color="info"/>
}


/**
 * Main content showing interpreted file contents.
 *
 * @param props
 * @constructor
 */
export function FileDetail({fb}: { fb: FileBlob }) {
  // get actions that can be done on this blob based on scoring from sniff:
  const typeActions: TypeActions = sniff(fb);
  const [action, setAction] = useState(0);
  const t = typeActions.t;
  /*
    dataMeta section summarises how the file content was interpreted
    tabs are like menu items
    tabpanel is content area where selected tab content goes
  */
  return <Box>

    <Box className="dataMeta">
      <Box className="dataDetail">
        <Typography display="inline" sx={{
          mr: 1,
          fontStyle: "italic",
          opacity: 0.6,
        }}>Smells like</Typography>
        <Typography display="inline" sx={{mr: 1}}>{t.name}</Typography>
        <Typography display="inline" sx={{mr: 1}}>{t.desc}</Typography>
        {t.tags.map((tag, i) => {
          return <Chip label={tag} size="small" sx={{marginRight: 1}} variant="outlined" color="info"
                       key={`tag_${i}`}/>;
        })}
      </Box>
    </Box>

    <Tabs value={action} onChange={(_event: React.SyntheticEvent, newValue: number) => setAction(newValue)}>
      {typeActions.actions.map((a, i) => {
        return <Tab label={a.label} key={`tac_${i}`}/>
      })}
    </Tabs>

    {typeActions.actions.map((a, i) => (
        <TabPanel item={i} value={action} key={`tap_${i}`}>
          <DetailRenderer ae={a.f}/>
        </TabPanel>
    ))}
  </Box>;
}