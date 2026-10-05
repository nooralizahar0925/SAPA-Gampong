# Google Play Data Safety - Gampong Blang Digital

Use this worksheet when completing **Policy > App content > Data safety** in Play Console.
It reflects the production app as reviewed on 2026-10-05. Recheck it whenever SDKs or data flows change.

## General Answers

- Does the app collect or share required user data types? **Yes**
- Is all user data encrypted in transit? **Yes**, production API and public files use HTTPS.
- Can users request deletion? **Yes**
- Deletion request URL: `https://gampongblangdigital.com/privacy-policy#hapus-akun`
- Privacy policy URL: `https://gampongblangdigital.com/privacy-policy`
- Does the app contain ads? **No**

## Data Types To Declare As Collected

| Play category | Data handled by the app | Purpose | Required? |
| --- | --- | --- | --- |
| Personal info - Name | Applicant or reporter name | App functionality | Required for the submitted service |
| Personal info - Email address | OTP verification, history, replies | Authentication, app functionality, communications | Required for personal history and submissions |
| Personal info - Phone number | Letter request or report contact | App functionality, communications | Optional where the form permits |
| Personal info - Address | Letter form and subject details | App functionality | Required for relevant letter types |
| Personal info - User IDs | NIK and other identity numbers | App functionality | Required for relevant letter types |
| Personal info - Political or religious beliefs | Religion on civil-administration letter forms | App functionality | Required for relevant letter types |
| Personal info - Other info | Place/date of birth, gender, occupation, and other civil fields | App functionality | Required for relevant letter types |
| Location - Approximate and precise location | GPS coordinates selected for prayer times; approximate location may be provided by Android | App functionality | Optional |
| Photos | User-selected image attachments | App functionality | Optional or required by a selected service |
| Files and docs | Identity and supporting documents | App functionality | Optional or required by a selected service |
| App activity - Other user-generated content | Reports, request purpose, and form responses | App functionality | Required when submitting that service |
| Device or other IDs | Firebase messaging token and platform | App functionality, developer communications | Required; token registration runs at startup even if notification delivery is disabled |

Collection is user-facing and tied to service delivery. Data is not used for advertising or profiling.

## Sharing

The app does not sell personal data. Review Play's service-provider exception before answering the global
"shared" question. The following processors receive limited data to provide app functionality:

- Firebase Cloud Messaging: device messaging token and notification delivery data.
- Configured Gmail service: recipient email and service/verification message content.
- AlAdhan prayer-time service: GPS coordinates when the user explicitly selects location-based prayer times.
- Production hosting infrastructure: submitted service data and files.

Declare approximate and precise location as **collected and shared** for the optional AlAdhan
GPS prayer-time lookup. A service-provider exemption has not been established for this external
service, so do not assume that exemption. Other listed processors are used for service delivery.
Recheck these answers if a provider uses data for its own purposes.

For Play's app-wide optional/required question, all types except device IDs are optional: residents can browse
public information without signing in, submitting a service request, enabling notifications, or
using GPS. Turning off notification delivery does not stop Firebase token registration in the current
build, so device IDs must not be declared optional. Individual service forms may still require fields
as described above. Service submissions
are stored, not processed ephemerally; do not claim ephemeral processing for the external location
provider without evidence of its retention behavior.

## Security And Deletion

- Production traffic uses HTTPS.
- Administration requires authenticated role-based access.
- User-facing verification pages mask names and NIK values.
- Residents request account deletion, data deletion, access, or correction through `sapagampong@gmail.com`; the public privacy page documents the steps and possible legal retention.
- Some records may be retained for government archives, service completion, security, or legal duties.
- The mobile Settings screen links directly to the public privacy and deletion instructions.

## Final Manual Checks

- Verify Gmail test email succeeds in the production dashboard.
- Verify Firebase production push notification succeeds on a release-signed test device.
- Confirm Play Console's exact category labels; Google can rename or reorganize form choices.
- Review all third-party SDK disclosures immediately before submission.
- Have the final privacy policy reviewed by the responsible village official or legal adviser.
