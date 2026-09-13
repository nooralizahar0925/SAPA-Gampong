# Google Play Data Safety - Gampong Blang Digital

Use this worksheet when completing **Policy > App content > Data safety** in Play Console.
It reflects the production app as reviewed on 2026-09-13. Recheck it whenever SDKs or data flows change.

## General Answers

- Does the app collect or share required user data types? **Yes**
- Is all user data encrypted in transit? **Yes**, production API and public files use HTTPS.
- Can users request deletion? **Yes**
- Deletion request URL: `https://gampongblangdigital.com/privacy-policy`
- Privacy policy URL: `https://gampongblangdigital.com/privacy-policy`
- Does the app contain ads? **No**

## Data Types To Declare As Collected

| Play category | Data handled by the app | Purpose | Required? |
| --- | --- | --- | --- |
| Personal info - Name | Applicant or reporter name | App functionality | Required for the submitted service |
| Personal info - Email address | OTP verification, history, replies | Authentication, app functionality, communications | Required for personal history and submissions |
| Personal info - Phone number | Letter request or report contact | App functionality, communications | Optional where the form permits |
| Personal info - Address | Letter form and subject details | App functionality | Required for relevant letter types |
| Personal info - User IDs / Other info | NIK and other civil-administration fields | App functionality | Required for relevant letter types |
| Location - Precise location | GPS coordinates selected for prayer times | App functionality | Optional |
| Photos | User-selected image attachments | App functionality | Optional or required by a selected service |
| Files and docs | Identity and supporting documents | App functionality | Optional or required by a selected service |
| App activity - Other user-generated content | Reports, request purpose, and form responses | App functionality | Required when submitting that service |
| Device or other IDs | Firebase messaging token and platform | App functionality, communications | Optional; used when notifications are enabled |

Collection is user-facing and tied to service delivery. Data is not used for advertising or profiling.

## Sharing

The app does not sell personal data. Review Play's service-provider exception before answering the global
"shared" question. The following processors receive limited data to provide app functionality:

- Firebase Cloud Messaging: device messaging token and notification delivery data.
- Configured Gmail service: recipient email and service/verification message content.
- AlAdhan prayer-time service: GPS coordinates when the user explicitly selects location-based prayer times.
- Production hosting infrastructure: submitted service data and files.

If any provider uses data for its own purposes outside service-provider processing, update the relevant
data type to **shared** in Play Console and revise the privacy policy.

## Security And Deletion

- Production traffic uses HTTPS.
- Administration requires authenticated role-based access.
- User-facing verification pages mask names and NIK values.
- Residents request access, correction, or deletion through `sapagampong@gmail.com`.
- Some records may be retained for government archives, service completion, security, or legal duties.
- The mobile Settings screen links directly to the public privacy and deletion instructions.

## Final Manual Checks

- Verify Gmail test email succeeds in the production dashboard.
- Verify Firebase production push notification succeeds on a release-signed test device.
- Confirm Play Console's exact category labels; Google can rename or reorganize form choices.
- Review all third-party SDK disclosures immediately before submission.
- Have the final privacy policy reviewed by the responsible village official or legal adviser.
