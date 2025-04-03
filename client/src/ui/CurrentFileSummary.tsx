import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import {useEffect, useState} from "react";
import {FileBlob, FileLike} from "../machine/FileBlob.ts";
import {Mos6502} from "../machine/mos6502.ts";
import {neonYellow} from "../neonColourScheme.ts";
import {FileDetail} from "./FileDetail.tsx";

interface FileContents {
  fb: FileBlob,
  loading: boolean
}

export function CurrentFileSummary({file}: { file: File | FileLike }) {
  const [rendered, setRendered] = useState<FileContents>({fb: FileBlob.NULL_FILE_BLOB, loading: true});

  useEffect(() => {
    FileBlob.fromFile(file, Mos6502.ENDIANNESS).then(fb => setRendered({fb: fb, loading: false}));
  }, [file]);

  return <Box sx={{p: 1, m: 2, color: "antiquewhite"}} className="fileSummary">
    <Typography display="inline" sx={{pr: 1, fontWeight: "bold", fontSize: "200%", lineHeight: 1.8, color: neonYellow}}
                className="filename">
      {file.name}
    </Typography>
    <Typography display="inline" sx={{pr: 1, fontFamily: '"Martian Mono", monospace'}}>
      {file.size} bytes
    </Typography>
    <Box className="contents">
      {!rendered.loading ? <FileDetail fb={rendered.fb}/> : <CircularProgress sx={{p: 5}}/>}
    </Box>
  </Box>;
}