# Share query execution and retain native lifecycle ownership

**Status:** Accepted. **Implementation authorized:** 2026-11-09, following the 2026-11-06 design.

Core `executeQueryRequest` shares request/native signal precedence, one transport invocation and same-object HTTP error-envelope rejection. Bindings own request/page mapping; native libraries own providers, keys, cache, observers, reactivity and lifecycle. Plain `initClient` continues returning response envelopes.

Repeated wrapper execution policy creates maintenance work. A universal query/reactivity adapter would add another owned API and compatibility layer. Retiring Vue/Solid in favor of plain transport would move cancellation and native-composition responsibilities onto users without demonstrated replacement coverage. Shared execution through existing bindings establishes a smaller boundary with real consumers.

Native-composition APIs and wrapper retirements require separate designs and evidence. They were not delivered by the extraction. The original Vue4 proof was an extraction checkpoint; [ADR 0006](0006-query-v5-baseline.md) subsequently changes the native-major baseline.

Follow-ups recorded 2026-11-10: plain clients and query execution share [response validation](0008-client-response-validation.md) and [per-request header resolution](0009-request-scoped-headers.md) in the core request path. These refine request execution without transferring native cache, reactivity or lifecycle ownership. Passing a signal to header callbacks does not automatically cancel arbitrary authentication work.

Sources: [design and alternatives](../plans/2026-11-06-client-maintenance-design.md), [execution record](../plans/2026-11-06-common-query-execution.md). [Roadmap](../roadmap.md) records delivery.
