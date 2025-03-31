import {Box} from "@mui/material";
import {useEffect, useRef} from "react";
import {Bigram} from "../analysis/Bigram.ts";
import {FileBlob} from "../machine/FileBlob.ts";
import {background, neonYellow, secondaryBright} from "../neonColourScheme.ts";


function intensity(value: number, max: number) {
  const linear = value / max;
  const normalised = Math.pow(linear, 1/4); // 0 - 1
  const result = (normalised * 255).toFixed(0);
  return `rgb(${result},${result},${((normalised * 128).toFixed(0))})`;
}

function bigrams(canvas: HTMLCanvasElement, fb: FileBlob, bgColor: string) {

  const bigram = new Bigram(fb);
  const max = bigram.getMax();

  // TODO make canvas resizable, draw proportionally

  const context = canvas.getContext("2d");
  if (context) {

    // start with black
    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // draw bigram value plot

    bigram.forEach((first, second, value) => {
      // context.fillStyle = hsl1FillStyle(value, max);
      if (value !== 0) {
        context.fillStyle = intensity(value, max);

        // first will be x, second will be y
        context.fillRect(first, second, 1, 1);
      }
    });
  }

}

function BigramPlot({fb}: {fb: FileBlob}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (canvasRef.current) {
      console.log("about to render bigram on canvas")
      bigrams(canvasRef.current, fb, background);
    }
  }, [fb]);


  return <Box sx={{border: `dashed thin ${secondaryBright}`, p: "1px"}}>
    <canvas id="bigramcanvas" ref={canvasRef} width="256" height="256"></canvas>
  </Box>;
}

export {BigramPlot, bigrams};