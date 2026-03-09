import { useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { Plan } from "@/types/planning.types";

interface UsePlanWebSocketProps {
  planId: string | null;
  onPlanUpdate?: (plan: Plan) => void;
}

export function usePlanWebSocket({
  planId,
  onPlanUpdate,
}: UsePlanWebSocketProps) {
  const currentPlanIdRef = useRef<string | null>(null);

  const handlePlanUpdate = useCallback(
    (plan: Plan) => {
      console.log("Plan updated:", plan);
      onPlanUpdate?.(plan);
    },
    [onPlanUpdate]
  );

  const { socket } = useWebSocket({
    onTaskUpdate: () => {}, // Not used here
    onNewMessage: () => {}, // Not used here
  });

  useEffect(() => {
    if (!socket || !planId) return;

    // Leave previous plan room if any
    if (currentPlanIdRef.current && currentPlanIdRef.current !== planId) {
      socket.emit("leave_plan", currentPlanIdRef.current);
    }

    // Join new plan room
    socket.emit("join_plan", planId);
    currentPlanIdRef.current = planId;

    // Listen for plan updates
    socket.on("plan_updated", handlePlanUpdate);

    return () => {
      socket.off("plan_updated", handlePlanUpdate);
      if (currentPlanIdRef.current) {
        socket.emit("leave_plan", currentPlanIdRef.current);
        currentPlanIdRef.current = null;
      }
    };
  }, [socket, planId, handlePlanUpdate]);

  return {
    isConnected: socket?.connected || false,
  };
}
