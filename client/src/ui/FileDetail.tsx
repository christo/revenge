import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import React, {useEffect, useState} from 'react';
import {TypeActions} from "../api.ts";
import {BlobSniffer, FileBlob, FileLike, HashCalc} from "../common-imports.ts";
import {secondaryBright} from "../neonColourScheme.ts";
import {runSniffers} from "../revenge.ts";
import {BigramPlot} from "./BigramPlot.tsx";
import {DetailRenderer} from "./DetailRenderer.tsx";


function TabPanel({children, value, item}: { children: React.ReactNode, value: number, item: number }) {
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

function EmptyFile({fb}: { fb: FileBlob }) {
  return <Box sx={{flexGrow: 1}}>
    File {fb.name} appears to be empty.
  </Box>;
}

/**
 * Shows hashes for the file.
 * @param fb the file
 */
function HashStack({fb}: { fb: FileBlob }) {
  const fl = new FileLike(fb.name, fb.getBytes());
  const hc = new HashCalc();
  const [sha1, setSha1] = useState<string | null>(null);
  const [md5, setMd5] = useState<string | null>(null);
  const [crc32, setCrc32] = useState<string | null>(null);
  useEffect(() => {
    hc.sha1(fl).then(s => setSha1(s[1]));
    hc.md5(fl).then(s => setMd5(s[1]));
    hc.crc32(fl).then(s => setCrc32(s[1]));
  }, [fb]);
  const hashStyle = {fontFamily: '"Martian Mono", monospace', fontSize: "small", opacity: 0.6};
  const showHash = (label: string, hash: string | null) => {
    return <><Grid size={2}>{label}</Grid>
      <Grid size={10}>
        <Typography sx={hashStyle}>{hash ? hash : "..."}</Typography>
      </Grid>
    </>
  };
  return <Grid container spacing={1} sx={{mt: 2}}>
    {showHash("SHA1", sha1)}
    {showHash("MD5", md5)}
    {showHash("CRC32", crc32)}
  </Grid>;
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
  const t: BlobSniffer = typeActions.t;
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
        <HashStack fb={fb}/>
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