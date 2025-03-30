import { Box } from "@mui/material";
import {Bigram} from "../analysis/Bigram.ts";
import {FileBlob} from "../machine/FileBlob.ts";
import {useEffect, useRef } from "react";
import {background} from "../neonColourScheme.ts";


function intensity(value: number, max: number) {
  const linear = value / max;
  const normalised = Math.pow(linear, 1/3); // 0 - 1
  const result = (normalised * 255).toFixed(0);
  return `rgb(${result},${result},${result})`;
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
        context.fillRect(first*2, second*2, 2, 2);
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


  return <Box >
    <canvas id="bigramcanvas" ref={canvasRef} width="256" height="256"></canvas>
  </Box>;
}

export {BigramPlot, bigrams};