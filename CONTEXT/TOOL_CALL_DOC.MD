---
title: Tool
description: A collapsible component for displaying tool invocation details in AI chatbot interfaces.
---

# Tool



The `Tool` component displays a collapsible interface for showing/hiding tool details. It is designed to take the `ToolUIPart` type from the AI SDK and display it in a collapsible interface.

Example Code:
"use client";

import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";
import { CheckIcon, XIcon } from "lucide-react";
import { nanoid } from "nanoid";

const handleReject = () => {
  // In production, call addConfirmationResponse
};

const handleAccept = () => {
  // In production, call addConfirmationResponse
};

const toolCall: ToolUIPart = {
  errorText: undefined,
  input: {
    database: "analytics",
    params: ["2024-01-01"],
    query: "SELECT COUNT(*) FROM users WHERE created_at >= ?",
  },
  output: `| User ID | Name | Email | Created At |
|---------|------|-------|------------|
| 1 | John Doe | john@example.com | 2024-01-15 |
| 2 | Jane Smith | jane@example.com | 2024-01-20 |
| 3 | Bob Wilson | bob@example.com | 2024-02-01 |
| 4 | Alice Brown | alice@example.com | 2024-02-10 |
| 5 | Charlie Davis | charlie@example.com | 2024-02-15 |`,
  state: "output-available" as const,
  toolCallId: nanoid(),
  type: "tool-database_query" as const,
};

const Example = () => (
  <div className="space-y-4" style={{ minHeight: "1400px" }}>
    {/* 1. input-streaming: Pending */}
    <Tool defaultOpen>
      <ToolHeader
        state="input-streaming"
        title="database_query"
        type="tool-database_query"
      />
      <ToolContent>
        <ToolInput input={{}} />
      </ToolContent>
    </Tool>

    {/* 2. approval-requested: Awaiting Approval */}
    <Tool>
      <ToolHeader
        state={"approval-requested" as ToolUIPart["state"]}
        title="database_query"
        type="tool-database_query"
      />
      <ToolContent>
        <ToolInput input={toolCall.input} />
        <Confirmation approval={{ id: nanoid() }} state="approval-requested">
          <ConfirmationTitle>
            <ConfirmationRequest>
              This tool will execute a query on the production database.
            </ConfirmationRequest>
            <ConfirmationAccepted>
              <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
              <span>Accepted</span>
            </ConfirmationAccepted>
            <ConfirmationRejected>
              <XIcon className="size-4 text-destructive" />
              <span>Rejected</span>
            </ConfirmationRejected>
          </ConfirmationTitle>
          <ConfirmationActions>
            <ConfirmationAction onClick={handleReject} variant="outline">
              Reject
            </ConfirmationAction>
            <ConfirmationAction onClick={handleAccept} variant="default">
              Accept
            </ConfirmationAction>
          </ConfirmationActions>
        </Confirmation>
      </ToolContent>
    </Tool>

    {/* 3. approval-responded: Responded */}
    <Tool>
      <ToolHeader
        state={"approval-responded" as ToolUIPart["state"]}
        title="database_query"
        type="tool-database_query"
      />
      <ToolContent>
        <ToolInput input={toolCall.input} />
        <Confirmation
          approval={{ approved: true, id: nanoid() }}
          state="approval-responded"
        >
          <ConfirmationTitle>
            <ConfirmationRequest>
              This tool will execute a query on the production database.
            </ConfirmationRequest>
            <ConfirmationAccepted>
              <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
              <span>Accepted</span>
            </ConfirmationAccepted>
            <ConfirmationRejected>
              <XIcon className="size-4 text-destructive" />
              <span>Rejected</span>
            </ConfirmationRejected>
          </ConfirmationTitle>
        </Confirmation>
      </ToolContent>
    </Tool>

    {/* 4. input-available: Running */}
    <Tool>
      <ToolHeader
        state="input-available"
        title="database_query"
        type="tool-database_query"
      />
      <ToolContent>
        <ToolInput input={toolCall.input} />
      </ToolContent>
    </Tool>

    {/* 5. output-available: Completed */}
    <Tool>
      <ToolHeader state={toolCall.state} type={toolCall.type} />
      <ToolContent>
        <ToolInput input={toolCall.input} />
        <Confirmation
          approval={{ approved: true, id: nanoid() }}
          state="output-available"
        >
          <ConfirmationTitle>
            <ConfirmationRequest>
              This tool will execute a query on the production database.
            </ConfirmationRequest>
            <ConfirmationAccepted>
              <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
              <span>Accepted</span>
            </ConfirmationAccepted>
            <ConfirmationRejected>
              <XIcon className="size-4 text-destructive" />
              <span>Rejected</span>
            </ConfirmationRejected>
          </ConfirmationTitle>
        </Confirmation>
        {toolCall.state === "output-available" && (
          <ToolOutput errorText={toolCall.errorText} output={toolCall.output} />
        )}
      </ToolContent>
    </Tool>

    {/* 6. output-error: Error */}
    <Tool>
      <ToolHeader
        state="output-error"
        title="database_query"
        type="tool-database_query"
      />
      <ToolContent>
        <ToolInput input={toolCall.input} />
        <ToolOutput
          errorText="Connection timeout: Unable to reach database server"
          output={undefined}
        />
      </ToolContent>
    </Tool>

    {/* 7. output-denied: Denied */}
    <Tool>
      <ToolHeader
        state={"output-denied" as ToolUIPart["state"]}
        title="database_query"
        type="tool-database_query"
      />
      <ToolContent>
        <ToolInput input={toolCall.input} />
        <Confirmation
          approval={{
            approved: false,
            id: nanoid(),
            reason: "Query could impact production performance",
          }}
          state="output-denied"
        >
          <ConfirmationTitle>
            <ConfirmationRequest>
              This tool will execute a query on the production database.
            </ConfirmationRequest>
            <ConfirmationAccepted>
              <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
              <span>Accepted</span>
            </ConfirmationAccepted>
            <ConfirmationRejected>
              <XIcon className="size-4 text-destructive" />
              <span>Rejected: Query could impact production performance</span>
            </ConfirmationRejected>
          </ConfirmationTitle>
        </Confirmation>
      </ToolContent>
    </Tool>
  </div>
);

