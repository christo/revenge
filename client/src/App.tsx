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
import {ActionExecutor, detect, TypeActions, UserAction} from "./machine/revenge";
import {fileTypes} from "./machine/cbm";
import {FileBlob, FileLike} from "./machine/FileBlob";
import {Button, CircularProgress, Stack} from "@mui/material";
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

function HexDump(props: {fb: FileBlob}) {
    return <div className="hexbytes">
        {props.fb.toHexBytes().map((x, i) => {
            return <span className="hexbyte" key={`hb_${i}`}>{x}</span>;
        })}
    </div>
}

function DetailRenderer(props: {ae: ActionExecutor}) {
    return <div className="actionResult">
        {props.ae().map((tl, i) => {
            return <div className="line" key={`fb_${i}`}>
                {tl.map((tup, j) => {
                    return <span className={tup[0]} key={`fb_${i}_${j}`}>{tup[1]}</span>;
                })}
            </div>;
        })}
    </div>;
}

function FileContents(props: { fb: FileBlob, action: UserAction | null}) {
    return props.action == null ? <HexDump fb={props.fb}/> : <DetailRenderer ae={props.action.f}/>;
}

function FileDetail(props: { fb: FileBlob }) {
    const [action, setAction] = useState<UserAction | null>(null);
    const typeAction: TypeActions = detect(props.fb);
    const t = typeAction.t;
    useEffect(() => {
        setAction(null);
    },[props.fb]);
    return <div>
        <div className="dataMeta">

            <div className="dataDetail">
                <span className="smell">Smells like</span>
                <span className="name">{t.name}</span>
                <span className="desc">{t.desc}</span>
                <span className="note">{t.note}</span>
            </div>

            <div className="typeActions">
                {typeAction.actions.map((a, i) => {
                    return <div className="typeAction" key={`ac_${i}`}>
                        <Button onClick={()=>setAction(a)}>{a.label}</Button>
                    </div>;
                })}
            </div>

        </div>
        <FileContents fb={props.fb} action={action}/>
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

type Error = {message:String, name:String, code:String, config:String, request:Request, response:Response};

function QuickLoads(props: {setFile: (f: FileLike) => void}) {
    const [items, setItems] = useState<FileLike[]>([]);
    const [error, setError] = useState<Error>();
    const [isLoaded, setIsLoaded] = useState(false);
    useEffect(() => {
        axios.get("/quickloads", {})
            .then(r=>{
                setIsLoaded(true);
                setItems(r.data);
            })
            .catch((err:any) => {
                setIsLoaded(true);
                setError(err);
            }).finally(() => {});

    }, []);
    let handleFile = (item:FileLike) => {
        props.setFile(item);
    };

    if (error) {
        return (<div>
            Error: {error.message}
        </div>);
    } else if (!isLoaded) {
        return <CircularProgress />;
    } else {
        return <div className="quickloads">
            <Stack direction="column" spacing={2}>
            {items.map((item, i) => {
                return <Button onClick={() => handleFile(item)} size="small" variant="outlined" key={`ql_${i}`}>{item.name}</Button>
            })}
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
                        <QuickLoads setFile={(f)=>setFile(f)}/>
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
