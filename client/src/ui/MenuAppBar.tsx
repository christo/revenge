import {AccountCircle} from "@mui/icons-material";
import MenuIcon from '@mui/icons-material/Menu'
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import React from "react";
import {background, neonCyan, neonPink} from "../neonColourScheme.ts";

export function MenuAppBar() {
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
          <Toolbar sx={{backgroundColor: background, borderBottom: `${neonCyan} thin dashed`}}>
            <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{mr: 2}}
            >
              <MenuIcon sx={{color: neonCyan}}/>
            </IconButton>
            <Typography variant="h4" component="div" sx={{
              flexGrow: 1,
              fontFamily: 'BebasNeueRegular',
              color: neonPink
            }}>
              Revenge
            </Typography>
            <Typography display="inline"
                        sx={{color: neonPink, fontStyle: "italic", fontFamily: "'BebasNeueRegular', cursive"}}>
              retrocomputing reverse engineering environment
            </Typography>
            {(
                <Box>
                  <IconButton
                      size="large"
                      aria-label="account of current user"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      onClick={handleMenu}
                      color="inherit"
                  >
                    <AccountCircle sx={{color: neonCyan}}/>
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
                </Box>
            )}
          </Toolbar>
        </AppBar>
      </Box>
  );
}