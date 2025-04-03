import {BookmarkBorder, InsertLink} from "@mui/icons-material";
import {Alert, Box, CircularProgress, Tooltip} from "@mui/material";
import {useEffect, useState} from "react";
import {
  ActionExecutor,
  Tag,
  TAG_ABSOLUTE,
  TAG_ADDRESS,
  TAG_IN_BINARY,
  TAG_KNOWN_SYMBOL,
  TAG_NOTE,
  TAG_OPERAND
} from "../machine/api.ts";
import {Detail} from "./Detail.ts";
import {InfoPanel} from "./InfoPanel.tsx";

/**
 * Shows the detailed contents of a single file with a leading info summary specific to
 * the detailed view.
 */
export function DetailRenderer({ae}: { ae: ActionExecutor }) {

  // when an address operand is clicked, try to find its destination in the view and if present scroll to it
  const handleClick = (data: [string, string][], addr: string) => {
    const tup = data.find(t => t[0] === "opnd_val");
    if (tup !== undefined) {
      const id = "M_" + tup[1];
      const jumpTo = document.getElementById(id);
      if (jumpTo !== null) {
        jumpTo.scrollIntoView({behavior: "smooth"});
        // TODO visible pulse on target address after it scrolls into view? cursor?
        history.pushState(`id-${id}`, `${window.document.title} ${addr}`, window.location.href);
      }
    }
  }
  const [detail, setDetail] = useState<Detail | null>(null);
  useEffect(() => {
    ae().then(d => setDetail(d));
  }, [ae]);
  if (!detail) {
    return <Box sx={{w: "100%", overflowX: "hidden"}} className="actionResult"><CircularProgress/></Box>;
  } else {

    return <Box sx={{w: "100%", overflowX: "hidden"}} className="actionResult">
      <InfoPanel detail={detail}/>

      {detail.dataView.getLines().map((ll, i) => {
        const tagsForLine: Tag[] = ll.getTags();
        return <Box className={detail.classNames.join(" ")} key={`fb_${i}`}>
          {tagsForLine.map((tup: Tag, j) => {
            // add id if this is an address
            const isNote = tup.classNames.find(x => x === TAG_NOTE) !== undefined;
            // set data- attributes for each item in the data
            const data: { [k: string]: string; } = {};
            tup.data.forEach((kv: [string, string]) => data[`data-${kv[0]}`] = kv[1]);
            if (isNote) {
              // shown instead of normal line, represents a potential problem
              return <Alert severity="warning" {...data} sx={{mt: 2, width: "50%"}}
                            key={`fb_${i}_${j}`}>{tup.value}</Alert>;
            } else {
              const operand = tup.value;
              // TODO link the symdef to the symbol usage
              const internalLink = tup.hasTags([TAG_OPERAND, TAG_ABSOLUTE, TAG_IN_BINARY]);
              const extra = tup.hasTag(TAG_ADDRESS) ? {id: "M_" + tup.value} : {};

              return <Box {...extra} {...data}
                          sx={{w: "100%"}}
                          className={tup.spacedClassNames()}
                          key={`fb_${i}_${j}`}
                          onClick={() => handleClick(tup.data, operand)}>
                {tup.value}
                <Box display="inline" className="iconAnno">
                  {internalLink ? <Tooltip title="Jump in binary"><InsertLink/></Tooltip> : ""}
                  {tup.hasTag(TAG_KNOWN_SYMBOL) ? <BookmarkBorder/> : ""}
                </Box>
              </Box>;
            }
          })}
        </Box>;
      })}
    </Box>;
  }
}