import './App.css';
import React, {useEffect, useState} from "react";
import {FileUploader} from "react-drag-drop-files";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import "./fonts/Bebas_Neue/BebasNeue-Regular.ttf";

import {createTheme, ThemeProvider} from '@mui/material/styles';
import {sniff} from "./machine/revenge";
import {ActionExecutor, Detail, TypeActions} from "./machine/api";
import {fileTypes} from "./machine/cbm";
import {FileBlob, FileLike} from "./machine/FileBlob";
import {Alert, Button, Chip, CircularProgress, Stack, Tab, Tabs} from "@mui/material";
import axios from "axios";

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

function DetailRenderer(props: { ae: ActionExecutor }) {
    const detail: Detail = props.ae();
    return <div className="actionResult">
        {detail.tfield.map((tl, i) => {
            return <div className={detail.tags.join(" ")} key={`fb_${i}`}>
                {tl.map((tup, j) => {
                    // add id if this is an address
                    let extra = (tup.tags.find(x => x === "addr") !== undefined) ? {} : {id: "M_" + tup.value};
                    const classes = tup.tags.join(" ");
                    let isNote = tup.tags.find(x => x === "note") !== undefined;
                    if (isNote) {
                        // doesn't look great...
                        return <Alert severity="info" sx={{mt:2, width: "50%"}} key={`fb_${i}_${j}`}>{tup.value}</Alert>
                    } else {
                        return <span {...extra} className={classes} key={`fb_${i}_${j}`}>{tup.value}</span>;
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

function FileDetail(props: { fb: FileBlob }) {
    const typeActions: TypeActions = sniff(props.fb);
    const [action, setAction] = useState(0);
    const t = typeActions.t;

    return <div>
        <div className="dataMeta">
            <div className="dataDetail">
                <span className="smell">Smells like</span>
                <span className="name">{t.name}</span>
                <span className="desc">{t.desc}</span>
                {t.tags.map((tag, i) => {
                    return <Chip label={tag} size="small"
                                 key={`tag_${i}`} sx={{marginRight: 1}}
                                 variant="outlined" color="info"/>
                })}
            </div>
        </div>
        <Tabs value={action} onChange={(event: React.SyntheticEvent, newValue: number) => {
            setAction(newValue);
        }}>
            {typeActions.actions.map((a, i) => {
                return <Tab label={a.label} key={`tac_${i}`}/>
            })}
        </Tabs>
        {typeActions.actions.map((a, i) => (
            <TabPanel item={i} value={action} key={`tap_${i}`}>
                <DetailRenderer ae={a.f}/>
            </TabPanel>
        ))}
    </div>;
}

function CurrentFileSummary(props: { file: File | FileLike }) {
    const [rendered, setRendered] = useState<FileContents>({fb: FileBlob.NULL_FILE_BLOB, loading: true});
    useEffect(() => {
        FileBlob.fromFile(props.file).then(fb => setRendered({fb: fb, loading: false}));
    }, [props.file]);

    return <div className="fileSummary">
        <span className="filename">
            {props.file.name}
        </span>
        <span className="filesize">
            {props.file.size} bytes
        </span>
        <div className="contents">
            {!rendered.loading ? <FileDetail fb={rendered.fb}/> : (<p>loading...</p>)}
        </div>
    </div>;
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

type Error = { message: String, name: String, code: String, config: String, request: Request, response: Response };

function QuickLoads(props: { setFile: (f: FileLike) => void }) {
    const [items, setItems] = useState<FileLike[]>([]);
    const [error, setError] = useState<Error>();
    const [isLoaded, setIsLoaded] = useState(false);
    useEffect(() => {
        axios.get("/quickloads", {})
            .then(r => {
                setIsLoaded(true);
                setItems(r.data);
            })
            .catch((err: any) => {
                setIsLoaded(true);
                setError(err);
            }).finally(() => {
        });

    }, []);
    let handleFile = (item: FileLike) => {
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
