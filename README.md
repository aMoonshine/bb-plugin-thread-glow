# Thread Glow

Thread Glow highlights a thread in orange when it changes from active to idle. The highlight appears in the BB thread list and, for split views, on the matching pane title. Selecting the thread clears it. Starting work again or an error also clears it.

## Requirements

BB 0.47 or later and BB Plugin SDK 0.6.79 or later. No external account or service is required.

## Behaviour and limitations

- A highlight indicates an observed transition to idle, not proof that a task succeeded. Review the thread for the result.
- The plugin detects transitions while the BB window is open; it does not reconstruct older completed work.
- Highlights are stored in the current client window's local storage. Other windows or devices may have different state.
- The plugin decorates BB's current sidebar and split-pane markup. A future BB update may change that markup and require a plugin update.
- There are no plugin-specific settings yet.

## Development

Install dependencies with `npm install`, run `npm run typecheck`, then build with `bb plugin build`. Install a local development copy with `bb plugin install .`.
