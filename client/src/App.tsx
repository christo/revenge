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
import {ArrayGen, Continuation, detect, fileTypes, TypeActions} from "./machine/c64";
import {FileBlob} from "./machine/FileBlob";
import {Button} from "@mui/material";

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

function Disassembly(props: { arr: Array<any> }) {
    return <div className="disassembly">
        {props.arr.map((x, i) => {
            return <span className="line">{x}</span>
        })}
    </div>;
}

function hexByte(v: number) {
    return (v & 0xFF).toString(16).padStart(2, '0')
}

const resultLogger: Continuation = (f: ArrayGen) => f().forEach(console.log);

function FileDetail(props: { fb: FileBlob }) {
    // TODO foreach action, we need a renderer which knows how to render that action type
    // TODO When the action button is clicked, the renderer needs to fill the FileDetail

    const typeAction: TypeActions = detect(props.fb);
    const t = typeAction.t;
    return <div>
        <div className="dataMeta">
            <div className="typeActions">
                {typeAction.actions.map((a, i) => {
                    return <div className="typeAction"><Button onClick={() => resultLogger(a.f)}>{a.label}</Button></div>;
                })}
            </div>
            <div className="dataDetail">
                <span>Filetype:</span>
                <span>{t.name}</span>
                <span>{t.desc}</span>
                <span>{t.note}</span>
                <span>{t.exts}</span>
            </div>
        </div>

        <div className="hexbytes">
            {props.fb.toHexBytes().map((x, i) => {
                return <span className="hexbyte" key={`fb_${i}`}>{x}</span>;
            })}
        </div>
    </div>;
}

function CurrentFileSummary(props: { file: File }) {
    const [rendered, setRendered] = useState<FileContents>({fb: FileBlob.NULL_FILE_BLOB, loading: true});
    useEffect(() => {
        FileBlob.fromFile(props.file).then(fb => setRendered({fb: fb, loading: false}));
    }, []);

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

function App() {
    const [file, setFile] = useState<File | null>(null);
    const handleChange = setFile;
    return (
        <ThemeProvider theme={darkTheme}>
            <div className="App">
                <MenuAppBar/>
                <div className="mainContent">
                    <div className="dropZone">
                        <FileUploader handleChange={handleChange} name="file" types={fileTypes} maxSize={MAX_SIZE_MB}/>
                    </div>
                    {file ? <CurrentFileSummary file={file}/> : null}
                </div>
            </div>
        </ThemeProvider>
    );
}

export default App;
