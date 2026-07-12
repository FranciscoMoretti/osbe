# Reliable site blocking in Chromium extensions

Research date: 2026-07-11

## Executive finding

For a user-entered top-level URL such as `https://x.com/home`, a correctly installed Declarative Net Request (DNR) `main_frame` redirect should run before the network request. Chrome explicitly recommends a domain-anchored filter such as `||google.com/`, which matches every path and subdomain, and says DNR block/redirect rules are evaluated before the request is made ([Chrome DNR documentation](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#url-filter-syntax)). Therefore, a page that remains usable until hard refresh is evidence that the navigation was not handled by the expected DNR rule; it is not evidence that `/home` fails domain matching.

Established open-source blockers compensate for missed, same-document, already-open, or restored-page cases by checking the URL through more than one browser surface. The most robust pattern found is:

1. DNR redirect on `main_frame` as the primary, pre-request enforcement layer.
2. `webNavigation`/`tabs` listeners that redirect the tab when its current URL is blocked.
3. An early content-script fallback for a document that is already alive or is served/restored without the expected fresh top-level interception.
4. Re-evaluation of already-open tabs immediately after block rules change.

No individual Chrome API event is a universal navigation oracle. Chrome notes that History API changes have their own `onHistoryStateUpdated` event, Back/Forward Cache restorations do not fire `onDOMContentLoaded`, and there is no defined ordering between `webNavigation` and `webRequest` events ([Chrome webNavigation documentation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation#event-order)).

## Primary-source implementations

### 1. Block Site by Ray Lothian: DNR plus content-script and tab fallbacks

This is the closest reference architecture for OSBE because its current Chromium version is Manifest V3 and uses DNR.

- It builds dynamic redirect rules for `main_frame` and `sub_frame`, validates regex support, and replaces the old and new rule sets in one `updateDynamicRules` call ([rule construction and atomic update](https://github.com/ray-lothian/Block-Site/blob/900bd730ece894d9a8a4b3d5b3a4350ff6793624/v3/blocker.js#L47-L185)). Chrome documents that a single `updateDynamicRules` call is atomic and that dynamic rules persist across browser sessions and extension upgrades ([Chrome `updateDynamicRules`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#method-updateDynamicRules)).
- After changing the DNR rules, it queries existing HTTP(S) tabs and reloads those whose URLs now match, so adding/enabling a block applies to pages that were already open ([existing-tab enforcement](https://github.com/ray-lothian/Block-Site/blob/900bd730ece894d9a8a4b3d5b3a4350ff6793624/v3/blocker.js#L235-L285)).
- Its manifest installs an all-URL content script at `document_start` ([manifest](https://github.com/ray-lothian/Block-Site/blob/900bd730ece894d9a8a4b3d5b3a4350ff6793624/v3/manifest.json#L41-L45)). Chrome defines `document_start` as after extension CSS but before other DOM or page scripts run ([Chrome content-script timing](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#run_time)).
- The content script revalidates the current `location.href` when a page has service-worker registrations, then asks the background worker to block it when the URL matches ([content-script validation](https://github.com/ray-lothian/Block-Site/blob/900bd730ece894d9a8a4b3d5b3a4350ff6793624/v3/data/inject/page-blocker.js#L1-L69)). This is a deliberately narrow fallback rather than the primary path.
- It listens to `tabs.onUpdated` URL changes and tells the content script to revalidate `location.href`, explicitly covering History API `pushState` navigations ([tab/content-script bridge](https://github.com/ray-lothian/Block-Site/blob/900bd730ece894d9a8a4b3d5b3a4350ff6793624/v3/blocker.js#L342-L349), [content-side recheck](https://github.com/ray-lothian/Block-Site/blob/900bd730ece894d9a8a4b3d5b3a4350ff6793624/v3/data/inject/page-blocker.js#L79-L85)).

Tradeoffs: this design needs broad host access and a content script on every page. It also has two matching implementations—DNR rules and JavaScript regex checks—which can drift unless both are generated from one canonical matcher. Its fallback may permit a brief render before tab redirection, but that is preferable when strict enforcement matters more than zero visual flash.

### 2. LeechBlock NG: multiple navigation checkpoints and periodic reconciliation

LeechBlock NG's current Chromium source is also Manifest V3, but it redirects tabs from extension logic instead of using DNR.

- It handles top-frame `webNavigation.onBeforeNavigate`, evaluates the URL, and redirects a blocked tab with `tabs.update` ([pre-navigation check](https://github.com/proginosko/LeechBlockNG-chrome/blob/d8afd5870eeca860a94b6042ef6f6d7227b7fd03/background.js#L1905-L1923), [redirect](https://github.com/proginosko/LeechBlockNG-chrome/blob/d8afd5870eeca860a94b6042ef6f6d7227b7fd03/background.js#L724-L741)).
- It checks again from `tabs.onUpdated` when loading completes ([completed-load check](https://github.com/proginosko/LeechBlockNG-chrome/blob/d8afd5870eeca860a94b6042ef6f6d7227b7fd03/background.js#L1828-L1856)).
- It periodically queries active or all tabs and rechecks loaded documents, providing eventual correction if an event was missed ([periodic reconciliation](https://github.com/proginosko/LeechBlockNG-chrome/blob/d8afd5870eeca860a94b6042ef6f6d7227b7fd03/background.js#L392-L430), [ticker invocation](https://github.com/proginosko/LeechBlockNG-chrome/blob/d8afd5870eeca860a94b6042ef6f6d7227b7fd03/background.js#L1932-L1941)).
- A `document_start` content script reports its actual `document.URL` to the background process ([manifest](https://github.com/proginosko/LeechBlockNG-chrome/blob/d8afd5870eeca860a94b6042ef6f6d7227b7fd03/manifest.json#L48-L55), [loaded message](https://github.com/proginosko/LeechBlockNG-chrome/blob/d8afd5870eeca860a94b6042ef6f6d7227b7fd03/content.js#L19-L27)).

Tradeoffs: direct `tabs.update` checks can react after some content is visible, and periodic scanning adds background work. The advantage is defense in depth: pre-navigation, post-load, content-observed URL, and reconciliation all converge on the same blocking decision.

### 3. Penge Block Site: simple dual event enforcement

Penge's Block Site is a smaller Manifest V3 example that relies on two event sources:

- `webNavigation.onBeforeNavigate` handles top-frame HTTP(S) navigation.
- `tabs.onUpdated` handles URL changes and invokes the same block function ([both listeners](https://github.com/penge/block-site/blob/464aaa5d317dfe6a34a66f6df184c0e21db8b418/src/background.ts#L42-L66)).
- The shared block function either removes the tab or navigates it to an extension blocked page with `tabs.update` ([block action](https://github.com/penge/block-site/blob/464aaa5d317dfe6a34a66f6df184c0e21db8b418/src/helpers/block-site.ts#L12-L60)).
- Its manifest requests `tabs` and `webNavigation`, but has no all-pages content script and no DNR permission ([manifest](https://github.com/penge/block-site/blob/464aaa5d317dfe6a34a66f6df184c0e21db8b418/public/manifest-chrome.json#L16-L28)).

Tradeoffs: it is easy to reason about and avoids a universal content script, but it is reactive rather than browser-native request interception. A brief page render is possible, and no periodic/content-level fallback exists if both navigation signals are missed.

### 4. Simple Toggle Sites: legacy synchronous `webRequest` cancellation

This older blocker cancels matching requests directly from `webRequest.onBeforeRequest` using the blocking listener option ([request cancellation](https://github.com/aschmelyun/simple-toggle-sites/blob/22f56c28a06309693245244b30806176ba5c906f/assets/js/background.js#L21-L45)). Its manifest is explicitly Manifest V2 and requests `webRequestBlocking` ([manifest](https://github.com/aschmelyun/simple-toggle-sites/blob/22f56c28a06309693245244b30806176ba5c906f/dist/manifest.json#L1-L24)).

Tradeoffs: synchronous request cancellation is strong for requests it sees, but this is a legacy Chromium architecture and should not be copied into an MV3 Chrome extension. It also uses substring hostname matching, which can overmatch unrelated domains.

## Recommendation for OSBE Site Blocker

Use a layered MV3 design, borrowing the primary mechanism from Ray Lothian's Block Site and the navigation redundancy from LeechBlock/Penge:

1. **Keep DNR as the primary layer.** Use one dynamic redirect rule per blocking domain, with `resourceTypes: ["main_frame"]` and an exact domain boundary. Prefer Chrome's documented `||domain/` form for a normalized domain, or a tested anchored regex. Update the complete OSBE rule range atomically in one call.
2. **Add a direct top-frame navigation fallback.** Request `webNavigation` and run the same canonical `isUrlBlocked(url, state)` decision from `onBeforeNavigate`, `onCommitted`, and `onHistoryStateUpdated`. If blocked, navigate the tab to the extension blocked page with `tabs.update`. The first event reduces flash; the latter two cover already-committed and same-document History API cases. Chrome documents `onHistoryStateUpdated` specifically for `history.pushState()` and related state changes ([Chrome webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation#event-onHistoryStateUpdated)).
3. **Use `tabs.onUpdated` as a final event-level backstop.** Re-evaluate when `changeInfo.url` is present. This mirrors both Ray's and Penge's approach and also avoids depending on undocumented ordering between navigation/request events.
4. **Immediately enforce changes on existing tabs.** After a successful rule refresh, query HTTP(S) tabs, compare their current URLs with the canonical matcher, and redirect matching tabs. Do not wait for another reload.
5. **Add a minimal `document_start` guard only if event-level testing still reproduces the X failure.** The content script should send the observed top-frame URL to the service worker at startup and on `pageshow`; the service worker remains the authority and performs the redirect. Also use `onHistoryStateUpdated` rather than monkey-patching page History APIs. This adds `<all_urls>` content-script exposure and maintenance cost, so it is best as the third layer, not the first fix.
6. **Generate every enforcement path from one matcher.** DNR filter generation, `webNavigation`/`tabs` checks, content-script messages, diagnostics, and tests must share normalized-domain semantics. Add explicit tests for `x.com`, `x.com/home`, arbitrary status URLs, `www.x.com`, a subdomain, and near-miss hosts such as `notx.com` and `x.com.example`.
7. **Instrument the failure during development.** Use `declarativeNetRequest.testMatchOutcome` for deterministic matcher tests and `onRuleMatchedDebug` in unpacked/development builds to distinguish “rule did not match” from “navigation did not create the expected request.” Chrome exposes these APIs specifically for rule testing and match feedback ([Chrome DNR testing APIs](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#method-testMatchOutcome)).

### Practical rollout

Implement steps 1–4 first. They add strong enforcement without injecting code into every site and should cover typed/pasted navigation, already-open tabs, SPA URL changes, and restored/committed documents. If the exact `x.com/home` reproduction survives those layers, add the narrow `document_start` guard from step 5 and record which fallback fired in diagnostics. That will turn the remaining behavior into observable evidence instead of another matching guess.
