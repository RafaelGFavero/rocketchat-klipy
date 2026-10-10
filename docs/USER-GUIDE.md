# KLIPY GIFs for Rocket.Chat: user guide

Search KLIPY for a GIF and post it to the conversation with `/klipy`.

This is a third-party integration. KLIPY and Rocket.Chat do not produce or endorse it.
KLIPY reviewed and approved the architecture, the attribution and the use of its name
on 5 August 2026 (support ticket CSM-117).

## How it works

1. A user types `/klipy congratulations`.
2. Rocket.Chat shows a gallery of up to 10 GIFs from KLIPY.
3. The user picks one. Only that GIF is posted to the room, with a "Powered by KLIPY"
   attribution. The search term and the other results are never posted.

Inside a thread, the GIF goes to the thread. Pressing Enter without picking posts the
first result. `/klipy` with no term shows a short help message that only the sender
sees. Error messages are also visible only to the sender.

Your Rocket.Chat server calls `https://api.klipy.com` directly with your workspace's
own API key. No server run by the app's author sits in between.

## Pricing and compatible versions

The app is free and open source (MIT). The KLIPY API key is also free; see
[Getting an API key](#getting-an-api-key).

| Rocket.Chat | Status |
|---|---|
| 6.13 | Tested end to end with 0.1.1 on 9 October 2026: install with the declared permissions, settings, search, gallery, posting, threads, read-only room, update from 0.1.0 |
| 7.10 | Tested with 0.1.0 on 4 August 2026: the package installs and the app starts without errors. Activating it as an uploaded private app was refused (`license-prevented`), because Community editions block private apps since 7.0. Searching and posting were not tested on 7.x. Installing from the Marketplace should not be affected, since Marketplace apps are not private apps |
| Earlier than 6.13 | Not supported (the app needs Apps-Engine 1.46 or later) |

## Who can use it

- Administrators install the app and enter the API key.
- Any user who can post in a room can use `/klipy` there.
- Settings are private. Regular users cannot read them, including the API key.

## Getting an API key

Each workspace uses its own key. The app does not ship one.

1. Sign in to the [KLIPY Partner Panel](https://partner.klipy.com/api-keys).
2. Open **API Keys** and click **Add Platform**.
3. Copy the key.

New keys start in test mode, limited to 100 requests per hour. Every GIF sent costs at
least two requests: one or more gallery searches while the user types, plus one when it
is posted. A test key therefore covers fewer than 50 GIFs per hour for the whole
workspace. Request production access in the Partner Panel when you need more.

## Installation

1. Go to **Administration > Marketplace** and search for **KLIPY GIFs**.
2. Click **Install** and accept the permissions listed below.
3. Open the app's **Settings**, paste the API key into **KLIPY API Key** and save.
4. In a Portuguese-speaking workspace, set **Search language** to `pt_BR`. This also sets
   the language of the app's messages for users who haven't chosen one in their profile.
5. In any room, type `/klipy congratulations`.

Network requirements, if you have an egress proxy or firewall:

- the Rocket.Chat server must reach `https://api.klipy.com`;
- users' browsers, desktop and mobile apps must reach `https://static.klipy.com`,
  `https://static1.klipy.com` and `https://static2.klipy.com`, where the GIFs load from.

### Permissions

| Permission | Why |
|---|---|
| `networking` (`api.klipy.com`) | Search KLIPY and confirm the chosen GIF |
| `slashcommand` | Register `/klipy` |
| `message.write` | Post the chosen GIF, and the help and error messages only the sender sees |

The app does not request persistence, user, room, upload or message-read permissions.
It stores nothing.

## Configuration

All settings live in **Administration > Apps > KLIPY GIFs > Settings**.

| Setting | Default | What it does |
|---|---|---|
| KLIPY API Key | empty | Required. Masked in the admin screen, never written to messages or logs |
| Search language | `en_US` | Language KLIPY uses to interpret searches, as `xx` or `xx_YY` (for example `en_US`, `es`). An invalid value falls back to the default. Also the language of the app's messages for users who haven't chosen one in their profile |
| Content filter | Medium | Safety level of the results: Off, Low, Medium or High |
| Number of results | 10 | How many GIFs the gallery offers, from 8 to 10. Rocket.Chat never shows more than 10 |
| Show GIF title | On | Adds KLIPY's title for the GIF to the posted message |
| Link the KLIPY attribution | On | Turns "Powered by KLIPY" into a link to klipy.com. The attribution itself is always shown |

The app's help and error messages follow the user's language preference. Users who never
chose one get the language set in **Search language**. English and Portuguese are
included; any other language falls back to English.

## Uninstalling

Go to **Administration > Apps > KLIPY GIFs** and choose **Uninstall**. The app's settings,
including the API key, are removed with it. GIFs already posted stay in their rooms,
since they are ordinary messages that point to KLIPY's media URLs. The app keeps no
other data, so nothing else is lost.

To stop using the key as well, revoke it in the KLIPY Partner Panel.

## Troubleshooting

| Message or symptom | Likely cause | Fix |
|---|---|---|
| "The KLIPY App is not configured yet." | No API key | Enter the key in the app settings |
| "Could not authenticate with the KLIPY API." | Wrong or revoked key | Paste a new key from the Partner Panel, with no spaces at either end |
| "The temporary KLIPY request limit was reached." | Test key used up its 100 requests per hour | Wait for the next hour or request production access |
| "The GIF service is temporarily unavailable." | Timeout, blocked network, or a KLIPY server error | Check that the server reaches `api.klipy.com` on port 443 |
| "KLIPY returned an unexpected response." | Something, usually a proxy, answered in KLIPY's place | Check what intercepts the server's outbound HTTPS |
| "The GIF could not be posted in this room." | Rocket.Chat refused the message: read-only room (the tested case, where Rocket.Chat also shows its own notice), muted user, or an end-to-end encrypted room | Post somewhere the user can write |
| No gallery while typing | Missing or wrong key, or KLIPY failed | Press Enter to see the error. The gallery stays silent on errors so it doesn't notify on every keystroke |
| The gallery works but the posted GIF doesn't load | Users' devices can't reach `static*.klipy.com` | Allow the media domains for client machines, not only the server |

The app's logs (**Administration > Apps > KLIPY GIFs > Logs**) record the operation, HTTP
status, error category and duration. They never contain the API key or the search term,
so they are safe to attach to a support request.

## Privacy

- The search term goes to KLIPY, which needs it to find GIFs.
- The app stores no conversations, search terms, users or any other data.
- No telemetry, analytics or user identifiers are sent anywhere.
- KLIPY's own privacy policy covers what its API processes.

Full policy: [PRIVACY.md](../PRIVACY.md). Terms: [TERMS.md](../TERMS.md).

## Support

Open an issue at <https://github.com/RafaelGFavero/rocketchat-klipy/issues>. Never paste an
API key into an issue, log or screenshot. Report security problems privately, as
described in [SECURITY.md](../SECURITY.md).
