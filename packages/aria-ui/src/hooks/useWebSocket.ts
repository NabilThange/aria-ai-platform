import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message, Task } from "@/types";
import { logger } from "@/lib/logger";

interface BrowserLogEvent {
  taskId: string;
  type: 'agent.start' | 'agent.response' | 'tool.call' | 'tool.result' | 'agent.complete' | 'agent.error';
  timestamp: string;
  data: any;
}

interface UseWebSocketProps {
  onTaskUpdate?: (task: Task) => void;
  onNewMessage?: (message: Message) => void;
  onTaskCreated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onBrowserLog?: (log: BrowserLogEvent) => void;
}

export function useWebSocket({
  onTaskUpdate,
  onNewMessage,
  onTaskCreated,
  onTaskDeleted,
  onBrowserLog,
}: UseWebSocketProps = {}) {
  const socketRef = useRef<Socket | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    // Connect to the WebSocket server
    const socket = io({
      path: "/api/proxy/tasks",
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      logger.info({ event: "ws.connected" }, "Connected to WebSocket server");
    });

    socket.on("disconnect", () => {
      logger.warn({ event: "ws.disconnected" }, "Disconnected from WebSocket server");
    });

    socket.on("task_updated", (task: Task) => {
      logger.debug({ event: "ws.task_updated", taskId: task.id, status: task.status }, "Task updated");
      onTaskUpdate?.(task);
    });

    socket.on("new_message", (message: Message) => {
      logger.debug({ event: "ws.new_message", taskId: message.taskId, messageId: message.id }, "New message received");
      onNewMessage?.(message);
    });

    socket.on("task_created", (task: Task) => {
      logger.info({ event: "ws.task_created", taskId: task.id }, "Task created");
      onTaskCreated?.(task);
    });

    socket.on("task_deleted", (taskId: string) => {
      logger.info({ event: "ws.task_deleted", taskId }, "Task deleted");
      onTaskDeleted?.(taskId);
    });

    socket.on("browser_log", (log: BrowserLogEvent) => {
      logger.debug({ event: "ws.browser_log", type: log.type, taskId: log.taskId }, "Browser log received");
      onBrowserLog?.(log);
    });

    socketRef.current = socket;
    return socket;
  }, [onTaskUpdate, onNewMessage, onTaskCreated, onTaskDeleted, onBrowserLog]);

  const joinTask = useCallback(
    (taskId: string) => {
      const socket = socketRef.current || connect();
      if (currentTaskIdRef.current) {
        socket.emit("leave_task", currentTaskIdRef.current);
      }
      socket.emit("join_task", taskId);
      currentTaskIdRef.current = taskId;
      logger.debug({ event: "ws.join_task", taskId }, `Joined task room`);
    },
    [connect],
  );

  const leaveTask = useCallback(() => {
    const socket = socketRef.current;
    if (socket && currentTaskIdRef.current) {
      socket.emit("leave_task", currentTaskIdRef.current);
      logger.debug({ event: "ws.leave_task", taskId: currentTaskIdRef.current }, `Left task room`);
      currentTaskIdRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      currentTaskIdRef.current = null;
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    joinTask,
    leaveTask,
    disconnect,
    isConnected: socketRef.current?.connected || false,
  };
}
