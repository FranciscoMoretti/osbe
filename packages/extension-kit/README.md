# @osbe/extension-kit

Small, typed runtime adapters shared by OSBE browser extensions.

## Messaging

`@osbe/extension-kit/messaging` standardizes success/error envelopes,
promise-based requests, response unwrapping, and asynchronous Chrome message
listeners.

## Storage

`@osbe/extension-kit/storage` creates typed stored state over Chrome local
storage, localStorage, or an in-memory test adapter. It also handles an
invalidated extension context without crashing the UI.

## Tabs and scripting

`@osbe/extension-kit/tabs` owns active-tab lookup, script execution, options
page opening, and user-facing Chrome API error messages.

Keep helpers here browser-oriented and product-agnostic. Domain models and
product behavior stay inside their extension.
