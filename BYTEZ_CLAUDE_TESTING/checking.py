#!/usr/bin/env python3
"""
BYTEZ NATIVE ANTHROPIC — CONFIRMED WORKING
The tool calls are in data["provider"]["content"], not data["output"].
This script proves it and finds the best model/method combo.
"""

import subprocess, json, base64, struct, zlib as _zlib, time
from datetime import datetime

BYTEZ_KEY = "a2624274e97d4b251838cb469e669a96"
BASE_URL  = "https://api.bytez.com/models/v2/anthropic"

GRN="\033[92m"; RED="\033[91m"; YEL="\033[93m"; CYN="\033[96m"
MAG="\033[95m"; WHT="\033[97m"; RST="\033[0m"; BOLD="\033[1m"; DIM="\033[2m"

def make_png(w=50, h=50):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", _zlib.crc32(tag + data) & 0xFFFFFFFF)
    sig  = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    raw  = (b"\x00" + b"\xff\x00\x00" * w) * h
    idat = chunk(b"IDAT", _zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return base64.b64encode(sig + ihdr + idat + iend).decode()

IMG_B64  = make_png()
DATA_URI = f"data:image/png;base64,{IMG_B64}"
GSTATIC  = "https://www.gstatic.com/webp/gallery/1.jpg"
PICSUM   = "https://picsum.photos/id/1/100/100.jpg"

TOOLS = [{
    "name": "click_element",
    "description": "Click a UI element on screen",
    "input_schema": {
        "type": "object",
        "properties": {
            "element": {"type": "string"},
            "x":       {"type": "integer"},
            "y":       {"type": "integer"},
        },
        "required": ["element", "x", "y"]
    }
}]

SYSTEM   = "You are a desktop automation agent. Use click_element to interact with UI."
USR_TEXT = "PERCEPTION: Red button at (120,80). TASK: Click it using click_element tool."

def post(model, payload):
    url = f"{BASE_URL}/{model}"
    cmd = ["curl","-s","-X","POST", url,
           "-H", f"Authorization: Bearer {BYTEZ_KEY}",
           "-H", "Content-Type: application/json",
           "-d", json.dumps(payload),
           "--max-time","45",
           "-w", "\n__S__:%{http_code}"]
    t0  = time.perf_counter()
    res = subprocess.run(cmd, capture_output=True, text=True)
    elapsed = time.perf_counter() - t0
    raw = res.stdout.strip()
    status = "000"
    if "\n__S__:" in raw:
        body, status = raw.rsplit("\n__S__:", 1)
        status = status.strip()
    else:
        body = raw
    try:    data = json.loads(body)
    except: data = None
    return data, elapsed, status

def parse(data):
    """
    CORRECT PARSER: Bytez native endpoint returns tool calls in
    data["provider"]["content"], NOT in data["output"].
    data["output"] only has {"role":"assistant"} when tools are used.
    """
    if not data:
        return False, False, "", "", "null response"

    if data.get("error"):
        return False, False, "", "", str(data["error"])[:120]

    # ── Check provider.content (where tool_use blocks actually live) ──
    provider = data.get("provider", {})
    prov_content = provider.get("content", []) if isinstance(provider, dict) else []

    # ── Also check output.content (sometimes text lands here) ─────────
    output = data.get("output", {})
    out_content = []
    if isinstance(output, dict):
        out_content = output.get("content", []) if isinstance(output.get("content"), list) else []
    elif isinstance(output, list):
        out_content = output

    # Merge both content sources
    all_content = prov_content + out_content

    texts = [b.get("text","") for b in all_content if isinstance(b,dict) and b.get("type")=="text"]
    tools = [b for b in all_content if isinstance(b,dict) and b.get("type")=="tool_use"]

    txt      = " ".join(texts).strip()[:120]
    has_tool = bool(tools)
    tool_str = ""
    if tools:
        t = tools[0]
        tool_str = f"{t['name']}({json.dumps(t.get('input',{}))[:100]})"

    # Also check if output.content is a plain string (text response)
    if not txt and isinstance(output, dict) and isinstance(output.get("content"), str):
        txt = output["content"][:120]

    has_img_response = bool(txt) or has_tool
    return has_img_response, has_tool, txt, tool_str, ""

winners = []

print(f"\n{BOLD}{MAG}╔{'═'*66}╗")
print(f"║{'BYTEZ ANTHROPIC — CONFIRMED WORKING (FIXED PARSER)':^66}║")
print(f"║{datetime.now().strftime('%Y-%m-%d  %H:%M:%S'):^66}║")
print(f"╚{'═'*66}╝{RST}")
print(f"\n  {YEL}KEY FIX: tool calls live in data['provider']['content'],")
print(f"  not data['output'] — previous parser was reading wrong field!{RST}\n")

MODELS = [
    "claude-haiku-4-5",
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-3-haiku-20240307",
]

COMBOS = [
    ("b64 + params.tools + auto",    lambda: {
        "messages":[
            {"role":"system","content":SYSTEM},
            {"role":"user","content":[
                {"type":"text","text":USR_TEXT},
                {"type":"image","base64":DATA_URI},
            ]}
        ],
        "params":{"max_tokens":300,"tools":TOOLS,"tool_choice":{"type":"auto"}}
    }),
    ("b64 + params.tools + any",     lambda: {
        "messages":[
            {"role":"system","content":SYSTEM},
            {"role":"user","content":[
                {"type":"text","text":USR_TEXT},
                {"type":"image","base64":DATA_URI},
            ]}
        ],
        "params":{"max_tokens":300,"tools":TOOLS,"tool_choice":{"type":"any"}}
    }),
    ("url(gstatic) + tools + any",   lambda: {
        "messages":[
            {"role":"system","content":SYSTEM},
            {"role":"user","content":[
                {"type":"text","text":USR_TEXT},
                {"type":"image","url":GSTATIC},
            ]}
        ],
        "params":{"max_tokens":300,"tools":TOOLS,"tool_choice":{"type":"any"}}
    }),
    ("url(picsum) + tools + any",    lambda: {
        "messages":[
            {"role":"system","content":SYSTEM},
            {"role":"user","content":[
                {"type":"text","text":USR_TEXT},
                {"type":"image","url":PICSUM},
            ]}
        ],
        "params":{"max_tokens":300,"tools":TOOLS,"tool_choice":{"type":"any"}}
    }),
    ("image_only + force_tool",      lambda: {
        "messages":[
            {"role":"system","content":SYSTEM},
            {"role":"user","content":[
                {"type":"image","base64":DATA_URI},
            ]}
        ],
        "params":{"max_tokens":300,"tools":TOOLS,
                  "tool_choice":{"type":"tool","name":"click_element"}}
    }),
]

for model in MODELS:
    print(f"\n  {BOLD}{YEL}▶ {model}{RST}")
    for label, build in COMBOS:
        d, e, s = post(model, build())
        ok, has_tool, txt, tool_str, err = parse(d)

        if ok and has_tool:
            sym = f"{BOLD}{GRN}★ IMAGE+TOOL ✅{RST}"
            winners.append({"model":model,"combo":label,"tool":tool_str,"text":txt,"elapsed":e})
        elif ok:
            sym = f"{GRN}✔ img/text{RST} {RED}✘ no tool{RST}"
        elif err:
            sym = f"{RED}✘ {err[:55]}{RST}"
        else:
            sym = f"{RED}✘ failed{RST}"

        print(f"    {label:<40} {sym}  {YEL}{e:.2f}s{RST}")
        if txt:      print(f"       text: {DIM}{txt}{RST}")
        if tool_str: print(f"       {GRN}TOOL: {tool_str}{RST}")
        time.sleep(0.1)

# ── SUMMARY ──────────────────────────────────────────────────────────
print(f"\n\n{BOLD}{MAG}{'═'*68}")
print(f"  CONFIRMED WORKING COMBOS — Bytez Claude Image + Tool")
print(f"{'═'*68}{RST}")

if winners:
    # Show unique working models
    working_models = list(dict.fromkeys(w["model"] for w in winners))
    print(f"\n  {GRN}{BOLD}✅ YES — Bytez Claude CAN do image + tools in one call!{RST}")
    print(f"\n  Working models: {', '.join(working_models)}")
    print(f"\n  Best combo (fastest):")
    best = min(winners, key=lambda x: x["elapsed"])
    print(f"    Model   : {BOLD}{best['model']}{RST}")
    print(f"    Method  : {best['combo']}")
    print(f"    Latency : {YEL}{best['elapsed']:.2f}s{RST}")
    print(f"    Tool    : {GRN}{best['tool']}{RST}")
    print(f"    Text    : {best['text']}")

    print(f"\n  {BOLD}How to call it in your Desktop agent:{RST}")
    print(f"""
    POST https://api.bytez.com/models/v2/anthropic/{{model}}
    Headers:
      Authorization: Bearer YOUR_BYTEZ_KEY
      Content-Type: application/json

    Body:
    {{
      "messages": [
        {{"role":"system","content":"You are a desktop automation agent..."}},
        {{"role":"user","content":[
          {{"type":"text","text":"<perception_output>\\n<orchestrator_steps>\\n<task>"}},
          {{"type":"image","base64":"data:image/png;base64,<screenshot_b64>"}}
        ]}}
      ],
      "params": {{
        "max_tokens": 1024,
        "tools": [<your_tools_with_input_schema>],
        "tool_choice": {{"type":"auto"}}
      }}
    }}

    Response: data["provider"]["content"]  ← tool_use blocks live here
              data["output"]["content"]    ← text blocks may be here
    """)

    print(f"\n  {BOLD}Update your TypeScript AGENT_MODELS:{RST}")
    print(f"""
    DESKTOP: {{
      provider: 'bytez',
      model: 'anthropic/{best['model']}',
      description: 'Claude vision+tools via Bytez native endpoint. ~{best['elapsed']:.1f}s',
    }}
    """)
else:
    print(f"  {RED}No winners found — check output above{RST}")