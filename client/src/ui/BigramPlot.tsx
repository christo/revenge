import {Bigram} from "@common/analysis/Bigram.ts";
import {FileBlob} from "@common/machine/FileBlob.ts";
import {Box} from "@mui/material";
import React, {useEffect, useRef} from 'react';
import {background, secondaryBright} from "../neonColourScheme.ts";


function intensity(value: number, max: number) {
  const linear = value / max;
  const normalised = Math.pow(linear, 1 / 4); // 0 - 1
  const result = (normalised * 255).toFixed(0);
  return `rgb(${result},${((normalised * 192).toFixed(0))}, ${result})`;
}

function bigrams(canvas: HTMLCanvasElement, fb: FileBlob, bgColor: string) {

  const context = canvas.getContext("2d");
  if (context) {
    const bigram = new Bigram(fb);
    const max = bigram.getMax();

    // start with black
    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // draw bigram value plot
    const scale = canvas.width / bigram.SIZE;
    bigram.forEach((first, second, value) => {
      // context.fillStyle = hsl1FillStyle(value, max);
      if (value !== 0) {
        context.fillStyle = intensity(value, max);

        // first will be x, second will be y
        context.fillRect(first * scale, second * scale, scale, scale);
      }
    });
  }

}

function BigramPlot({fb}: { fb: FileBlob }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (canvasRef.current) {
      // console.log("about to render bigram on canvas")
      bigrams(canvasRef.current, fb, background);
    }
  }, [fb]);

  return <Box sx={{border: `dashed thin ${secondaryBright}`, p: "2px"}}>
    <canvas id="bigramcanvas" ref={canvasRef} width="128" height="128"></canvas>
  </Box>;
}

export {BigramPlot, bigrams};