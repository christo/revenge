import {Box, Button, CircularProgress, Stack, Typography} from "@mui/material";
import * as R from "ramda";
import axios from "axios";
import React, {useEffect, useState} from 'react';
import {FileLike} from "../../../server/src/common/FileLike.ts";
import {QuickLoad} from "../../../server/src/common/QuickLoad.ts";
import {ServerError} from "../../../server/src/common/ServerError.ts";
import {background, infoBright, lowKey, primaryBright} from "../neonColourScheme.ts";

/**
 * Temporary typographic logo for a retro system.
 * @param background
 * @param foreground
 * @param text
 */
function systemLogo(background: string, foreground: string, text: string) {
  return <Typography sx={{
    font: "Martian Mono",
    fontWeight: "bold",
    fontSize: "0.6rem",
    color: foreground,
    backgroundColor: background,
    borderRadius: "5px",
    p: "0 4px",
    ml: 0.5,
    opacity: R.max(0.5, 0.7)
  }}>{text}</Typography>;
}

const EMPTY_QUICKLOADS = {VIC20: [], C64: []};

// TODO redo this in a more mui style wa2y
const SX_QL = {
  color: lowKey,
  fontSize: "x-large",
  writingMode: "vertical-rl",
  textTransform: "uppercase",
  fontFamily: "BebasNeueRegular"
};

/**
 * Try to load the QuickLoad binaries from the server for one click loading.
 */
export function QuickLoads(props: { setFile: (f: FileLike) => void }) {
  const [items, setItems] = useState<QuickLoad>(EMPTY_QUICKLOADS);
  const [error, setError] = useState<ServerError>();
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    axios.get("/api/quickloads", {})
        .then(r => {
          setIsLoaded(true);
          setItems(r.data);
        })
        .catch((err) => {
          setIsLoaded(true);
          setError(err);
        }).finally(() => {
      return;
    });

  }, []);
  const handleFile = async (item: FileLike) => {
    props.setFile(item);
  };

  if (error) {
    // no server, no quickloads, no big deal
    console.log(`error getting a response from the server: ${error}`);
    return null;
  } else if (!isLoaded) {
    return <Box sx={{w: "100%"}}><CircularProgress color="secondary"/></Box>;
  } else {
    return <Box sx={{w: "100%", p: 0}}>
      <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="center">
        <Box sx={{pt: 1}}>
          <Typography variant="h4" sx={SX_QL}>Quickload</Typography>
        </Box>
        <Stack
            direction="row"
            gap="0.5rem 1rem"
            flexWrap="wrap"
            display="flex"
            justifyContent="flex-start"
            alignContent="flex-start">
          {items.VIC20.map((item, i) => {
            return <Button onClick={() => handleFile(item)} size="small" variant="outlined" color="primary"
                           key={`qlvic_${i}`}>{item.name}&nbsp;{systemLogo(primaryBright, background, "VIC")}</Button>
          })}
          {items.C64.map((item, i) => {
            return <Button onClick={() => handleFile(item)} size="small" variant="outlined" color="info"
                           key={`qlc64_${i}`}>{item.name}&nbsp;{systemLogo(infoBright, background, "64")}</Button>
          })}
        </Stack>
      </Stack>
    </Box>;
  }
}