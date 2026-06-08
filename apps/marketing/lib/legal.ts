export const LEGAL_UPDATED = "2026-06-08"

export const TERMS = `These Terms of Service ("Terms") govern your use of the PolarHQ website, the PolarHQ open-source software, and any reference instance operated by the PolarHQ project (together, the "Services"). By using the Services you agree to these Terms.

> **Note:** PolarHQ is self-hosted, open-source software. When you run PolarHQ on your own server, *you* are the operator and the data controller. These Terms cover the project's own website and any demo instance we operate; the software itself is governed by its open-source licence.

## 1. The software is open source

PolarHQ is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. Your rights to use, copy, modify, and distribute the software are defined by that licence. Nothing in these Terms limits the rights the AGPL grants you, and in any conflict between these Terms and the AGPL with respect to the software, the AGPL controls.

## 2. Self-hosting and your responsibilities

When you deploy PolarHQ yourself, you are solely responsible for:

- The server, storage, networking, and backups on which you run it.
- Securing your deployment, including keys, credentials, and recovery codes.
- Complying with all laws that apply to you and your users, including data-protection and privacy law.
- The conduct of any users you grant access to your instance.

The PolarHQ project provides the software "as a tool" and does not operate, monitor, or control instances you run.

## 3. Acceptable use

You agree not to use the Services to:

- Break the law or infringe anyone's rights, including intellectual-property rights.
- Store or distribute content you have no right to store or distribute.
- Attempt to gain unauthorised access to any system, or disrupt the integrity or performance of the Services.
- Misrepresent your affiliation with the PolarHQ project.

On any instance you do not operate, you must also follow that operator's rules.

## 4. Accounts and security

If an instance requires an account, you are responsible for safeguarding your credentials and your encryption keys.

> Because PolarHQ is end-to-end encrypted, **a lost password may mean permanently lost data.** Keep your recovery code somewhere safe. Neither the project nor any operator can recover encrypted data without your keys.

## 5. Intellectual property

The PolarHQ name, logo, and brand assets belong to the PolarHQ project. The AGPL licenses the *code*; it does not grant rights to the trademarks. You may not use the PolarHQ name or logo in a way that implies endorsement without permission.

Content you create or upload remains yours. You grant the operator of your chosen instance only the limited, technical rights needed to store and serve that content back to you.

## 6. No warranty

THE SERVICES AND SOFTWARE ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. PolarHQ is alpha software under active development and may contain defects.

## 7. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE POLARHQ PROJECT AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES OR SOFTWARE.

## 8. Changes to these Terms

We may update these Terms from time to time. Material changes will be reflected by the "last updated" date at the top of this page. Continued use of the Services after a change means you accept the revised Terms.

## 9. Contact

Questions about these Terms? Reach the project through the repository or the contact details published on the website.

---

*This document is a template provided for a self-hosted, open-source project and is not legal advice. If you operate a PolarHQ instance for others, consult a lawyer to produce terms that fit your jurisdiction and circumstances.*`

export const PRIVACY = `Your privacy is the entire point of PolarHQ. This policy explains what the software does and does not do with your data, and how the project handles information on its own website. It is written to be read, not to hide behind.

> **The short version:** PolarHQ is end-to-end encrypted and self-hosted. On a properly configured instance, the server stores only ciphertext — it cannot read your photos, files, or documents, and neither can the project.

## 1. Who is responsible for your data

PolarHQ is software you run yourself. When you host it, **you are the data controller** for the content stored on your instance. The PolarHQ project does not operate your instance, cannot access it, and never receives your content.

This policy covers two things:

1. How the **software** handles your data (the same for everyone who runs it).
2. What limited data the **project website** collects.

## 2. What the software encrypts

PolarHQ uses a Proton-style, single-password encryption model built on libsodium. Before anything leaves your device, the following are encrypted with keys derived from your password:

- Photo and video **originals** and every generated **thumbnail**.
- **Filenames** and folder names.
- Document, spreadsheet, and presentation **snapshots**, plus the real-time collaboration frames.
- **EXIF** metadata, captions, and search **embeddings**.

The server only ever stores and relays this ciphertext. Your private key is unwrapped in memory on your device and never transmitted.

## 3. What the server can necessarily see

End-to-end encryption protects *content*, not the existence of activity. To function, a server inevitably processes some metadata:

- Account identifiers and authentication tokens.
- The size and timing of stored objects and requests.
- IP addresses in transient connection logs (as configured by the operator).

Operators can minimise and rotate these. The project's own demo instance keeps such logs short-lived.

## 4. On-device processing

Features that would normally require server access are pushed to your device instead:

- **Semantic photo search** runs a CLIP model locally; embeddings are encrypted and ranked in your browser.
- **EXIF parsing**, **thumbnail decryption**, and document rendering happen client-side.

This is slower than letting a server do it — and that's the trade we make on purpose.

## 5. The project website

The marketing website (the pages you're reading) aims to collect as little as possible:

- We do not sell your data, ever.
- We avoid invasive tracking and third-party advertising cookies.
- If we use privacy-respecting, aggregate analytics, it is to count visits, not to profile you.
- If you join a waitlist or contact us, we use the details you provide only to respond.

## 6. Data retention

On your instance, retention is **your** choice — including trash behaviour and backups. For the project website, we keep contact and waitlist information only as long as needed for the purpose you gave it, then delete it.

## 7. Your rights

Depending on where you live, you may have rights to access, correct, export, or delete personal data. Because your content is end-to-end encrypted and under your control, you can already export or delete most of it directly. For data held by the project website, contact us and we'll help.

## 8. Children

PolarHQ is not directed to children under 13 (or the minimum age in your jurisdiction), and the project does not knowingly collect their data through its website.

## 9. Changes to this policy

We may update this policy as the software evolves. The "last updated" date at the top reflects the latest version. Material changes will be announced on the website.

## 10. Contact

For privacy questions about the project website, reach us through the repository or the contact details published on the site. For data on a specific instance, contact that instance's operator.

---

*This document is a template for a self-hosted, open-source project and is not legal advice. Operators should adapt it to the laws that apply to them.*`
