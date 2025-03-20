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

export function CurrentFileSummary({file}: { file: File | FileLike }) {
  const [rendered, setRendered] = useState<FileContents>({fb: FileBlob.NULL_FILE_BLOB, loading: true});

  useEffect(() => {
    FileBlob.fromFile(file, LE).then(fb => setRendered({fb: fb, loading: false}));
  }, [file]);

  return <Box className="fileSummary">
    <Typography display="inline" className="filename">
      {file.name}
    </Typography>
    <Typography display="inline" className="filesize">
      {file.size} bytes
    </Typography>
    <Box className="contents">
      {!rendered.loading ? <FileDetail fb={rendered.fb}/> : <CircularProgress sx={{p: 5}}/>}
    </Box>
  </Box>;
}