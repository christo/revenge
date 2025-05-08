import {BookmarkBorder, Dangerous, Edit, InsertLink, MenuBook} from "@mui/icons-material";
import {Alert, Box, CircularProgress, Tooltip} from "@mui/material";
import React, {useEffect, useState} from 'react';
import {Detail, Tag, TAG_OPERAND_VALUE} from "../common-imports.ts";
import {ActionExecutor} from "../api.ts";
import {InfoPanel} from "./InfoPanel.tsx";

type MaybeId = { id?: string }

function debugTag(t: Tag): string {
  return t.data.map(value => `${value[0]}=${value[1]}`).join(",");
}

/**
 * Creates a {@link MaybeId} to represent a page-unique id for the given tag.
 * @param tup used to determine if this is an anchor link and if so, what the id value should be
 * @return it may be an id lol
 */
function maybeId(tup: Tag): MaybeId {
  const isSymbolDef = tup.isSymbolDef();
  const isAddress = tup.isAddress();

  const mkAddressId = () => "M_" + tup.value;

  const mkSymbolId = () => {
    // this should be a symbol definition: these should never have address
    // get the symbol name to make the a unique id for navigating to
    const symnameData = tup.data.find(d => d[0] === "symname");
    if (symnameData) {
      const symname = symnameData[1];
      // symbol is an identifier so name should have no spaces and be suitable for a unique id
      // note this invariant is not currently enforced anywhere but sprinkled in symbol table definitions
      // and rendered by the dialect - there should be a type for this constraint and an implementation
      // to generate a unique id with no spaces (like html requires)
      return `M_${symname}`;
    } else {
      throw Error(`constraint violation: can't find symname in tup's data ${debugTag(tup)}`);
    }
  };

  return isAddress ? {id: mkAddressId()} : isSymbolDef ? {id: mkSymbolId()} : {};
}

/**
 * Shows the detailed contents of a single file with a leading info summary specific to
 * the detailed view.
 */
export function DetailRenderer({ae}: { ae: ActionExecutor }) {

  // when an address operand or symbol usage is clicked,
  // try to find its destination in the view and if present scroll to it
  const handleClick = (data: [string, string][], operand: string) => {
    // first look for an operand value, either it's an address or a symbol, used identically for id attribute
    const tup = data.find(t => t[0] === TAG_OPERAND_VALUE || t[0] == 'symname');
    console.log(`handleClick: operand is ${operand}`);
    if (tup !== undefined) {
      const id = "M_" + tup[1];
      const jumpTo = document.getElementById(id);
      if (jumpTo !== null) {
        jumpTo.scrollIntoView({behavior: "smooth"});
        // TODO UI visible pulse on target address after it scrolls into view? cursor?
        history.pushState(`id-${id}`, `${window.document.title} ${operand}`, window.location.href);
      } else {
        console.log(`could not find element with id ${id}`);
      }
    } else {
      console.log(`handleClick: tup is not defined`);
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
          {tagsForLine.map((tag: Tag, j) => {
            // set data- attributes for each item in the data
            const data: { [k: string]: string; } = {};
            tag.data.forEach((kv: [string, string]) => data[`data-${kv[0]}`] = kv[1]);
            if (tag.isNote()) {
              // shown instead of normal line, represents a potential problem
              return <Alert severity="warning" {...data} sx={{mt: 2, width: "50%"}}
                            key={`fb_${i}_${j}`}>{tag.value}</Alert>;
            } else {
              const operand = tag.value;
              const internalLink = tag.isOperandResolvingToInternalAddress();
              return <Box {...(maybeId(tag))} {...data}
                          sx={{w: "100%"}}
                          className={tag.spacedClassNames()}
                          key={`fb_${i}_${j}`}
                          onClick={() => handleClick(tag.data, operand)}>
                {tag.value}
                {tag.wasWrittenTo() && <Tooltip title="Written to"><Edit/></Tooltip>}
                {tag.wasReadFrom() && <Tooltip title="Read from"><MenuBook/></Tooltip>}
                <Box display="inline" className="iconAnno">
                  {internalLink ? <Tooltip title="Jump in binary"><InsertLink
                      onClick={() => handleClick(tag.data, operand)}/></Tooltip> : ""}
                  {tag.isKnownSymbol() ? <BookmarkBorder onClick={() => handleClick(tag.data, operand)}/> : ""}
                  { // TODO this tooltip message should be derived from trace result, not hardcoded here
                    tag.isIndirectMode() ?
                        <Tooltip title="Indirect operand unsupported by trace"><Dangerous/></Tooltip> : ""
                  }
                </Box>
              </Box>;
            }
          })}
        </Box>;
      })}
    </Box>;
  }
}