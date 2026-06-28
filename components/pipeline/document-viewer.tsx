"use client";

import { useState } from "react";
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function ZoomableContent({
  src,
  alt,
  format,
  className,
}: {
  src: string;
  alt: string;
  format: "IMAGE" | "PDF";
  className?: string;
}) {
  const [zoom, setZoom] = useState(1);

  const zoomIn = () => setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.indexOf(z) + 1, ZOOM_STEPS.length - 1)]);
  const zoomOut = () => setZoom((z) => ZOOM_STEPS[Math.max(ZOOM_STEPS.indexOf(z) - 1, 0)]);
  const resetZoom = () => setZoom(1);

  return (
    <div className={className}>
      {format === "IMAGE" && (
        <div className="mb-2 flex items-center gap-1">
          <Button size="icon" variant="outline" className="size-7" onClick={zoomOut} disabled={zoom === ZOOM_STEPS[0]}>
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            onClick={zoomIn}
            disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="size-7" onClick={resetZoom} disabled={zoom === 1}>
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      )}
      <div className="resize overflow-auto rounded-md border bg-muted/20" style={{ minHeight: 240, height: 500, maxHeight: "85vh" }}>
        {format === "IMAGE" ? (
          <div className="flex min-h-full items-start justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded content, not optimizable */}
            <img
              src={src}
              alt={alt}
              style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
              className="select-none"
            />
          </div>
        ) : (
          <iframe src={src} title={alt} className="size-full" />
        )}
      </div>
    </div>
  );
}

/**
 * Resizable, zoomable viewer for an uploaded source document (image or PDF).
 * The inline panel can be dragged larger via the native CSS resize handle;
 * the expand button opens the same content in a near-fullscreen dialog.
 */
export function DocumentViewer({
  src,
  fileName,
  format,
}: {
  src: string;
  fileName: string;
  format: "IMAGE" | "PDF";
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-xs text-muted-foreground">Drag the bottom-right corner to resize.</p>
        <Button size="sm" variant="outline" onClick={() => setExpanded(true)}>
          <Maximize2 className="size-3.5" />
          Expand
        </Button>
      </div>
      <ZoomableContent src={src} alt={fileName} format={format} />

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex max-h-[95vh] w-full max-w-[95vw] flex-col sm:max-w-[95vw]">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate text-sm font-medium">{fileName}</DialogTitle>
            <Button size="sm" variant="outline" onClick={() => setExpanded(false)}>
              <Minimize2 className="size-3.5" />
              Close
            </Button>
          </div>
          {format === "IMAGE" ? (
            <div className="flex-1 overflow-auto rounded-md border bg-muted/20 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded content, not optimizable */}
              <img src={src} alt={fileName} className="mx-auto max-w-full" />
            </div>
          ) : (
            <iframe src={src} title={fileName} className="flex-1 rounded-md border" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
