"use client";

import React, { useRef, useEffect, useState } from "react";

interface VncViewerProps {
  viewOnly?: boolean;
  mode?: "online" | "offline";
}

export function VncViewer({ viewOnly = true, mode = "online" }: VncViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [VncComponent, setVncComponent] = useState<any>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    // Dynamically import the VncScreen component only on the client side
    import("react-vnc").then(({ VncScreen }) => {
      setVncComponent(() => VncScreen);
      setIsConnecting(false);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return; // SSR safety‑net
    
    console.log(`[VncViewer] Mode: ${mode}, Setting up WebSocket connection...`);
    
    if (mode === "offline") {
      // Connect via local server proxy (same as online mode when running locally)
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${window.location.host}/api/proxy/websockify`;
      console.log(`[VncViewer] Offline mode - connecting to: ${url}`);
      setWsUrl(url);
    } else {
      // Connect via hosted proxy (same URL, but will fail if desktop not hosted)
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${window.location.host}/api/proxy/websockify`;
      console.log(`[VncViewer] Online mode - connecting to: ${url}`);
      setWsUrl(url);
    }
  }, [mode]);

  return (
    <div ref={containerRef} className="h-full w-full bg-gray-900 flex items-center justify-center">
      {isConnecting && (
        <div className="text-white text-sm">Loading VNC viewer...</div>
      )}
      {!isConnecting && !wsUrl && (
        <div className="text-white text-sm">Configuring connection...</div>
      )}
      {VncComponent && wsUrl && (
        <VncComponent
          rfbOptions={{
            secure: false,
            shared: true,
            wsProtocols: ["binary"],
          }}
          // autoConnect={true}
          key={`${viewOnly ? "view-only" : "interactive"}-${mode}-${wsUrl}`}
          url={wsUrl}
          scaleViewport
          viewOnly={viewOnly}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
