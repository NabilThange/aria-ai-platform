"use client";

import React, { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ChatContainer } from "@/components/messages/ChatContainer";
import { DesktopContainer } from "@/components/ui/desktop-container";
import { useChatSession } from "@/hooks/useChatSession";
import { useScrollScreenshot } from "@/hooks/useScrollScreenshot";
import { useParams, useRouter } from "next/navigation";
import { Role, TaskStatus, Task } from "@/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalCircle01Icon,
  WavingHand01Icon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { VirtualDesktopStatus } from "@/components/VirtualDesktopStatusHeader";
import { PlanningContainer } from "@/components/planner/PlanningContainer";
import { fetchTaskById } from "@/utils/taskUtils";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [desktopMode, setDesktopMode] = useState<"online" | "offline">("offline"); // Default to offline for local testing

  // Load desktop mode preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("desktopMode") as "online" | "offline" | null;
    if (savedMode) {
      setDesktopMode(savedMode);
    }
  }, []);
  const {
    messages,
    groupedMessages,
    taskStatus,
    control,
    input,
    setInput,
    isLoading,
    isLoadingSession,
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
    handleAddMessage,
    handleTakeOverTask,
    handleResumeTask,
    handleCancelTask,
    currentTaskId,
  } = useChatSession({ initialTaskId: taskId });

  // Fetch task details to check if planning is enabled
  useEffect(() => {
    const loadTaskDetails = async () => {
      const task = await fetchTaskById(taskId);
      setTaskDetails(task);
    };
    loadTaskDetails();
  }, [taskId]);

  // Check if task has planning enabled
  const hasPlan = taskDetails?.planningEnabled === true;

  // Determine if task is inactive (show screenshot) or active (show VNC)
  function isTaskInactive(): boolean {
    return (
      taskStatus === TaskStatus.COMPLETED ||
      taskStatus === TaskStatus.FAILED ||
      taskStatus === TaskStatus.CANCELLED
    );
  }

  // Determine if user can take control
  function canTakeOver(): boolean {
    return control === Role.ASSISTANT && taskStatus === TaskStatus.RUNNING;
  }

  // Determine if user has control or is in takeover mode
  function hasUserControl(): boolean {
    return (
      control === Role.USER &&
      (taskStatus === TaskStatus.RUNNING ||
        taskStatus === TaskStatus.NEEDS_HELP)
    );
  }

  // Determine if task can be cancelled
  function canCancel(): boolean {
    return (
      taskStatus === TaskStatus.RUNNING || taskStatus === TaskStatus.NEEDS_HELP
    );
  }

  // Determine VNC mode - interactive when user has control, view-only otherwise
  function vncViewOnly(): boolean {
    return !hasUserControl();
  }

  // Use scroll screenshot hook for inactive tasks
  const { currentScreenshot } = useScrollScreenshot({
    messages,
    scrollContainerRef: chatContainerRef,
  });

  // For inactive tasks, auto-load all messages for proper screenshot navigation
  useEffect(() => {
    const inactive = isTaskInactive();
    if (inactive && hasMoreMessages && !isLoadingMoreMessages) {
      loadMoreMessages();
    }
  }, [
    taskStatus,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
  ]);

  // Map each message ID to its flat index for screenshot scroll logic
  const messageIdToIndex = React.useMemo(() => {
    const map: Record<string, number> = {};
    messages.forEach((msg, idx) => {
      map[msg.id] = idx;
    });
    return map;
  }, [messages]);

  // Redirect if task ID doesn't match current task
  useEffect(() => {
    if (currentTaskId && currentTaskId !== taskId) {
      router.push(`/tasks/${currentTaskId}`);
    }
  }, [currentTaskId, taskId, router]);

  return (
    <div className="flex h-screen flex-col">
      <Header />

      <main className="m-2 flex-1 overflow-hidden px-2 py-4">
        <div className="grid h-full grid-cols-7 gap-4">
          {/* Main container */}
          <div className="col-span-4 h-full">
            <DesktopContainer
              screenshot={isTaskInactive() ? currentScreenshot : null}
              viewOnly={vncViewOnly()}
              mode={desktopMode}
              status={
                (() => {
                  if (
                    taskStatus === TaskStatus.RUNNING &&
                    control === Role.USER
                  )
                    return "user_control";
                  if (taskStatus === TaskStatus.RUNNING) return "running";
                  if (taskStatus === TaskStatus.NEEDS_HELP)
                    return "needs_attention";
                  if (taskStatus === TaskStatus.FAILED) return "failed";
                  if (taskStatus === TaskStatus.CANCELLED) return "canceled";
                  if (taskStatus === TaskStatus.COMPLETED) return "completed";
                  return "pending";
                })() as VirtualDesktopStatus
              }
            >
              {/* Desktop Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={desktopMode === "online" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setDesktopMode("online");
                    localStorage.setItem("desktopMode", "online");
                  }}
                  className="text-xs"
                >
                  Online
                </Button>
                <Button
                  variant={desktopMode === "offline" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setDesktopMode("offline");
                    localStorage.setItem("desktopMode", "offline");
                  }}
                  className="text-xs"
                >
                  Local
                </Button>
              </div>

              {/* Task Control Buttons */}
              {canTakeOver() && (
                <Button
                  onClick={handleTakeOverTask}
                  variant="default"
                  size="sm"
                  icon={
                    <HugeiconsIcon
                      icon={WavingHand01Icon}
                      className="h-5 w-5"
                    />
                  }
                >
                  Take Over
                </Button>
              )}
              {hasUserControl() && (
                <Button onClick={handleResumeTask} variant="default" size="sm">
                  Proceed
                </Button>
              )}
              {canCancel() && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <HugeiconsIcon
                        icon={MoreVerticalCircle01Icon}
                        className="text-bytebot-bronze-light-11 h-5 w-5"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleCancelTask}
                      className="text-red-600 focus:bg-red-50"
                    >
                      Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DesktopContainer>
          </div>

          {/* Chat and Planning Area */}
          <div className="col-span-3 flex h-full flex-col overflow-hidden">
            {/* Show planning container if task is pending and has planning */}
            {hasPlan && taskStatus === TaskStatus.PENDING && taskDetails && (
              <div className="hide-scrollbar mb-4 max-h-[60vh] overflow-y-auto px-2">
                <PlanningContainer
                  taskId={taskId}
                  taskDescription={taskDetails.description}
                  model={taskDetails.model.name}
                  onPlanApproved={() => {
                    console.log("Plan approved");
                  }}
                  onPlanCancelled={() => {
                    router.push("/dashboard");
                  }}
                />
              </div>
            )}
            
            {/* Messages scrollable area */}
            <div
              ref={chatContainerRef}
              className="hide-scrollbar flex-1 overflow-y-auto px-4"
            >
              <ChatContainer
                scrollRef={chatContainerRef}
                messageIdToIndex={messageIdToIndex}
                taskId={taskId}
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                handleAddMessage={handleAddMessage}
                groupedMessages={groupedMessages}
                taskStatus={taskStatus}
                control={control}
                isLoadingSession={isLoadingSession}
                isLoadingMoreMessages={isLoadingMoreMessages}
                hasMoreMessages={hasMoreMessages}
                loadMoreMessages={loadMoreMessages}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
