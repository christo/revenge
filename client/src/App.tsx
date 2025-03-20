import {Button, CircularProgress, Stack} from "@mui/material";
import Box from '@mui/material/Box';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import axios from "axios";
import React, {useEffect, useState} from "react";

import './App.css';
import "./fonts/Bebas_Neue/BebasNeue-Regular.ttf";
import {FileUploader} from "react-drag-drop-files";
import {fileTypes} from "./machine/cbm/cbm.ts";
import {FileBlob, FileLike} from "./machine/FileBlob.ts";
import {CurrentFileSummary} from "./ui/CurrentFileSummary.tsx";
import {MenuAppBar} from "./ui/MenuAppBar.tsx";


const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

/**
 * Maximum allowed size for file uploads.
 * The biggest currently imaginable case a d81 double-sided disk image including error byte block according to the
 * following URL this weighs in at 822400 bytes as per http://unusedino.de/ec64/technical/formats/d81.html
 */
const MAX_SIZE_MB = 1;

export function TabPanel(props: { children: React.ReactNode, value: number, item: number }) {
  const {children, value, item} = props;
  return (
      <div role="tabpanel" hidden={value !== item} id={`simple-tabpanel-${item}`}>
        {value === item && (<Box sx={{pt: 3}}>{children}</Box>)}
      </div>
  );
}

type Error = { message: string, name: string, code: string, config: string, request: Request, response: Response };

/**
 * Try to load the QuickLoad binaries from the server for one click loading.
 */
function QuickLoads(props: { setFile: (f: FileLike) => void }) {
  const [items, setItems] = useState<FileLike[]>([]);
  const [error, setError] = useState<Error>();
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
  const handleFile = (item: FileLike) => {
    props.setFile(item);
  };

  if (error) {
    // no server, no quickloads, no big deal
    console.log(`error getting a response from the server: ${error}`);
    return null;
  } else if (!isLoaded) {
    return <CircularProgress/>;
  } else {
    return <div className="quickloads">
      <Stack direction="row" spacing={2}><p>Quickload:</p>
        <Stack direction="row" spacing={2}>
          {items.map((item, i) => {
            return <Button onClick={() => handleFile(item)} size="small" variant="outlined"
                           key={`ql_${i}`}>{item.name}</Button>
          })}
        </Stack>
      </Stack>
    </div>;
  }
}

function App() {
  const [file, setFile] = useState<File | FileLike | null>(null);
  return (
      <ThemeProvider theme={darkTheme}>
        <div className="App">
          <MenuAppBar/>
          <div className="mainContent">
            <Box sx={{display: "flex", gap: 1, justifyContent: "right"}}>
              <QuickLoads setFile={(f) => setFile(f)}/>
              <div className="dropZone">
                <FileUploader handleChange={setFile} name="file" types={fileTypes} maxSize={MAX_SIZE_MB}/>
              </div>
            </Box>
            {file ? <CurrentFileSummary file={file}/> : null}
          </div>
        </div>
      </ThemeProvider>
  );
}

export default App;
