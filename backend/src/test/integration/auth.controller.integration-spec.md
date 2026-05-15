# auth.controller — Integration Test Coverage

## POST /auth/register

### Happy path
| Case | Asserts |
|---|---|
| Email + password only | 201; response `{ accessToken, refreshToken }`; `users` row created; `user_auth_providers` row with `provider = 'local'`; `user_refresh_tokens` row created |
| Email + password + `fullName` | 201; `users.full_name` persisted |
| DB state — `users` | `last_login_at` ≈ now; `last_login_provider = 'local'` |
| DB state — `user_auth_providers` | `provider = 'local'`; `provider_user_id = null`; `secret` is bcrypt hash of password |
| DB state — `user_refresh_tokens` | `token_hash = SHA-256(refreshToken)`; `is_revoked = false`; `device_info` = request User-Agent; `ip_address` present; `expires_at` > now |

### Conflict → 409
| Case | Message fragment |
|---|---|
| Email already registered | `"Account already exists"` |

### Validation → 400
| Field | Bad value | Rule |
|---|---|---|
| `email` | missing | required |
| `email` | `"not-an-email"` | IsEmail |
| `email` | 255-char string | MaxLength(254) |
| `password` | missing | required |
| `password` | `"short"` (7 chars) | MinLength(8) |
| `password` | 73-char string | MaxLength(72) |
| `fullName` | `""` | MinLength(1) |
| `fullName` | 101-char string | MaxLength(100) |
| — | unknown field | forbidNonWhitelisted |

---

## POST /auth/login

### Happy path
| Case | Asserts |
|---|---|
| Correct email + password | 200; response `{ accessToken, refreshToken }` |
| DB state — `user_refresh_tokens` | New row created with `is_revoked = false` |
| DB state — `users` | `last_login_at` updated; `last_login_provider = 'local'` |

### Auth → 401
| Case | Trigger |
|---|---|
| Wrong password | Bcrypt mismatch |
| Non-existent email | `validateLocalUser` returns `null` |
| Google-only account | User exists but has no `'local'` `user_auth_providers` row; `provider.secret` is `null` |

### Validation → 400
| Field | Bad value | Rule |
|---|---|---|
| `email` | missing | required |
| `email` | `"not-an-email"` | IsEmail |
| `email` | 255-char string | MaxLength(254) |
| `password` | missing | required |
| `password` | `""` | MinLength(1) |
| `password` | 73-char string | MaxLength(72) |
| — | unknown field | forbidNonWhitelisted |

---

## POST /auth/refresh

### Happy path
| Case | Asserts |
|---|---|
| Valid, non-expired token | 200; response `{ accessToken, refreshToken }` with new values |
| DB state — old token | `is_revoked = true`; `revoked_at` set |
| DB state — new token | New `user_refresh_tokens` row; `is_revoked = false`; `token_hash = SHA-256(newRefreshToken)` |
| Device info propagated | New token row captures request's User-Agent and IP address |

### Token reuse detection
| Case | Expected | DB side-effect |
|---|---|---|
| Reuse within 10 s of revocation (grace period) | 401 `"Invalid session"` | No additional revocations |
| Reuse more than 10 s after revocation | 401 `"Token already used"` | All remaining active sessions for that user revoked |

> **Setup note:** to simulate the outside-grace case, manually set `revoked_at` to `now - 11s` in the DB before sending the second refresh.

### Auth → 401
| Case | Message |
|---|---|
| Token not in DB | `"Invalid session"` |
| Token revoked (within grace) | `"Invalid session"` |
| Token expired (`expires_at` < now) | `"Session expired"` |

### Validation → 400
| Field | Bad value | Rule |
|---|---|---|
| `refreshToken` | missing | required |
| `refreshToken` | `"not-a-uuid"` | IsUUID(4) |
| `refreshToken` | UUID v1 string | IsUUID(4) |
| — | unknown field | forbidNonWhitelisted |

---

## GET /auth/me

### Happy path
| Case | Asserts |
|---|---|
| Valid Bearer token | 200; response `{ userId, email }` |
| Token issued for user with `fullName` | 200; response includes `fullName` |

### Auth → 401
| Case | Trigger |
|---|---|
| No `Authorization` header | missing token |
| Malformed token | `"Bearer garbage"` |
| Expired JWT | Sign a token with `expiresIn: 0` in test setup |

---

## GET /auth/google · GET /auth/google/callback

Google OAuth endpoints are not exercisable in integration tests without a live Google account and a browser-driven redirect flow. Cover the guard-level cases only.

### GoogleOAuthEnabledGuard → 501
| Case | Trigger |
|---|---|
| `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set in env | Both `GET /auth/google` and `GET /auth/google/callback` |

### OAuth flow (not covered by integration tests)
Delegate to unit tests on `GoogleStrategy.validate()` and `AuthService.findOrCreateGoogleUser()`:
- New Google user (no matching `provider_user_id`) → creates `users` row + `user_auth_providers` row
- Returning Google user (matching `provider_user_id`) → reuses existing `users` row
- Google email already linked to a local account → attaches google provider to existing user; does **not** create a second `users` row
- `last_login_at` / `last_login_provider = 'google'` updated on every OAuth login
