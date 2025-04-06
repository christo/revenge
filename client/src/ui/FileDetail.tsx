import React from 'react';
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {useState} from "react";
import {TypeActions} from "../machine/api.ts";
import {FileBlob} from "../machine/FileBlob.ts";
import {sniff} from "../machine/revenge.ts";
import {secondaryBright} from "../neonColourScheme.ts";
import {BigramPlot} from "./BigramPlot.tsx";
import {DetailRenderer} from "./DetailRenderer.tsx";


function TabPanel(props: { children: React.ReactNode, value: number, item: number }) {
  const {children, value, item} = props;

  return (
      <div role="tabpanel" hidden={value !== item} id={`simple-tabpanel-${item}`}>
        {value === item && (<Box sx={{pt: 3}}>{children}</Box>)}
      </div>
  );
}

function BigramBox(props: { fb: FileBlob }) {
  return <Box sx={{display: "flex", justifyContent: "space-between", flexGap: 5}}>
    <Box sx={{mr: 2, ml: 5}}>
      <Typography variant="h4" color={secondaryBright}>
        Bigram
      </Typography>
      <Typography sx={{fontStyle: "italic", opacity: 0.6}}>
        (Byte<sub>n</sub>,&nbsp;Byte<sub>n+1</sub>)
      </Typography>
    </Box>
    <BigramPlot fb={props.fb}/>
  </Box>;
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

    <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
      <Box sx={{
        mr: 1,
        mb: 2,
      }}>
        <Typography display="inline" sx={{
          mr: 1,
          fontStyle: "italic",
          opacity: 0.6,
        }}>Smells like</Typography>
        <Typography display="inline" sx={{mr: 1}}>{t.name}</Typography>
        <Typography display="inline" sx={{mr: 1}}>{t.desc}</Typography>
        {t.tags.map((tag, i) => {
          return <Chip label={tag} size="small" sx={{marginRight: 1}} variant="outlined" color="secondary"
                       key={`tag_${i}`}/>;
        })}
      </Box>
      <BigramBox fb={fb}/>
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