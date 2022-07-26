import './App.css';
import React, {useState} from "react";
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

// May need to add more but these seem initially sufficient
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];
// biggest currently imaginable case a d81 double-sided disk image including error byte block
// according to the following URL this weighs in at 822400 bytes
// as per http://unusedino.de/ec64/technical/formats/d81.html
const MAX_SIZE_MB = 1;

const toHexBytes = (buf:ArrayBuffer):string[] => {
    let elements:string[] = [];
    const bytes = new Uint8Array(buf)
    for(const [_index, entry] of bytes.entries()) {
        elements.push((entry & 0xFF).toString(16).padStart(2, '0'));
    }
    return elements;
}

interface FileContents {
    bytes: string[],
    loading: boolean
}

function FileContents(props: { bytes:Promise<ArrayBuffer> }):JSX.Element {
    const [rendered, setRendered] = useState<FileContents>({bytes: [], loading: true});
    props.bytes.then((buf:ArrayBuffer) => {
        const bytes:string[] = toHexBytes(buf);
        setRendered({bytes: bytes, loading: false})
    }).catch( (e:Error) => {
        console.error(e);
    });
    return <div className="hexbytes">
        { // TODO add offset column
            !rendered.loading ? (rendered.bytes.map((bs:string, i:number) => {
                return <span className="hexbyte" key={`fb_${i}`}>{bs}</span>;
            })) : (<p>loading...</p>)
        }
    </div>
}

function CurrentFileSummary(props: { file:File }) {
    let bytes:Promise<ArrayBuffer> = props.file.arrayBuffer();
    return <div className="fileSummary">
        <span className="filename">
            {props.file.name}
        </span>
        <span className="filesize">
            {props.file.size} bytes
        </span>
        <div className="contents">
            <FileContents bytes={bytes}/>
        </div>
    </div>;
}

function TestGrid(props:{n:number}) {
    let items = [];
    for (let i = 0; i < props.n; i++) {
        items.push(i);
    }
    return <div className="hexbytes">
        {items.map(i => <span className="hexbyte" key={`fb_${i}`}>{i.toString()}</span>)}
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
    <Box sx={{ flexGrow: 1 }}>

      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Revenge <i className="byLine">retrocomputing reverse engineering environment</i>
          </Typography>
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
                <AccountCircle />
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
    const [file, setFile] = useState(null);
    const handleChange = (file: any, e: any) => {
        setFile(file);
    };
    return (
        <div className="App">

            <MenuAppBar/>
            <div className="mainContent">
                <div className="dropZone">
                    <FileUploader handleChange={handleChange} name="file" types={fileTypes} maxSize={MAX_SIZE_MB}/>
                </div>
                {file ? <CurrentFileSummary file={file}/> : null}
                {/*<TestGrid n={160}/>*/}
            </div>
        </div>

    );
}

export default App;
