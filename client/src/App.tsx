import {Button, CircularProgress, Stack, Typography} from "@mui/material";
import Box from '@mui/material/Box';
import {ThemeProvider} from '@mui/material/styles';
import axios from "axios";
import React, {useEffect, useState} from "react";

import './App.css';
import "./fonts/Bebas_Neue/BebasNeue-Regular.ttf";
import {FileUploader} from "react-drag-drop-files";
import {fileTypes} from "./machine/cbm/cbm.ts";

import {FileLike} from "../../server/src/common/FileLike.ts";
import {background, darkTheme, infoBright, primaryBright} from "./neonColourScheme.ts";
import {QuickLoad} from "../../server/src/common/QuickLoad.ts";
import {ServerError} from "../../server/src/common/ServerError.ts";
import {CurrentFileSummary} from "./ui/CurrentFileSummary.tsx";
import {MenuAppBar} from "./ui/MenuAppBar.tsx";


/**
 * Maximum allowed size for file uploads.
 * The biggest currently imaginable case a d81 double-sided disk image including error byte block according to the
 * following URL this weighs in at 822400 bytes as per http://unusedino.de/ec64/technical/formats/d81.html
 * This may be increased to handle larger sizes if need arises.
 */
const MAX_SIZE_MB = 1;

/**
 * Temporary typographic logo.
 * @param background
 * @param foreground
 * @param text
 */
function systemLogo(background: string, foreground: string, text: string) {
  return <Typography sx={{
    font: "Martian Mono",
    fontWeight: "bold",
    fontSize: "0.6rem",
    color: foreground,
    backgroundColor: background,
    // border: `solid thin ${primaryBright}`,
    borderRadius: "5px",
    p: "0 4px",
    ml: 0.5,
    opacity: 0.7
  }}>{text}</Typography>;
}

const EMPTY_QUICKLOADS = {VIC20: [], C64: []};

/**
 * Try to load the QuickLoad binaries from the server for one click loading.
 */
function QuickLoads(props: { setFile: (f: FileLike) => void }) {
  const [items, setItems] = useState<QuickLoad>(EMPTY_QUICKLOADS);
  const [error, setError] = useState<ServerError>();
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    axios.get("/api/quickloads", {})
        .then(r => {
          setIsLoaded(true);
          setItems(r.data);
        })
        .catch((err: any) => {
          setIsLoaded(true);
          setError(err);
        }).finally(() => {
      return;
    });

  }, []);
  const handleFile = async (item: FileLike) => {
    props.setFile(item);
  };

  if (error) {
    // no server, no quickloads, no big deal
    console.log(`error getting a response from the server: ${error}`);
    return null;
  } else if (!isLoaded) {
    return <Box sx={{w: "100%"}}><CircularProgress color="secondary" /></Box>;
  } else {
    return <Box sx={{w: "100%", p: 1}}>
      <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="center" >
        <Typography>Quickload:</Typography>
        <Stack
            direction="row"
            gap="0.5rem 1rem"
            flexWrap="wrap"
            display="flex"
            justifyContent="flex-start"
            alignContent="flex-start">
          {items.VIC20.map((item, i) => {
            return <Button onClick={() => handleFile(item)} size="small" variant="outlined" color="primary"
                           key={`qlvic_${i}`}>{item.name}&nbsp;{systemLogo(primaryBright, background, "VIC")}</Button>
          })}
          {items.C64.map((item, i) => {
            return <Button onClick={() => handleFile(item)} size="small" variant="outlined" color="info"
                           key={`qlc64_${i}`}>{item.name}&nbsp;{systemLogo(infoBright, background, "64")}</Button>
          })}
        </Stack>
      </Stack>
    </Box>;
  }
}

function Logo() {
  const sx = {
    margin: "0 auto",
    display: "block",
    borderRadius: "1em",
  }
  // noinspection HtmlUnknownTarget
  return <img src="revenge-logo512.png" width={512} height={512} style={sx} alt="revenge logo"/>;
}

function App() {
  const [file, setFile] = useState<File | FileLike | null>(null);
  return (
      <ThemeProvider theme={darkTheme}>
        <Box sx={{m: 0}}>
          <MenuAppBar/>
          <Box sx={{m: 1, w: '100%'}}>
            <Box sx={{
              display: "flex",
              justifyContent: "right",
              alignItems: "center",
            }}>
              <QuickLoads setFile={(f) => setFile(f)}/>
              <Box className="dropZone">
                <FileUploader handleChange={setFile} name="file" types={fileTypes} maxSize={MAX_SIZE_MB}/>
              </Box>
            </Box>
            {file ? <CurrentFileSummary file={file}/> : <Logo/>}
          </Box>
        </Box>
      </ThemeProvider>
  );
}

export default App;
