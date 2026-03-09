import { useState, useCallback } from "react";
import { Plan, PlanStatus } from "@/types/planning.types";

interface UsePlannerProps {
  taskId: string;
}

export function usePlanner({ taskId }: UsePlannerProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlan = useCallback(
    async (taskDescription: string, model: string) => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("Creating plan with:", { taskId, taskDescription, model });
        
        const response = await fetch("/api/plans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId,
            taskDescription,
            model,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Plan creation failed:", errorText);
          throw new Error(`Failed to create plan: ${errorText}`);
        }

        const createdPlan = await response.json();
        setPlan(createdPlan);
        return createdPlan;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Error in createPlan:", err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [taskId]
  );

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/plans/task/${taskId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setPlan(null);
          return null;
        }
        throw new Error("Failed to fetch plan");
      }

      // Check if response has content before parsing
      const text = await response.text();
      if (!text || text.trim() === '') {
        setPlan(null);
        return null;
      }

      const fetchedPlan = JSON.parse(text);
      setPlan(fetchedPlan);
      return fetchedPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      // Don't set error for JSON parse errors on empty responses
      if (!(err instanceof SyntaxError)) {
        setError(errorMessage);
      }
      setPlan(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  const approvePlan = useCallback(
    async (planId: string, pathId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/plans/${planId}/approve`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pathId }),
        });

        if (!response.ok) {
          throw new Error("Failed to approve plan");
        }

        const approvedPlan = await response.json();
        setPlan(approvedPlan);
        return approvedPlan;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const cancelPlan = useCallback(async (planId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/plans/${planId}/cancel`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel plan");
      }

      const cancelledPlan = await response.json();
      setPlan(cancelledPlan);
      return cancelledPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStep = useCallback(
    async (
      stepId: string,
      updates: { action?: string; command?: string }
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/plans/steps/${stepId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update step");
        }

        // Refetch the plan to get updated data
        await fetchPlan();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPlan]
  );

  const isPlanPending = plan?.status === PlanStatus.PENDING;
  const isPlanApproved = plan?.status === PlanStatus.APPROVED;
  const isPlanExecuting = plan?.status === PlanStatus.EXECUTING;
  const isPlanCompleted = plan?.status === PlanStatus.COMPLETED;
  const isPlanFailed = plan?.status === PlanStatus.FAILED;

  return {
    plan,
    isLoading,
    error,
    createPlan,
    fetchPlan,
    approvePlan,
    cancelPlan,
    updateStep,
    isPlanPending,
    isPlanApproved,
    isPlanExecuting,
    isPlanCompleted,
    isPlanFailed,
  };
}
