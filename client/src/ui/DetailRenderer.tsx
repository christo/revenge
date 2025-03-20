import Alert from "@mui/material/Alert";
import {ActionExecutor, Tag, TAG_ABSOLUTE, TAG_ADDRESS, TAG_IN_BINARY, TAG_NOTE, TAG_OPERAND} from "../machine/api.ts";
import {Detail} from "./Detail.ts";
import {InfoPanel} from "./InfoPanel.tsx";
import {InsertLink} from "@mui/icons-material";

/**
 * Shows the detailed contents of a single file with a leading info summary specific to
 * the detailed view.
 */
export function DetailRenderer(props: { ae: ActionExecutor }) {
  const detail: Detail = props.ae();

  window.addEventListener("popstate", (...args) => {
    console.log(`popstate: ${args}`);
    // debugger;
  });
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

  return <div className="actionResult">
    <InfoPanel detail={detail}/>

    {detail.dataView.getLines().map((ll, i) => {
      const tl: Tag[] = ll.getTags();
      // TODO use TagRenderer
      return <div className={detail.tags.join(" ")} key={`fb_${i}`}>
        {tl.map((tup: Tag, j) => {
          // add id if this is an address
          const extra = tup.hasTag(TAG_ADDRESS) ? {id: "M_" + tup.value} : {};
          const isNote = tup.tags.find(x => x === TAG_NOTE) !== undefined;
          const data: { [k: string]: string; } = {};
          tup.data.forEach((kv: [string, string]) => data[`data-${kv[0]}`] = kv[1]);
          if (isNote) {
            return <Alert severity="info" {...data} sx={{mt: 2, width: "50%"}}
                          key={`fb_${i}_${j}`}>{tup.value}</Alert>;
          } else {
            const operand = tup.value;
            return <div {...extra} {...data} className={tup.spacedTags()} key={`fb_${i}_${j}`}
                        onClick={() => handleClick(tup.data, operand)}>{tup.value}
              <div className="iconAnno">{tup.hasTags([TAG_OPERAND, TAG_ABSOLUTE, TAG_IN_BINARY]) ?
                  <InsertLink/> : ""}</div>
            </div>;
          }
        })}
      </div>;
    })}
  </div>;
}