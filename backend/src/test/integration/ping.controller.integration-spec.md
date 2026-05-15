# ping.controller — Integration Test Coverage

## GET /ping

### Happy path
| Case | Asserts |
|---|---|
| Unauthenticated request | 200; response body `{ message: "pong!" }` |

### Notes
- No authentication required; `JwtAuthGuard` is **not** applied to this route.
- The global `ThrottlerGuard` is mocked in the test app (`createTestApp`), so rate-limit behaviour is not observable here.
