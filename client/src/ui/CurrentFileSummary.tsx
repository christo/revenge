import {useEffect, useState } from "react";
import {LE} from "../machine/core.ts";
import {FileBlob, FileLike} from "../machine/FileBlob.ts";
import {FileDetail} from "./FileDetail.tsx";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

interface FileContents {
  fb: FileBlob,
  loading: boolean
}

/*

.fileSummary .filename {
  padding-right: 1em;
  font-weight: bold;
  font-size: 200%;
  line-height: 1.8;
  color: #a3b3d5;
}

.fileSummary .filesize {
  padding-right: 1em;
  font-family: "Martian Mono", monospace;
}

 */

export function CurrentFileSummary({file}: { file: File | FileLike }) {
  const [rendered, setRendered] = useState<FileContents>({fb: FileBlob.NULL_FILE_BLOB, loading: true});

  useEffect(() => {
    FileBlob.fromFile(file, LE).then(fb => setRendered({fb: fb, loading: false}));
  }, [file]);

  return <Box sx={{p: 1, backgroundColor: "#333", m: 2, color: "antiquewhite"}} className="fileSummary">
    <Typography display="inline" sx={{pr: 1, fontWeight: "bold", fontSize: "200%", lineHeight: 1.8, color: "#a3b3d5"}} className="filename">
      {file.name}
    </Typography>
    <Typography display="inline" sx={{pr: 1, fontFamily: '"Martian Mono", monospace'}} >
      {file.size} bytes
    </Typography>
    <Box className="contents">
      {!rendered.loading ? <FileDetail fb={rendered.fb}/> : <CircularProgress sx={{p: 5}}/>}
    </Box>
  </Box>;
}