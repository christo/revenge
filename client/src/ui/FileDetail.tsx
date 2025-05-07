import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import React, {useState} from 'react';
import {TypeActions} from "../machine/api.ts";
import {FileBlob} from "../../../server/src/common/machine/FileBlob.ts";
import {runSniffers} from "../machine/revenge.ts";
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

function HashTag({label}: { label: string }) {
  return <Chip label={label} size="small" sx={{marginRight: 1}} variant="outlined" color="secondary"/>;
}

function EmptyFile({fb}: {fb: FileBlob}) {
  return <Box sx={{flexGrow: 1}}>
    File {fb.name} appears to be empty.
  </Box>;
}

/**
 * Main content showing interpreted file contents.
 *
 * @param props
 * @constructor
 */
export function FileDetail({fb}: { fb: FileBlob }) {

  if (fb.getLength() === 0) {
    return <EmptyFile fb={fb}/>
  }
  // get actions that can be done on this blob based on scoring from sniff:
  const typeActions: TypeActions = runSniffers(fb);
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
        maxWidth: "60em",
      }}>
        <Typography display="inline" sx={{
          mr: 1,
          fontStyle: "italic",
          opacity: 0.6,
        }}>Smells like</Typography>
        <Typography display="inline" color="secondary" sx={{mr: 1}}>{t.name}</Typography>
        <Typography display="inline" sx={{mr: 1, fontStyle: "italic"}}>{t.desc}</Typography>
        {t.hashTags.map((tag, i) => <HashTag key={`tag_${i}`} label={tag}/>)}
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