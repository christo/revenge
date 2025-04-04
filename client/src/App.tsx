import {Box, ThemeProvider} from '@mui/material';
import React, {useState} from "react";

import './App.css';
import "./fonts/Bebas_Neue/BebasNeue-Regular.ttf";
import {FileUploader} from "react-drag-drop-files";

import {FileLike} from "../../server/src/common/FileLike.ts";
import {fileTypes} from "./machine/cbm/cbm.ts";
import {darkTheme} from "./neonColourScheme.ts";
import {QuickLoads} from "./QuickLoads.tsx";
import {CurrentFileSummary} from "./ui/CurrentFileSummary.tsx";
import {MenuAppBar} from "./ui/MenuAppBar.tsx";


/**
 * Maximum allowed size for file uploads.
 * The biggest currently imaginable case a d81 double-sided disk image including error byte block according to the
 * following URL this weighs in at 822400 bytes as per http://unusedino.de/ec64/technical/formats/d81.html
 * This may be increased to handle larger sizes if need arises.
 */
const MAX_SIZE_MB = 1;

function AppLogo() {
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
            {file ? <CurrentFileSummary file={file}/> : <AppLogo/>}
          </Box>
        </Box>
      </ThemeProvider>
  );
}

export default App;
