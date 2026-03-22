---
title: Plan
description: A collapsible plan component for displaying AI-generated execution plans with streaming support and shimmer animations.
---

# Plan



The `Plan` component provides a flexible system for displaying AI-generated execution plans with collapsible content. Perfect for showing multi-step workflows, task breakdowns, and implementation strategies with support for streaming content and loading states.

<Preview path="plan" />

## Installation

RUN COMMAND :
npx shadcn@latest add @ai-elements/plan

OR GET CODE :

"use client";

import { Button } from "@repo/shadcn-ui/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/shadcn-ui/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/shadcn-ui/components/ui/collapsible";
import { cn } from "@repo/shadcn-ui/lib/utils";
import { ChevronsUpDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, useContext, useMemo } from "react";

import { Shimmer } from "./shimmer";

interface PlanContextValue {
  isStreaming: boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("Plan components must be used within Plan");
  }
  return context;
};

export type PlanProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
};

export const Plan = ({
  className,
  isStreaming = false,
  children,
  ...props
}: PlanProps) => {
  const contextValue = useMemo(() => ({ isStreaming }), [isStreaming]);

  return (
    <PlanContext.Provider value={contextValue}>
      <Collapsible asChild data-slot="plan" {...props}>
        <Card className={cn("shadow-none", className)}>{children}</Card>
      </Collapsible>
    </PlanContext.Provider>
  );
};

export type PlanHeaderProps = ComponentProps<typeof CardHeader>;

export const PlanHeader = ({ className, ...props }: PlanHeaderProps) => (
  <CardHeader
    className={cn("flex items-start justify-between", className)}
    data-slot="plan-header"
    {...props}
  />
);

export type PlanTitleProps = Omit<
  ComponentProps<typeof CardTitle>,
  "children"
> & {
  children: string;
};

export const PlanTitle = ({ children, ...props }: PlanTitleProps) => {
  const { isStreaming } = usePlan();

  return (
    <CardTitle data-slot="plan-title" {...props}>
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardTitle>
  );
};

export type PlanDescriptionProps = Omit<
  ComponentProps<typeof CardDescription>,
  "children"
> & {
  children: string;
};

export const PlanDescription = ({
  className,
  children,
  ...props
}: PlanDescriptionProps) => {
  const { isStreaming } = usePlan();

  return (
    <CardDescription
      className={cn("text-balance", className)}
      data-slot="plan-description"
      {...props}
    >
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardDescription>
  );
};

export type PlanActionProps = ComponentProps<typeof CardAction>;

export const PlanAction = (props: PlanActionProps) => (
  <CardAction data-slot="plan-action" {...props} />
);

export type PlanContentProps = ComponentProps<typeof CardContent>;

export const PlanContent = (props: PlanContentProps) => (
  <CollapsibleContent asChild>
    <CardContent data-slot="plan-content" {...props} />
  </CollapsibleContent>
);

export type PlanFooterProps = ComponentProps<"div">;

export const PlanFooter = (props: PlanFooterProps) => (
  <CardFooter data-slot="plan-footer" {...props} />
);

export type PlanTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const PlanTrigger = ({ className, ...props }: PlanTriggerProps) => (
  <CollapsibleTrigger asChild>
    <Button
      className={cn("size-8", className)}
      data-slot="plan-trigger"
      size="icon"
      variant="ghost"
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
      <span className="sr-only">Toggle plan</span>
    </Button>
  </CollapsibleTrigger>
);


## Features

* Collapsible content with smooth animations
* Streaming support with shimmer loading states
* Built on shadcn/ui Card and Collapsible components
* TypeScript support with comprehensive type definitions
* Customizable styling with Tailwind CSS
* Responsive design with mobile-friendly interactions
* Keyboard navigation and accessibility support
* Theme-aware with automatic dark mode support
* Context-based state management for streaming

## Props

### `<Plan />`

<TypeTable
  type={{
  isStreaming: {
    description:
      "Whether content is currently streaming. Enables shimmer animations on title and description.",
    type: "boolean",
    default: "false",
  },
  defaultOpen: {
    description: "Whether the plan is expanded by default.",
    type: "boolean",
  },
  "...props": {
    description: "Any other props are spread to the Collapsible component.",
    type: "React.ComponentProps<typeof Collapsible>",
  },
}}
/>

### `<PlanHeader />`

<TypeTable
  type={{
  "...props": {
    description: "Any other props are spread to the CardHeader component.",
    type: "React.ComponentProps<typeof CardHeader>",
  },
}}
/>

### `<PlanTitle />`

<TypeTable
  type={{
  children: {
    description:
      "The title text. Displays with shimmer animation when isStreaming is true.",
    type: "string",
  },
  "...props": {
    description:
      "Any other props (except children) are spread to the CardTitle component.",
    type: 'Omit<React.ComponentProps<typeof CardTitle>, "children">',
  },
}}
/>

### `<PlanDescription />`

<TypeTable
  type={{
  children: {
    description:
      "The description text. Displays with shimmer animation when isStreaming is true.",
    type: "string",
  },
  "...props": {
    description:
      "Any other props (except children) are spread to the CardDescription component.",
    type: 'Omit<React.ComponentProps<typeof CardDescription>, "children">',
  },
}}
/>

### `<PlanTrigger />`

<TypeTable
  type={{
  "...props": {
    description:
      "Any other props are spread to the CollapsibleTrigger component. Renders as a Button with chevron icon.",
    type: "React.ComponentProps<typeof CollapsibleTrigger>",
  },
}}
/>

### `<PlanContent />`

<TypeTable
  type={{
  "...props": {
    description: "Any other props are spread to the CardContent component.",
    type: "React.ComponentProps<typeof CardContent>",
  },
}}
/>

### `<PlanFooter />`

<TypeTable
  type={{
  "...props": {
    description: "Any other props are spread to the div element.",
    type: 'React.ComponentProps<"div">',
  },
}}
/>

### `<PlanAction />`

<TypeTable
  type={{
  "...props": {
    description: "Any other props are spread to the CardAction component.",
    type: "React.ComponentProps<typeof CardAction>",
  },
}}
/>
