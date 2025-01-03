import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import {Alert, Button, Chip, CircularProgress, Stack, Tab, Tabs} from "@mui/material";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import axios from "axios";
import {FileUploader} from "react-drag-drop-files";
import React, {ReactNode, useEffect, useState} from "react";

import './App.css';
import "./fonts/Bebas_Neue/BebasNeue-Regular.ttf";
import {
  ActionExecutor,
  Detail,
  Tag,
  TAG_ABSOLUTE,
  TAG_ADDRESS,
  TAG_IN_BINARY,
  TAG_NOTE,
  TAG_OPERAND,
  TypeActions
} from "./machine/api.ts";
import {fileTypes} from "./machine/cbm/cbm.ts";
import {LE} from "./machine/core.ts";
import {FileBlob, FileLike} from "./machine/FileBlob.ts";
import {sniff} from "./machine/revenge.ts";
import {InsertLink} from "@mui/icons-material";

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

function SmolPanel({heading, children}: { heading: string, children: ReactNode }) {
  return <Box className="smolpanel">
    <Typography variant="h6">{heading}</Typography>
    {children}
  </Box>;
}

function InfoPanel({detail}: { detail: Detail }) {
  return <Box className="infopanel">
    <SmolPanel heading="Options">
      <Typography>Options control panel will go here enabling assembly dialect selection etc</Typography>
    </SmolPanel>
    <SmolPanel heading={`Stats for ${detail.name}`}>
      {detail.stats.map(([key, value], i) =>
        <Box key={`sp_${i}`} className="stat">
          <span className="skey">{key}</span> <span className="sval">{value}</span>
        </Box>
      )}
    </SmolPanel>
  </Box>;
}

/**
 * Shows the detailed contents of a single file with a leading info summary specific to
 * the detailed view.
 */
function DetailRenderer(props: { ae: ActionExecutor }) {
  const detail: Detail = props.ae();

  window.addEventListener("popstate", (...args) => {
    console.log(`popstate: ${args}`);
    // debugger;
  });
  // when an address operand is clicked, try to find its destination in the view and if present scroll to it
  const handleClick = (data: [string, string][], addr: string) => {
    const tup = data.find(t => t[0] === "opnd_val");
    if (tup !== undefined) {
      const id = "M_" + tup[1];
      const jumpTo = document.getElementById(id);
      if (jumpTo !== null) {
        jumpTo.scrollIntoView({behavior: "smooth"});
        // TODO navigate to anchor once scrolled so history holds locations and back buttons navigate properly
        history.pushState(`id-${id}`, `${BASE_TITLE} ${addr}`, window.location.href);
      }
    }
  }

  return <div className="actionResult">
    <InfoPanel detail={detail}/>

    {detail.dataView.getLines().map((ll, i) => {
      const tl = ll.getTags();
      return <div className={detail.tags.join(" ")} key={`fb_${i}`}>
        {tl.map((tup: Tag, j) => {
          // add id if this is an address
          const extra = tup.hasTag(TAG_ADDRESS) ? {id: "M_" + tup.value} : {};
          const isNote = tup.tags.find(x => x === TAG_NOTE) !== undefined;
          const data: { [k: string]: string; } = {};
          tup.data.forEach((kv: [string, string]) => data[`data-${kv[0]}`] = kv[1]);
          if (isNote) {
            return <Alert severity="info" {...data} sx={{mt: 2, width: "50%"}}
                          key={`fb_${i}_${j}`}>{tup.value}</Alert>;
          } else {
            const operand = tup.value;
            return <div {...extra} {...data} className={tup.spacedTags()} key={`fb_${i}_${j}`}
                        onClick={() => handleClick(tup.data, operand)}>{tup.value}
              <div className="iconAnno">{tup.hasTags([TAG_OPERAND, TAG_ABSOLUTE, TAG_IN_BINARY]) ?
                  <InsertLink/> : ""}</div>
            </div>;
          }
        })}
      </div>;
    })}
  </div>;
}

function TabPanel(props: { children: React.ReactNode, value: number, item: number }) {
  const {children, value, item} = props;
  return (
      <div role="tabpanel" hidden={value !== item} id={`simple-tabpanel-${item}`}>
        {value === item && (<Box sx={{pt: 3}}>{children}</Box>)}
      </div>
  );
}

function HashChip({tag, key}: { key: string, tag: string }) {
  return <Chip label={tag} size="small"
               key={key} sx={{marginRight: 1}}
               variant="outlined" color="info"/>

}

/**
 * Main content showing interpreted file contents.
 *
 * @param props
 * @constructor
 */
function FileDetail({fb}: { fb: FileBlob }) {
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
        <span className="smell">Smells like</span>
        <span className="name">{t.name}</span>
        <span className="desc">{t.desc}</span>
        {t.tags.map((tag, i) => <HashChip tag={tag} key={`tag_${i}`}/>)}
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
