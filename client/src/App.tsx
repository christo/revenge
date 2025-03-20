import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import {Button, Chip, CircularProgress, Stack} from "@mui/material";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import axios from "axios";
import React, {useEffect, useState} from "react";

import './App.css';
import "./fonts/Bebas_Neue/BebasNeue-Regular.ttf";
import {FileUploader} from "react-drag-drop-files";
import {fileTypes} from "./machine/cbm/cbm.ts";
import {LE} from "./machine/core.ts";
import {FileBlob, FileLike} from "./machine/FileBlob.ts";
import {FileDetail} from "./ui/FileDetail.tsx";

const BASE_TITLE = window.document.title;

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

interface FileContents {
  fb: FileBlob,
  loading: boolean
}

export function TabPanel(props: { children: React.ReactNode, value: number, item: number }) {
  const {children, value, item} = props;
  return (
      <div role="tabpanel" hidden={value !== item} id={`simple-tabpanel-${item}`}>
        {value === item && (<Box sx={{pt: 3}}>{children}</Box>)}
      </div>
  );
}

export function HashChip({tag}: { tag: string }) {
  return <Chip label={tag} size="small"
               sx={{marginRight: 1}}
               variant="outlined" color="info"/>

}

function CurrentFileSummary({file}: { file: File | FileLike }) {
  const [rendered, setRendered] = useState<FileContents>({fb: FileBlob.NULL_FILE_BLOB, loading: true});

  useEffect(() => {
    FileBlob.fromFile(file, LE).then(fb => setRendered({fb: fb, loading: false}));
  }, [file]);

  return <Box className="fileSummary">
      <span className="filename">
          {file.name}
      </span>
      <span className="filesize">
          {file.size} bytes
      </span>
    <Box className="contents">
      {!rendered.loading ? <FileDetail fb={rendered.fb}/> : <CircularProgress sx={{p:5}}/>}
    </Box>
  </Box>;
}

function MenuAppBar() {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
      <Box sx={{flexGrow: 1}}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{mr: 2}}
            >
              <MenuIcon/>
            </IconButton>
            <Typography variant="h4" component="div" sx={{flexGrow: 1, fontFamily: 'BebasNeueRegular'}}>
              Revenge
            </Typography>
            <i className="byLine">retrocomputing reverse engineering environment</i>
            {(
                <div>
                  <IconButton
                      size="large"
                      aria-label="account of current user"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      onClick={handleMenu}
                      color="inherit"
                  >
                    <AccountCircle/>
                  </IconButton>
                  <Menu
                      id="menu-appbar"
                      anchorEl={anchorEl}
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      keepMounted
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      open={Boolean(anchorEl)}
                      onClose={handleClose}
                  >
                    <MenuItem onClick={handleClose}>Profile</MenuItem>
                    <MenuItem onClick={handleClose}>My account</MenuItem>
                  </Menu>
                </div>
            )}
          </Toolbar>
        </AppBar>
      </Box>
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