export default Example;

## Installation

run cli command:
npx shadcn@latest add @ai-elements/tool

OR MANUALLY ADD THIS EXACT CODE FILE:
"use client";

import { Badge } from "@repo/shadcn-ui/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/shadcn-ui/components/ui/collapsible";
import { cn } from "@repo/shadcn-ui/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Completed",
  "output-denied": "Denied",
  "output-error": "Error",
};

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
  "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
  "input-available": <ClockIcon className="size-4 animate-pulse" />,
  "input-streaming": <CircleIcon className="size-4" />,
  "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  "output-error": <XCircleIcon className="size-4 text-red-600" />,
};

export const getStatusBadge = (status: ToolPart["state"]) => (
  <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title ?? derivedName}</span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};


## Usage in AI SDK

Build a simple stateful weather app that renders the last message in a tool using [`useChat`](/docs/reference/ai-sdk-ui/use-chat).

Add the following component to your frontend:

```tsx title="app/page.tsx"
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

type WeatherToolInput = {
  location: string;
  units: "celsius" | "fahrenheit";
};

type WeatherToolOutput = {
  location: string;
  temperature: string;
  conditions: string;
  humidity: string;
  windSpeed: string;
  lastUpdated: string;
};

type WeatherToolUIPart = ToolUIPart<{
  fetch_weather_data: {
    input: WeatherToolInput;
    output: WeatherToolOutput;
  };
}>;

const Example = () => {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/weather",
    }),
  });

  const handleWeatherClick = () => {
    sendMessage({ text: "Get weather data for San Francisco in fahrenheit" });
  };

  const latestMessage = messages[messages.length - 1];
  const weatherTool = latestMessage?.parts?.find(
    (part) => part.type === "tool-fetch_weather_data"
  ) as WeatherToolUIPart | undefined;

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="space-y-4">
          <Button onClick={handleWeatherClick} disabled={status !== "ready"}>
            Get Weather for San Francisco
          </Button>

          {weatherTool && (
            <Tool defaultOpen={true}>
              <ToolHeader
                type="tool-fetch_weather_data"
                state={weatherTool.state}
              />
              <ToolContent>
                <ToolInput input={weatherTool.input} />
                <ToolOutput
                  output={
                    <MessageResponse>
                      {formatWeatherResult(weatherTool.output)}
                    </MessageResponse>
                  }
                  errorText={weatherTool.errorText}
                />
              </ToolContent>
            </Tool>
          )}
        </div>
      </div>
    </div>
  );
};

function formatWeatherResult(result: WeatherToolOutput): string {
  return `**Weather for ${result.location}**

**Temperature:** ${result.temperature}  
**Conditions:** ${result.conditions}  
**Humidity:** ${result.humidity}  
**Wind Speed:** ${result.windSpeed}  

*Last updated: ${result.lastUpdated}*`;
}

export default Example;
```

Add the following route to your backend:

