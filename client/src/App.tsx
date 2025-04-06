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
 * Maximum allowed size for file uploads, much larger than any currently imaginable practical use case would require.
 */
const MAX_SIZE_MB = 10;

function AppLogo({size}: {size: 1024 | 512 | 192}) {
  const sx = {
    margin: "0 auto",
    display: "block",
    borderRadius: "1em",
  }
  // noinspection HtmlUnknownTarget
  return <img src={`revenge-logo${size}.png`} width={size} height={size} style={sx} alt="revenge logo"/>;
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
            {file ? <CurrentFileSummary file={file}/> : <AppLogo size={512}/>}
          </Box>
        </Box>
      </ThemeProvider>
  );
}

export default App;
