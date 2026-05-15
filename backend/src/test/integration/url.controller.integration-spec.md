# url.controller — Integration Test Coverage

## POST /urls/shorten

### Happy path
| Case | Auth | Asserts |
|---|---|---|
| Anonymous user creates URL | None | 201; response `{ shortUrl, destinationUrl, newUrl }`; `urls` row with default `created_by`; `url_destinations` row; `url_stats` row with `total_clicks = 0` |
| Authenticated user creates URL | Bearer token | 201; `urls.created_by` matches caller's user id |
| URL without protocol (`example.com`) | None | 201 — `require_protocol: false` in DTO allows it |

### Validation → 400
| Case | Trigger |
|---|---|
| Missing `url` field | `{}` body |
| Empty `url` | `{ url: "" }` |
| Non-URL string | `{ url: "not a url" }` |
| Extra unknown field | `forbidNonWhitelisted` |

---

## GET /urls

### Happy path
| Case | Asserts |
|---|---|
| User with URLs | 200; paginated list, newest first |
| User with no URLs | 200; `{ items: [], total: 0, page: 1, pageSize: 20 }` |
| `?search=` | Filters across `destinationUrl`, `shortUrl`, `comments` (case-insensitive) |
| `?isActive=true` / `false` | Only matching records returned |
| `?isExpired=true` / `false` | Only matching records returned |
| `?page=2&pageSize=5` | Correct slice and `total` |

### Auth → 401
- No token
- Invalid token

### Validation → 400
| Param | Bad value | Rule |
|---|---|---|
| `page` | `0`, `-1` | Min(1) |
| `pageSize` | `0`, `101` | Min(1), Max(100) |
| `pageSize` | `abc` | IsInt |
| `search` | 201-char string | MaxLength(200) |
| `isActive` | `notabool` | IsBoolean (Transform leaves non-`"true"`/`"false"` as-is) |

### Isolation
- User A cannot see User B's URLs

---

## PATCH /urls/:id

### Happy path
| Case | Asserts |
|---|---|
| `{ isActive: false }` | 200; DB row updated |
| `{ isActive: true }` | 200; DB row updated |
| `{ comments: "text" }` | 200; `comments` saved in DB |
| `{ comments: null }` | 200; `comments` cleared in DB |
| `{ destinationUrl: "https://new.com" }` | 200; new `url_destinations` row created; old row still exists; response shows new destination |
| `{ expiresAt: "2030-01-01T00:00:00.000Z" }` | 200; `expires_at` set in DB |
| `{ expiresAt: null }` | 200; `expires_at` cleared |
| Empty body `{}` | 200; URL unchanged |
| Multiple fields at once | 200; all fields updated |

### Auth / authorization
| Case | Status |
|---|---|
| No token | 401 |
| Caller updates another user's URL | 403 |
| Non-existent URL id | 404 |

### Validation → 400
| Field | Bad value | Rule |
|---|---|---|
| `destinationUrl` | `"example.com"` | `require_protocol: true` (unlike POST) |
| `destinationUrl` | `"not-a-url"` | IsUrl |
| `comments` | 101-char string | MaxLength(100) |
| `expiresAt` | `"not-a-date"` | IsISO8601 — plainly invalid |
| `expiresAt` | `"2030-01-01"` | date-only, no time component |
| `expiresAt` | `"2030/01/01T00:00:00.000Z"` | slash separators — not ISO 8601 |
| `expiresAt` | `"01/01/2030"` | US format |
| `expiresAt` | `"2030-01-01T00:00:00"` | no timezone offset — verify empirically; `strict: true` behaviour depends on validator.js version |
| `isActive` | `"yes"` | IsBoolean |
| — | extra unknown field | forbidNonWhitelisted |

### Cache invalidation (observable)
- After updating `destinationUrl`, redirect for that `shortUrl` returns the new destination
- After `isActive: false`, redirect returns `missing-link?reason=disabled`

---

## GET /urls/:shortCode/info

### Happy path
| Case | Asserts |
|---|---|
| Active, non-expired URL | 200; `isActive: true`, `isExpired: false`, `expiresAt: null` |
| URL with future `expiresAt` | `isExpired: false`; `expiresAt` populated |
| URL with past `expiresAt` | `isExpired: true` |
| Inactive URL | 200; `isActive: false` (not a 404) |

### Not found → 404
- Non-existent `shortCode`

---

## GET /urls/:id/destinations

### Happy path
| Case | Asserts |
|---|---|
| Single destination | 200; array with one item |
| Multiple destinations (after URL updates) | All returned, newest first |
| `clickCount` | Matches actual `url_clicks` rows for that destination |

### Auth / authorization
| Case | Status |
|---|---|
| No token | 401 |
| Other user's URL | 403 |
| Non-existent URL id | 404 |

---

## GET /urls/:id/destinations/:destinationId/clicks

### Happy path
| Case | Asserts |
|---|---|
| No clicks yet | 200; `{ items: [], total: 0, page: 1, pageSize: 20 }` |
| With click records | Returned newest first with all click fields |
| Pagination | Correct slice and `total` |

### Auth / authorization
| Case | Status |
|---|---|
| No token | 401 |
| Other user's URL | 403 |
| Non-existent `urlId` | 404 |
| Valid `urlId`, non-existent `destinationId` | 404 |
| `destinationId` belonging to a different URL | 404 — query checks both `id` and `urlId` |

### Validation → 400
- `?page=0`, `?pageSize=101`

---

## GET /:shortUrl (redirect)

### Happy path
| Case | Asserts |
|---|---|
| Active URL | 302 → `destinationUrl` |
| Preview mode (`abc1234+`) | 302 → `FRONTEND_URL/preview/abc1234` |

### Redirect-to-missing-link (all 302)
| Case | Location |
|---|---|
| Non-existent code | `FRONTEND_URL/missing-link?code={code}` |
| `isActive: false` | `FRONTEND_URL/missing-link?code={code}&reason=disabled` |
| Past `expiresAt` | `FRONTEND_URL/missing-link?code={code}&reason=expired` |

### Click recording (DB assertion)
- After successful redirect: `url_clicks` row created; `url_stats.total_clicks` incremented by 1
- **Note:** `recordClick` is fire-and-forget — query DB after the request resolves, not before
