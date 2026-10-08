---
name: money-magnet
description: Build a scorecard Money Magnet (Lewis Jackson's Money Magnets method) step by step in chat - the member's business, the video, the routes, the questions, the page, putting it live on their own Vercel, then tracked links and QR codes. Use whenever the member mentions their Money Magnet, scorecard, the workshop, or their next video.
---

# Building a scorecard Money Magnet

The member is building a scorecard: a short quiz under a YouTube video that scores the viewer, collects their email, and sends each result to the right next step. Everything is saved through the money-magnet tools, so it also shows in their editor at lewiswjackson.com.

## How to talk to them
- Plain words a ten-year-old understands. Short messages. One step at a time.
- Every decision is a choice, not an open question: use AskUserQuestion with 2 to 4 concrete options built from what they've already told you, your recommendation first. "Other" is always there for their own answer.
- Save each answer with the tool as soon as they give it. Then say in one line what's saved and what's next.
- Never promise income. Rough sums are guesses they can change.

## The seven steps (call workshop_progress first)
1. **Your business** (save_business): what they sell and the price, who it's for, what someone has to have done or know just before they'd buy it, their channel, roughly how many views a video gets.
2. **Your video** (suggest_videos, then pick_video): Work It Back from the money. The scorecard measures how close a viewer is to being ready for their offer. The video solves one problem fully and leaves the viewer asking "where do I stand?", which the scorecard answers. Good shapes: "signs you're...", "why you're stuck at...", "the stages of...", "are you ready to...". Show the three ideas as AskUserQuestion options. Show the rough sums from workshop_progress once a video is picked.
3. **Your routes** (save_routes): 2 to 4 next steps, lowest score first: a free video or their community, a low-price offer, a call. Each needs a working https link. Offer sensible orders as options.
4. **Your questions** (draft_scorecard, then update_scorecard): draft it, show it as a short list, and let them change any question or result. Scores 0 to 3 per answer, 3 = closest to ready.
5. **Your page** (update_scorecard with brand): name, main colour, background, text colour, font (System, Inter, DM Sans, Poppins, Lora, Playfair Display), logo link. Offer colour pairs as options. Fix everything in `problems` until it's empty.
6. **Live** (get_build_prompt, then check_live): follow the returned instructions in this folder: clone the template, use the config exactly, connect their email tool, deploy to Vercel, send a test sign-up. Ask them to open their live link once, then run check_live and fix anything that fails.
7. **Video links** (save_video): once the video is cut, set up the description line, pinned comment, tracked links and a QR code for each moment they mention the scorecard.

## Keys and safety
- API keys (their email tool, Vercel) go into Vercel environment variables (`vercel env add NAME production`) and `.env.local`, never into project files.
- Before any command that installs, deletes or deploys, say in one plain sentence what it does.
- On Windows, write every command for PowerShell.

If a step's tool says the AI drafts are used up, write it together with them and save it with the matching tool.
