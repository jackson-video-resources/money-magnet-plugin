// The Money Magnet mod: the member builds their scorecard Money Magnet in chat with Claude Code, and the
// mod keeps it easy to follow. A pane shows the seven workshop steps and what they've chosen so far, a line
// above the prompt says which step they're on, Claude's questions carry the step, and every turn tells
// Claude where they are. The connector (the plugin's MCP server) does the saving; this file only reads.
const BASE = "https://lewiswjackson.com";
const PANE = "money-magnet";
const NAMES = [
  "Your business",
  "Your video",
  "Your routes",
  "Your questions",
  "Your page",
  "Live",
  "Video links",
];
const WHAT = {
  1: "what you sell, who it is for, and what someone needs just before they buy",
  2: "the video that leads into your scorecard",
  3: "where each result sends people, lowest score first",
  4: "the questions and the results",
  5: "your page: the words, colours, font and logo",
  6: "putting it live on your own site and checking it",
  7: "tracked links and QR codes for your next video",
};

// Keys that should never sit in a project file (Kit, Mailchimp, Resend, HubSpot, Stripe, OpenAI and the like).
const SECRET =
  /(kit_[a-f0-9]{20,}|\b[a-f0-9]{32}-us\d{1,2}\b|\bre_[A-Za-z0-9_]{20,}|pat-(na|eu)1-[a-f0-9-]{30,}|\bsk[-_](live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{20,})/;

// What the mod knows: the member's key (from the plugin settings) and their latest progress.
let key = "";
let prog = null;
let note = "";

async function refresh($) {
  if (!key) return;
  try {
    const r = await $.http.fetch(`${BASE}/scorecards/edit/${key}/progress`);
    if (r.ok) {
      prog = JSON.parse(r.text);
      note = "";
    } else
      note =
        r.status === 404
          ? "That workshop key was not found. Check it on your workshop page."
          : "";
  } catch {}
  $.ui.invalidate("ui.render");
}
// Starts a turn as if the member typed it. Not awaited: it resolves only once the turn starts.
function ask($, text) {
  $.prompt.submit({ text, asUser: true }).catch(() => {});
}
function nextStep() {
  if (!prog) return "Let’s start my Money Magnet.";
  if (prog.step > 7) return "My Money Magnet is set up. What should I do next?";
  return `Let’s do step ${prog.step} of my Money Magnet: ${NAMES[prog.step - 1]}.`;
}
function where() {
  if (!prog) return "";
  return prog.step > 7 ? "all 7 steps done" : `step ${prog.step} of 7: ${NAMES[prog.step - 1]}`;
}

export function register(on, options = {}) {
  key = (String(options.workshop_key || "").match(/[a-f0-9]{32}/) || [""])[0];

  on("session.start", async ($, e, next) => {
    await refresh($);
    const cmds = [
      [
        "magnet",
        "Show your Money Magnet: the seven steps and what you have chosen",
      ],
      ["magnet-next", "Do the next step of your Money Magnet"],
      ["magnet-check", "Check your live Money Magnet link"],
      [
        "magnet-numbers",
        "Your Money Magnet numbers: visits, finishes, sign-ups, clicks",
      ],
      ["magnet-video", "Tracked links and QR codes for your next video"],
    ];
    for (const [name, description] of cmds) {
      try {
        await $.command.register(name === 'magnet' ? { name, description, immediate: true } : { name, description });
      } catch {}
    }
    if (key) {
      try {
        await $.ui.open({ id: PANE, title: "Money Magnet" });
      } catch {}
    }
    return next(e);
  });

  on("command.run", { command: "magnet" }, async ($) => {
    refresh($);
    await $.ui.open({
      id: PANE,
      title: "Money Magnet",
      focus: true,
      closeOnEscape: true,
    });
    return {};
  });
  on(
    "command.run",
    { command: "magnet-next" },
    async ($) => (ask($, nextStep()), {}),
  );
  on(
    "command.run",
    { command: "magnet-check" },
    async ($) => (
      ask(
        $,
        "Check my live Money Magnet link and tell me what is working and what is not.",
      ),
      {}
    ),
  );
  on(
    "command.run",
    { command: "magnet-numbers" },
    async ($) => (
      ask(
        $,
        "Show me my Money Magnet numbers for the last 30 days, as a short table.",
      ),
      {}
    ),
  );
  on(
    "command.run",
    { command: "magnet-video" },
    async ($) => (
      ask($, "Set up the tracked links and QR codes for my next video."),
      {}
    ),
  );

  // Every turn: Claude knows the step and how to put choices to the member.
  on("prompt.submit", async ($, e, next) => {
    if (!key) return next(e);
    const done = prog
      ? prog.steps
          .filter((s) => s.done)
          .map((s) => s.n)
          .join(", ") || "none"
      : "unknown";
    const line = `[Money Magnet workshop] ${prog ? `The member is on ${where()}${prog.step <= 7 ? ` (${WHAT[prog.step]})` : ""}. Steps done: ${done}.` : "Call workshop_progress to see where the member is."} Use the money-magnet tools and save each answer as soon as they give it. For every decision, use AskUserQuestion with 2 to 4 concrete options built from what they have told you, your recommendation first. One question at a time, plain words, short messages.`;
    return next({ ...e, context: [...(e.context ?? []), line] });
  });

  // After any money-magnet tool runs, or a turn ends, pull the latest progress so the pane stays right.
  on("tool.call", async ($, e, next) => {
    // Keep API keys out of project files: the site's code is public on Vercel and often pushed to GitHub.
    if (
      (e.tool === "Write" || e.tool === "Edit") &&
      !/(^|[\\/])\.env[^\\/]*$/.test(e.file_path || "")
    ) {
      if (SECRET.test(String(e.content ?? e.new_string ?? "")))
        return {
          deny: "That looks like an API key going into a project file. Keys must not sit in files that get deployed or pushed. Add it to Vercel instead with `vercel env add NAME production` (and `.env.local` for local tests) and read it from process.env. Tell the member in plain words why.",
        };
    }
    const out = await next(e);
    if (String(e.tool || "").includes("money-magnet")) refresh($);
    return out;
  });
  on("turn.complete", async ($, e, next) => {
    refresh($);
    return next(e);
  });

  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e);
    const { Box, Text, Button, Link } = $.ui.resolve(e);
    const rows = [];
    if (!key) {
      rows.push(
        Text({ bold: true, children: ["Money Magnet"] }),
        Text({
          children: [
            "Add your workshop key to start. Run /config, find Money Magnet: Workshop key, and paste the key from your workshop page.",
          ],
        }),
        Link({
          href: `${BASE}/workshop/app`,
          label: "Open your workshop page",
        }),
      );
      return Box({ flexDirection: "column", gap: 1, children: rows });
    }
    if (!prog) {
      rows.push(Text({ children: [note || "Loading your Money Magnet..."] }));
      return Box({ flexDirection: "column", children: rows });
    }
    rows.push(
      Box({
        flexDirection: "row",
        gap: 1,
        children: [
          Text({ bold: true, children: ["Your Money Magnet"] }),
          Text({ dimColor: true, children: [where()] }),
        ],
      }),
    );
    rows.push(
      Box({
        flexDirection: "column",
        children: prog.steps.map((s) =>
          Text({
            key: "s" + s.n,
            bold: s.n === prog.step,
            color: s.done ? "green" : undefined,
            dimColor: !s.done && s.n !== prog.step,
            children: [
              `${s.done ? "✓" : s.n === prog.step ? "→" : " "} ${s.n}. ${s.name}`,
            ],
          }),
        ),
      }),
    );
    const facts = [];
    if (prog.business?.sells)
      facts.push(
        `Sells: ${prog.business.sells}${prog.business.price ? ` (${prog.business.price})` : ""}`,
      );
    if (prog.video)
      facts.push(
        `Video: ${prog.video.video}`,
        `Scorecard: ${prog.video.scorecard}`,
      );
    if (prog.routes?.length)
      facts.push(`Routes: ${prog.routes.map((r) => r.name).join(" → ")}`);
    if (prog.sums?.line) facts.push(`One video, rough sums: ${prog.sums.line}`);
    if (facts.length)
      rows.push(
        Box({
          flexDirection: "column",
          children: facts.map((f, i) =>
            Text({ key: "f" + i, wrap: "wrap", children: [f] }),
          ),
        }),
      );
    if (prog.live_link)
      rows.push(
        Box({
          flexDirection: "row",
          gap: 1,
          children: [
            Text({
              children: [prog.verified ? "Live:" : "Built, not checked yet:"],
            }),
            Link({ href: prog.live_link, label: prog.live_link }),
          ],
        }),
      );
    rows.push(
      Box({
        flexDirection: "row",
        gap: 2,
        children: [
          Button({
            key: "next",
            label: prog.step > 7 ? "What next" : "Do this step",
            hotkey: "n",
            autoFocus: true,
            onPress: () => ask($, nextStep()),
          }),
          Button({
            key: "refresh",
            label: "Refresh",
            hotkey: "r",
            plain: true,
            dimColor: true,
            onPress: () => refresh($),
          }),
        ],
      }),
    );
    rows.push(Link({ href: prog.editor, label: "See it in the editor" }));
    return Box({ flexDirection: "column", gap: 1, children: rows });
  });

  // One line above the prompt, so the member always knows where they are.
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const theirs = await next(e);
    if (!key || !prog) return theirs;
    const { Box, Text } = $.ui.resolve(e);
    const mine = Text({
      dimColor: true,
      children: [`Money Magnet · ${where()} · /magnet-next to carry on`],
    });
    return theirs
      ? Box({ flexDirection: "column", children: [mine, theirs] })
      : mine;
  });

  // Claude's question cards say which step the choice is for.
  on("ui.render", { component: "AskUserQuestion" }, async ($, e, next) => {
    const theirs = await next(e);
    if (!key || !prog || prog.step > 7) return theirs;
    const { Box, Text } = $.ui.resolve(e);
    return Box({
      flexDirection: "column",
      children: [
        Text({
          bold: true,
          color: "yellow",
          children: [`Money Magnet · ${where()}`],
        }),
        theirs,
      ],
    });
  });

  on("ui.render", { component: "Spinner" }, async ($, e, next) => {
    if (!key || !prog || prog.step > 7) return next(e);
    return next({
      ...e,
      props: {
        ...e.props,
        suffix: ` · building your Money Magnet, ${where()}…`,
      },
    });
  });
}
