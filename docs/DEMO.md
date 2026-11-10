# Three-minute demo

## Prepare

- Run `npm run build` then `npm start` on the laptop.
- Connect phones and display to the same Wi-Fi.
- Open `/display` using the laptop LAN IP and test its QR.
- Sign into `/admin` with `ADMIN_PASSWORD` from `.env.local`.
- Optionally load 24 demo leaves; they are labelled and can be cleared separately.
- For AI, set the OpenAI key and restart. Check the console counters after a test; configured credentials do not guarantee provider access.

## Present

1. Show the shared tree: every approved leaf begins with a visitor's hope.
2. Scan the stable QR and choose Education & opportunity.
3. Enter: “I hope Bhutanese students can learn new skills and find meaningful work.” Accept anonymous publication.
4. Show the leaf and recommended chamber on the phone; watch its arrival on the display.
5. Submit from several phones simultaneously. All approved leaves persist with distinct identities.
6. Open the keepsake and download its SVG. Follow the chamber guide.
7. Refresh the display to prove persistence; disconnect/reconnect to show recovery.
8. Hide a leaf from the staff console. Its keepsake returns 404 and connected displays remove it. Restore it if desired.
9. Show reflection and theme counts as participating visitors' hopes, never as a representative survey.

## Questions

- **Database?** Local SQLite in `data/living-tree.sqlite`, with WAL and transactions.
- **Duplicates?** Unique UUID per submission, fingerprint checks and database enforcement.
- **Internet failure?** Curated offline messages remain available over local Wi-Fi. Display-host disconnection keeps cached approved data until reconnecting.
- **AI role?** OpenAI moderates, classifies and rewrites aspirations with validated output, and reflects on theme counts. Offline output is explicitly labelled.
- **Public information?** Approved leaf, theme, timestamp, chamber and keepsake. Original words are private, redacted and encrypted for authenticated staff review after form consent.
- **Official plans?** These are visitors' hopes. Chamber pathways are project interpretations.

## Demonstrate the new tree

In the staff console open **Tree & display**, choose a species/palette and inspect the preview. Save to update the reception screen. Rotate between portrait and landscape; the camera reframes and the QR stays clear. Choose low quality or illustration for an older browser.

Open **Visitor messages** to compare a hope with its public interpretation and moderation outcome. Search for a message, hide its leaf, and demonstrate deleting private words with the confirmation control. Refresh a phone mid-draft and after success to show recovery.