```ts title="app/api/weather/route.tsx"
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "openai/gpt-4o",
    messages: await convertToModelMessages(messages),
    tools: {
      fetch_weather_data: {
        description: "Fetch weather information for a specific location",
        parameters: z.object({
          location: z
            .string()
            .describe("The city or location to get weather for"),
          units: z
            .enum(["celsius", "fahrenheit"])
            .default("celsius")
            .describe("Temperature units"),
        }),
        inputSchema: z.object({
          location: z.string(),
          units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
        }),
        execute: async ({ location, units }) => {
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const temp =
            units === "celsius"
              ? Math.floor(Math.random() * 35) + 5
              : Math.floor(Math.random() * 63) + 41;

          return {
            location,
            temperature: `${temp}°${units === "celsius" ? "C" : "F"}`,
            conditions: "Sunny",
            humidity: `12%`,
            windSpeed: `35 ${units === "celsius" ? "km/h" : "mph"}`,
            lastUpdated: new Date().toLocaleString(),
          };
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
```

## Features

* Collapsible interface for showing/hiding tool details
* Visual status indicators with icons and badges
* Support for multiple tool execution states (pending, running, completed, error)
* Formatted parameter display with JSON syntax highlighting
* Result and error handling with appropriate styling
* Composable structure for flexible layouts
* Accessible keyboard navigation and screen reader support
* Consistent styling that matches your design system
* Auto-opens completed tools by default for better UX

## Examples

### Input Streaming (Pending)

Shows a tool in its initial state while parameters are being processed.

<Preview path="tool-input-streaming" />

### Input Available (Running)

Shows a tool that's actively executing with its parameters.

<Preview path="tool-input-available" />

### Output Available (Completed)

Shows a completed tool with successful results. Opens by default to show the results. In this instance, the output is a JSON object, so we can use the `CodeBlock` component to display it.

<Preview path="tool-output-available" />

### Output Error

Shows a tool that encountered an error during execution. Opens by default to display the error.

<Preview path="tool-output-error" />

## Props

### `<Tool />`

<TypeTable
  type={{
  "...props": {
    description:
      "Any other props are spread to the root Collapsible component.",
    type: "React.ComponentProps<typeof Collapsible>",
  },
}}
/>

### `<ToolHeader />`

<TypeTable
  type={{
  title: {
    description: "Custom title to display instead of the derived tool name.",
    type: "string",
  },
  type: {
    description: "The type/name of the tool.",
    type: 'ToolUIPart["type"] | DynamicToolUIPart["type"]',
    required: true,
  },
  state: {
    description:
      "The current state of the tool (input-streaming, input-available, output-available, or output-error).",
    type: 'ToolUIPart["state"] | DynamicToolUIPart["state"]',
    required: true,
  },
  toolName: {
    description:
      'Required when type is "dynamic-tool" to specify the tool name.',
    type: "string",
  },
  className: {
    description: "Additional CSS classes to apply to the header.",
    type: "string",
  },
  "...props": {
    description: "Any other props are spread to the CollapsibleTrigger.",
    type: "React.ComponentProps<typeof CollapsibleTrigger>",
  },
}}
/>

### `<ToolContent />`

<TypeTable
  type={{
  "...props": {
    description: "Any other props are spread to the CollapsibleContent.",
    type: "React.ComponentProps<typeof CollapsibleContent>",
  },
}}
/>

### `<ToolInput />`

<TypeTable
  type={{
  input: {
    description:
      "The input parameters passed to the tool, displayed as formatted JSON.",
    type: 'ToolUIPart["input"]',
  },
  "...props": {
    description: "Any other props are spread to the underlying div.",
    type: 'React.ComponentProps<"div">',
  },
}}
/>

### `<ToolOutput />`

<TypeTable
  type={{
  output: {
    description: "The output/result of the tool execution.",
    type: "React.ReactNode",
  },
  errorText: {
    description: "An error message if the tool execution failed.",
    type: 'ToolUIPart["errorText"]',
  },
  "...props": {
    description: "Any other props are spread to the underlying div.",
    type: 'React.ComponentProps<"div">',
  },
}}
/>

## Type Exports

### `ToolPart`

Union type representing both static and dynamic tool UI parts.

```tsx
type ToolPart = ToolUIPart | DynamicToolUIPart;
```

## Utilities

### `getStatusBadge`

Returns a Badge component with icon and label based on tool state.

```tsx
import { getStatusBadge } from "@/components/ai-elements/tool";

// Returns a Badge with appropriate icon and label
const badge = getStatusBadge("output-available");
```

Supported states:

* `input-streaming` - "Pending"
* `input-available` - "Running"
* `approval-requested` - "Awaiting Approval"
* `approval-responded` - "Responded"
* `output-available` - "Completed"
* `output-error` - "Error"
* `output-denied` - "Denied"
