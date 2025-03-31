
// TODO make this into idiomatic react theme

import { createTheme } from "@mui/material";

// colours from the logo
export const darkPurple = "#1B0420";
export const neonPink = "#E346A5";
export const neonCyan = "#0AE0E3";
export const neonYellow = "#ccd044";

// TODO more accent colour variants
// TODO a less vivid main text colour
// TODO tone variants
// TODO incorporate syntax highlighting colour scheme defined elsewhere

export const background = darkPurple;
export const primaryBright = neonPink;
export const secondaryBright = neonYellow;
export const infoBright = neonCyan;

export const darkTheme = createTheme({
  palette: {

    mode: 'dark',
    background: {paper: background},
    info: {main: infoBright},
    secondary: {main: secondaryBright},
    primary: {main: primaryBright},

  },
});